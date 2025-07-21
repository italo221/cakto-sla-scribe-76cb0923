-- CRITICAL SECURITY FIXES - Phase 1 (Corrected)
-- Fix 1: Enable RLS on vulnerable tables and add proper policies

-- Enable RLS on leads table (currently has no RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for leads table
CREATE POLICY "leads_select_admin" ON public.leads
  FOR SELECT USING (is_admin());

CREATE POLICY "leads_insert_admin" ON public.leads  
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "leads_update_admin" ON public.leads
  FOR UPDATE USING (is_admin());

CREATE POLICY "leads_delete_admin" ON public.leads
  FOR DELETE USING (is_admin());

-- Enable RLS on users table (currently has no RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for users table
CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT USING (is_admin());

CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (is_admin());

CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE USING (is_admin());

-- Fix 2: Secure database functions by adding search_path protection
-- This prevents SQL injection attacks through search_path manipulation

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  current_year text;
  sequence_number text;
  ticket_number text;
BEGIN
  -- Pegar o ano atual
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Contar quantos tickets já existem neste ano e adicionar 1
  SELECT LPAD((COUNT(*) + 1)::text, 4, '0') 
  INTO sequence_number
  FROM public.sla_demandas 
  WHERE EXTRACT(YEAR FROM data_criacao) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Formato: TICKET-YYYY-NNNN (ex: TICKET-2025-0001)
  ticket_number := 'TICKET-' || current_year || '-' || sequence_number;
  
  RETURN ticket_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Se ticket_number não foi fornecido, gerar automaticamente
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid 
    AND user_type = 'administrador_master'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_setor_access(setor_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_setores 
    WHERE user_id = user_uuid 
    AND setor_id = setor_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_stats(user_email text)
RETURNS TABLE(email text, has_registration boolean, registration_status text, registration_date timestamp with time zone, kyc_status text, kyc_date timestamp with time zone, total_profit_30_days numeric, profit_count_30_days integer)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    user_email as email,
    CASE 
      WHEN ur.email IS NOT NULL THEN true 
      ELSE false 
    END as has_registration,
    COALESCE(ur.status, 'not_registered') as registration_status,
    ur.registration_date,
    COALESCE(uk.kyc_status, 'not_started') as kyc_status,
    uk.kyc_date,
    COALESCE(SUM(up.profit_amount), 0::DECIMAL(15,2)) as total_profit_30_days,
    COALESCE(COUNT(up.id)::INTEGER, 0) as profit_count_30_days
  FROM 
    (SELECT user_email as email) e
  LEFT JOIN public.user_registrations ur ON ur.email = user_email
  LEFT JOIN public.user_kyc uk ON uk.email = user_email
  LEFT JOIN public.user_profits up ON up.email = user_email 
    AND up.profit_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY 
    user_email, ur.email, ur.status, ur.registration_date, 
    uk.kyc_status, uk.kyc_date;
END;
$$;

-- Fix 3: Remove overly permissive RLS policies
-- Replace policies with 'true' conditions with proper restrictions

-- Remove overly permissive policies on sla_logs
DROP POLICY IF EXISTS "Permitir inserção de logs" ON public.sla_logs;
DROP POLICY IF EXISTS "Permitir leitura de logs" ON public.sla_logs;

-- Add proper RLS policies for sla_logs
CREATE POLICY "sla_logs_select_admin" ON public.sla_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "sla_logs_insert_authenticated" ON public.sla_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Fix 4: Replace existing profile update policy with secure version
-- that prevents users from changing their own user_type

-- Remove the old update policy first
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Create new secure policy that allows updates but blocks user_type changes
-- unless the user is an admin
CREATE POLICY "profiles_update_own_secure" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      -- Either the user_type isn't changing, or the user is an admin
      user_type = (SELECT user_type FROM public.profiles WHERE user_id = auth.uid())
      OR is_admin()
    )
  );