-- Security Fix: Restrict access to sla_demandas table to authorized users only
-- This fixes the vulnerability where internal business operations were exposed to all authenticated users

-- First, fix the user_has_setor_access function to properly check sector access
-- The current function always returns true, which is a major security flaw
CREATE OR REPLACE FUNCTION public.user_has_setor_access(setor_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  -- Check if user is super admin (has access to everything)
  SELECT CASE 
    WHEN public.is_admin(user_uuid) THEN true
    WHEN setor_uuid IS NULL THEN false
    WHEN user_uuid IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 
      FROM public.user_setores us 
      WHERE us.user_id = user_uuid 
        AND us.setor_id = setor_uuid
    )
  END;
$function$;

-- Drop the overly permissive policies that allow any authenticated user to read tickets
DROP POLICY IF EXISTS "sla_demandas_select_consolidated" ON public.sla_demandas;
DROP POLICY IF EXISTS "sla_demandas_insert_consolidated" ON public.sla_demandas;
DROP POLICY IF EXISTS "sla_demandas_update_consolidated" ON public.sla_demandas;

-- Create secure policies that only allow access to users with proper sector permissions

-- SELECT: Only allow users who have access to the ticket's sector or are admins
CREATE POLICY "sla_demandas_select_sector_access" 
ON public.sla_demandas 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR 
    public.user_has_setor_access(setor_id)
  )
);

-- INSERT: Only allow users who can edit and have sector access
CREATE POLICY "sla_demandas_insert_sector_access" 
ON public.sla_demandas 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR 
    (public.can_edit() AND public.user_has_setor_access(setor_id))
  )
);

-- UPDATE: Only allow users who can edit and have sector access
CREATE POLICY "sla_demandas_update_sector_access" 
ON public.sla_demandas 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR 
    (public.can_edit() AND public.user_has_setor_access(setor_id))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR 
    (public.can_edit() AND public.user_has_setor_access(setor_id))
  )
);