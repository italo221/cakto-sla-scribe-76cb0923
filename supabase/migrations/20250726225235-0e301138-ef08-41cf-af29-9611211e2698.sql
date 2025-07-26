-- Corrigir funções restantes que não têm search_path definido
-- Verificar quais funções ainda precisam ser corrigidas

-- 1. Corrigir função add_sla_comment
CREATE OR REPLACE FUNCTION public.add_sla_comment(p_sla_id uuid, p_setor_id uuid, p_comentario text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  comment_id UUID;
  current_user_id UUID;
  autor_nome_final TEXT;
  fallback_user_id UUID;
BEGIN
  -- Pegar o user_id atual
  current_user_id := auth.uid();
  
  -- Se não há usuário logado, usar um admin existente como fallback
  IF current_user_id IS NULL THEN
    -- Buscar um usuário admin existente
    SELECT user_id INTO fallback_user_id
    FROM public.profiles
    WHERE user_type = 'administrador_master'
    LIMIT 1;
    
    current_user_id := COALESCE(fallback_user_id, (SELECT id FROM auth.users LIMIT 1));
  END IF;
  
  -- Buscar nome do autor
  SELECT nome_completo INTO autor_nome_final
  FROM public.profiles
  WHERE user_id = current_user_id;
  
  -- Nome padrão se não encontrar perfil
  autor_nome_final := COALESCE(autor_nome_final, 'Administrador do Sistema');
  
  -- Inserir comentário
  INSERT INTO public.sla_comentarios_internos (
    sla_id, setor_id, autor_id, autor_nome, comentario
  ) VALUES (
    p_sla_id, p_setor_id, current_user_id, autor_nome_final, p_comentario
  ) RETURNING id INTO comment_id;
  
  RETURN comment_id;
END;
$function$;

-- 2. Corrigir função auto_generate_ticket  
CREATE OR REPLACE FUNCTION public.auto_generate_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Se ticket_number não foi fornecido, gerar automaticamente
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Corrigir função get_user_stats
CREATE OR REPLACE FUNCTION public.get_user_stats(user_email text)
RETURNS TABLE(email text, has_registration boolean, registration_status text, registration_date timestamp with time zone, kyc_status text, kyc_date timestamp with time zone, total_profit_30_days numeric, profit_count_30_days integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;