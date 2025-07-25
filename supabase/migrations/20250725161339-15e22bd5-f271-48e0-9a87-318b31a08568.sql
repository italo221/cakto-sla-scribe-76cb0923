-- Corrigir problemas de segurança identificados pelo linter

-- 1. Habilitar RLS em todas as tabelas que não têm
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_kyc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Corrigir funções com search_path mutable
CREATE OR REPLACE FUNCTION public.has_role(_role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = _role
      AND ativo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.has_role('super_admin'::public.user_role);
$$;

CREATE OR REPLACE FUNCTION public.can_edit()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.has_role('super_admin'::public.user_role) OR public.has_role('operador'::public.user_role);
$$;

CREATE OR REPLACE FUNCTION public.user_has_setor_access(setor_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT true; -- Sempre retorna true, todos têm acesso a todos os setores
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_sla_action(p_sla_id uuid, p_acao text, p_setor_origem_id uuid DEFAULT NULL::uuid, p_setor_destino_id uuid DEFAULT NULL::uuid, p_justificativa text DEFAULT NULL::text, p_dados_anteriores jsonb DEFAULT NULL::jsonb, p_dados_novos jsonb DEFAULT NULL::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  log_id UUID;
  user_profile RECORD;
  current_user_id UUID;
BEGIN
  -- Verificar se há usuário logado
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    -- Se não há usuário logado, usar dados genéricos
    INSERT INTO public.sla_action_logs (
      sla_id, acao, autor_id, autor_email,
      setor_origem_id, setor_destino_id, justificativa,
      dados_anteriores, dados_novos
    ) VALUES (
      p_sla_id, p_acao, '00000000-0000-0000-0000-000000000000'::uuid, 'sistema@automatico',
      p_setor_origem_id, p_setor_destino_id, p_justificativa,
      p_dados_anteriores, p_dados_novos
    ) RETURNING id INTO log_id;
  ELSE
    -- Buscar dados do usuário logado
    SELECT email, nome_completo INTO user_profile
    FROM public.profiles
    WHERE user_id = current_user_id;
    
    -- Inserir log com dados do usuário
    INSERT INTO public.sla_action_logs (
      sla_id, acao, autor_id, autor_email,
      setor_origem_id, setor_destino_id, justificativa,
      dados_anteriores, dados_novos
    ) VALUES (
      p_sla_id, p_acao, current_user_id, COALESCE(user_profile.email, 'usuario@desconhecido'),
      p_setor_origem_id, p_setor_destino_id, p_justificativa,
      p_dados_anteriores, p_dados_novos
    ) RETURNING id INTO log_id;
  END IF;
  
  RETURN log_id;
END;
$$;