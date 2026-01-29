-- Tabela para tokens de recuperação de senha
CREATE TABLE public.password_recovery_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  token_hash text NOT NULL, -- Hash do token (nunca armazenar em texto plano)
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone, -- NULL = não usado
  created_by uuid NOT NULL REFERENCES public.profiles(user_id), -- SUPER ADMIN que criou
  ip_address inet, -- IP de quem usou o token
  user_agent text, -- User agent de quem usou
  invalidated_at timestamp with time zone, -- Se foi invalidado manualmente
  invalidated_reason text
);

-- Índices para performance
CREATE INDEX idx_prt_user_id ON public.password_recovery_tokens(user_id);
CREATE INDEX idx_prt_token_hash ON public.password_recovery_tokens(token_hash);
CREATE INDEX idx_prt_expires_at ON public.password_recovery_tokens(expires_at);
CREATE INDEX idx_prt_created_at ON public.password_recovery_tokens(created_at DESC);

-- Tabela para auditoria de recuperação de senha
CREATE TABLE public.password_recovery_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid REFERENCES public.password_recovery_tokens(id),
  user_id uuid NOT NULL, -- Usuário alvo
  action text NOT NULL, -- 'token_created', 'token_used', 'token_expired', 'token_invalidated', 'attempt_failed'
  actor_id uuid, -- Quem executou a ação (SUPER ADMIN ou próprio usuário)
  actor_email text,
  ip_address inet,
  user_agent text,
  details jsonb, -- Detalhes adicionais
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_pra_user_id ON public.password_recovery_audit(user_id);
CREATE INDEX idx_pra_action ON public.password_recovery_audit(action);
CREATE INDEX idx_pra_created_at ON public.password_recovery_audit(created_at DESC);

-- Tabela para rate limiting de tentativas de recuperação
CREATE TABLE public.password_recovery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP ou user_id
  attempt_type text NOT NULL, -- 'token_validation', 'password_change'
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_pra_identifier ON public.password_recovery_attempts(identifier);
CREATE INDEX idx_pra_attempted_at ON public.password_recovery_attempts(attempted_at DESC);

-- Limpar tentativas antigas (> 24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_recovery_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.password_recovery_attempts
  WHERE attempted_at < now() - interval '24 hours';
END;
$$;

-- Função para verificar rate limit
CREATE OR REPLACE FUNCTION public.check_recovery_rate_limit(
  p_identifier text,
  p_attempt_type text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  attempt_count integer;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM public.password_recovery_attempts
  WHERE identifier = p_identifier
    AND attempt_type = p_attempt_type
    AND attempted_at > now() - (p_window_minutes || ' minutes')::interval;
  
  RETURN attempt_count < p_max_attempts;
END;
$$;

-- Função para registrar tentativa
CREATE OR REPLACE FUNCTION public.record_recovery_attempt(
  p_identifier text,
  p_attempt_type text,
  p_success boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.password_recovery_attempts (identifier, attempt_type, success)
  VALUES (p_identifier, p_attempt_type, p_success);
END;
$$;

-- Função para verificar lockout (muitas falhas consecutivas)
CREATE OR REPLACE FUNCTION public.check_account_lockout(
  p_user_id uuid,
  p_max_failures integer DEFAULT 5,
  p_lockout_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_failures integer;
  last_failure timestamp with time zone;
  lockout_until timestamp with time zone;
BEGIN
  -- Contar falhas recentes
  SELECT COUNT(*), MAX(attempted_at)
  INTO recent_failures, last_failure
  FROM public.password_recovery_attempts
  WHERE identifier = p_user_id::text
    AND attempt_type = 'password_change'
    AND success = false
    AND attempted_at > now() - (p_lockout_minutes || ' minutes')::interval;
  
  IF recent_failures >= p_max_failures THEN
    lockout_until := last_failure + (p_lockout_minutes || ' minutes')::interval;
    RETURN jsonb_build_object(
      'locked', true,
      'failures', recent_failures,
      'lockout_until', lockout_until,
      'remaining_minutes', EXTRACT(EPOCH FROM (lockout_until - now())) / 60
    );
  END IF;
  
  RETURN jsonb_build_object(
    'locked', false,
    'failures', recent_failures,
    'remaining_attempts', p_max_failures - recent_failures
  );
END;
$$;

-- RLS para password_recovery_tokens
ALTER TABLE public.password_recovery_tokens ENABLE ROW LEVEL SECURITY;

-- Apenas SUPER ADMINs podem ver e criar tokens
CREATE POLICY "Super admins can manage recovery tokens"
ON public.password_recovery_tokens
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- RLS para password_recovery_audit
ALTER TABLE public.password_recovery_audit ENABLE ROW LEVEL SECURITY;

-- Apenas SUPER ADMINs podem ver auditoria
CREATE POLICY "Super admins can view recovery audit"
ON public.password_recovery_audit
FOR SELECT
USING (is_super_admin());

-- Sistema pode inserir auditoria (via SECURITY DEFINER functions)
CREATE POLICY "System can insert audit logs"
ON public.password_recovery_audit
FOR INSERT
WITH CHECK (true);

-- RLS para password_recovery_attempts (apenas sistema acessa via funções)
ALTER TABLE public.password_recovery_attempts ENABLE ROW LEVEL SECURITY;

-- Não permitir acesso direto - apenas via funções SECURITY DEFINER
CREATE POLICY "No direct access to attempts"
ON public.password_recovery_attempts
FOR ALL
USING (false);

-- Função para gerar token de recuperação (SUPER ADMIN only)
CREATE OR REPLACE FUNCTION public.generate_recovery_token(
  p_target_user_id uuid,
  p_expiration_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  target_profile record;
  actor_profile record;
  raw_token text;
  hashed_token text;
  new_token_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Verificar se é SUPER ADMIN
  IF NOT is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;
  
  -- Verificar se usuário alvo existe e está ativo
  SELECT * INTO target_profile
  FROM public.profiles
  WHERE user_id = p_target_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;
  
  IF NOT target_profile.ativo THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário desativado não pode recuperar senha');
  END IF;
  
  -- Buscar dados do admin
  SELECT * INTO actor_profile
  FROM public.profiles
  WHERE user_id = current_user_id;
  
  -- Invalidar tokens anteriores não usados
  UPDATE public.password_recovery_tokens
  SET invalidated_at = now(),
      invalidated_reason = 'Novo token gerado'
  WHERE user_id = p_target_user_id
    AND used_at IS NULL
    AND invalidated_at IS NULL
    AND expires_at > now();
  
  -- Gerar token aleatório (32 bytes = 64 caracteres hex)
  raw_token := encode(gen_random_bytes(32), 'hex');
  
  -- Hash do token para armazenamento
  hashed_token := encode(sha256(raw_token::bytea), 'hex');
  
  -- Criar novo token
  INSERT INTO public.password_recovery_tokens (
    user_id, token_hash, expires_at, created_by
  ) VALUES (
    p_target_user_id,
    hashed_token,
    now() + (p_expiration_minutes || ' minutes')::interval,
    current_user_id
  ) RETURNING id INTO new_token_id;
  
  -- Registrar auditoria
  INSERT INTO public.password_recovery_audit (
    token_id, user_id, action, actor_id, actor_email, details
  ) VALUES (
    new_token_id,
    p_target_user_id,
    'token_created',
    current_user_id,
    actor_profile.email,
    jsonb_build_object(
      'target_email', target_profile.email,
      'target_name', target_profile.nome_completo,
      'expiration_minutes', p_expiration_minutes
    )
  );
  
  -- Retornar token em texto plano (apenas uma vez)
  RETURN jsonb_build_object(
    'success', true,
    'token', raw_token,
    'expires_at', now() + (p_expiration_minutes || ' minutes')::interval,
    'target_user', jsonb_build_object(
      'id', target_profile.user_id,
      'email', target_profile.email,
      'nome', target_profile.nome_completo
    )
  );
END;
$$;

-- Função para validar e usar token de recuperação
CREATE OR REPLACE FUNCTION public.use_recovery_token(
  p_token text,
  p_new_password text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  hashed_token text;
  token_record record;
  target_profile record;
  rate_limit_ok boolean;
BEGIN
  -- Hash do token fornecido
  hashed_token := encode(sha256(p_token::bytea), 'hex');
  
  -- Verificar rate limit por IP
  IF p_ip_address IS NOT NULL THEN
    SELECT public.check_recovery_rate_limit(p_ip_address::text, 'token_validation', 10, 15) INTO rate_limit_ok;
    IF NOT rate_limit_ok THEN
      -- Registrar tentativa
      PERFORM public.record_recovery_attempt(p_ip_address::text, 'token_validation', false);
      RETURN jsonb_build_object('success', false, 'error', 'Muitas tentativas. Aguarde alguns minutos.');
    END IF;
  END IF;
  
  -- Buscar token (mensagem genérica para evitar enumeração)
  SELECT * INTO token_record
  FROM public.password_recovery_tokens
  WHERE token_hash = hashed_token;
  
  IF NOT FOUND THEN
    -- Registrar tentativa falha
    IF p_ip_address IS NOT NULL THEN
      PERFORM public.record_recovery_attempt(p_ip_address::text, 'token_validation', false);
    END IF;
    
    -- Auditoria de falha (sem token_id pois não existe)
    INSERT INTO public.password_recovery_audit (
      user_id, action, ip_address, user_agent, details
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'attempt_failed',
      p_ip_address,
      p_user_agent,
      jsonb_build_object('reason', 'Token inválido ou não encontrado')
    );
    
    RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou expirado');
  END IF;
  
  -- Verificar se já foi usado
  IF token_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou expirado');
  END IF;
  
  -- Verificar se foi invalidado
  IF token_record.invalidated_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou expirado');
  END IF;
  
  -- Verificar expiração
  IF token_record.expires_at < now() THEN
    -- Auditoria de expiração
    INSERT INTO public.password_recovery_audit (
      token_id, user_id, action, ip_address, user_agent, details
    ) VALUES (
      token_record.id,
      token_record.user_id,
      'token_expired',
      p_ip_address,
      p_user_agent,
      jsonb_build_object('expired_at', token_record.expires_at)
    );
    
    RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou expirado');
  END IF;
  
  -- Verificar se usuário ainda está ativo
  SELECT * INTO target_profile
  FROM public.profiles
  WHERE user_id = token_record.user_id;
  
  IF NOT target_profile.ativo THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conta desativada. Contate o administrador.');
  END IF;
  
  -- Validar nova senha
  IF length(p_new_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'A senha deve ter pelo menos 6 caracteres');
  END IF;
  
  -- Marcar token como usado
  UPDATE public.password_recovery_tokens
  SET used_at = now(),
      ip_address = p_ip_address,
      user_agent = p_user_agent
  WHERE id = token_record.id;
  
  -- Registrar tentativa bem-sucedida
  IF p_ip_address IS NOT NULL THEN
    PERFORM public.record_recovery_attempt(p_ip_address::text, 'token_validation', true);
  END IF;
  
  -- Auditoria de uso
  INSERT INTO public.password_recovery_audit (
    token_id, user_id, action, ip_address, user_agent, details
  ) VALUES (
    token_record.id,
    token_record.user_id,
    'token_used',
    p_ip_address,
    p_user_agent,
    jsonb_build_object(
      'user_email', target_profile.email,
      'created_by', token_record.created_by
    )
  );
  
  -- Retornar sucesso com user_id para atualizar senha via auth.admin
  RETURN jsonb_build_object(
    'success', true,
    'user_id', token_record.user_id,
    'email', target_profile.email
  );
END;
$$;