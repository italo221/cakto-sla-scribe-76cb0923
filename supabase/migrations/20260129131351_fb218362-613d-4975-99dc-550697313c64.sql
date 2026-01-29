-- Corrigir função generate_recovery_token para usar gen_random_uuid em vez de gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_recovery_token(
  p_target_user_id uuid,
  p_expiration_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz;
  v_token_id uuid;
  v_actor_id uuid;
  v_actor_email text;
  v_target_active boolean;
BEGIN
  -- Verificar se o chamador é super_admin
  v_actor_id := auth.uid();
  
  SELECT email INTO v_actor_email
  FROM public.profiles
  WHERE user_id = v_actor_id;
  
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas super admins podem gerar tokens');
  END IF;
  
  -- Verificar se o usuário alvo está ativo
  SELECT ativo INTO v_target_active
  FROM public.profiles
  WHERE user_id = p_target_user_id;
  
  IF v_target_active IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;
  
  IF NOT v_target_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário está desativado');
  END IF;
  
  -- Invalidar tokens anteriores do mesmo usuário
  UPDATE public.password_recovery_tokens
  SET invalidated_at = now(),
      invalidated_reason = 'Substituído por novo token'
  WHERE user_id = p_target_user_id
    AND used_at IS NULL
    AND invalidated_at IS NULL
    AND expires_at > now();
  
  -- Gerar token usando múltiplos UUIDs concatenados para maior entropia
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  
  -- Hash do token para armazenamento (usando encode/digest se disponível, senão armazena diretamente)
  v_token_hash := encode(sha256(v_token::bytea), 'hex');
  
  -- Calcular expiração
  v_expires_at := now() + (p_expiration_minutes || ' minutes')::interval;
  
  -- Inserir token
  INSERT INTO public.password_recovery_tokens (
    user_id,
    token_hash,
    expires_at,
    created_by
  ) VALUES (
    p_target_user_id,
    v_token_hash,
    v_expires_at,
    v_actor_id
  )
  RETURNING id INTO v_token_id;
  
  -- Registrar auditoria
  INSERT INTO public.password_recovery_audit (
    token_id,
    user_id,
    action,
    actor_id,
    actor_email,
    details
  ) VALUES (
    v_token_id,
    p_target_user_id,
    'token_created',
    v_actor_id,
    v_actor_email,
    jsonb_build_object(
      'expiration_minutes', p_expiration_minutes,
      'expires_at', v_expires_at
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'expires_at', v_expires_at,
    'token_id', v_token_id
  );
END;
$$;

-- Corrigir também a função use_recovery_token
CREATE OR REPLACE FUNCTION public.use_recovery_token(
  p_token text,
  p_new_password text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash text;
  v_token_record record;
  v_user_active boolean;
BEGIN
  -- Verificar rate limit
  IF NOT public.check_recovery_rate_limit(COALESCE(p_ip_address::text, 'unknown'), 'token_use') THEN
    -- Registrar tentativa bloqueada
    INSERT INTO public.password_recovery_audit (
      user_id,
      action,
      ip_address,
      user_agent,
      details
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'attempt_failed',
      p_ip_address,
      p_user_agent,
      jsonb_build_object('reason', 'rate_limit_exceeded')
    );
    
    RETURN jsonb_build_object('success', false, 'error', 'Muitas tentativas. Aguarde alguns minutos.');
  END IF;
  
  -- Hash do token fornecido
  v_token_hash := encode(sha256(p_token::bytea), 'hex');
  
  -- Buscar token
  SELECT t.*, p.ativo as user_active, p.email as user_email
  INTO v_token_record
  FROM public.password_recovery_tokens t
  JOIN public.profiles p ON p.user_id = t.user_id
  WHERE t.token_hash = v_token_hash;
  
  -- Verificar se token existe
  IF v_token_record IS NULL THEN
    PERFORM public.record_recovery_attempt(COALESCE(p_ip_address::text, 'unknown'), 'token_use', false);
    
    INSERT INTO public.password_recovery_audit (
      user_id,
      action,
      ip_address,
      user_agent,
      details
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'attempt_failed',
      p_ip_address,
      p_user_agent,
      jsonb_build_object('reason', 'invalid_token')
    );
    
    RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou expirado');
  END IF;
  
  -- Verificar se já foi usado
  IF v_token_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token já foi utilizado');
  END IF;
  
  -- Verificar se foi invalidado
  IF v_token_record.invalidated_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token foi invalidado');
  END IF;
  
  -- Verificar expiração
  IF v_token_record.expires_at < now() THEN
    INSERT INTO public.password_recovery_audit (
      token_id,
      user_id,
      action,
      ip_address,
      user_agent,
      details
    ) VALUES (
      v_token_record.id,
      v_token_record.user_id,
      'token_expired',
      p_ip_address,
      p_user_agent,
      NULL
    );
    
    RETURN jsonb_build_object('success', false, 'error', 'Token expirado');
  END IF;
  
  -- Verificar se usuário está ativo
  IF NOT v_token_record.user_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conta desativada');
  END IF;
  
  -- Marcar token como usado
  UPDATE public.password_recovery_tokens
  SET used_at = now()
  WHERE id = v_token_record.id;
  
  -- Registrar sucesso
  PERFORM public.record_recovery_attempt(COALESCE(p_ip_address::text, 'unknown'), 'token_use', true);
  
  INSERT INTO public.password_recovery_audit (
    token_id,
    user_id,
    action,
    ip_address,
    user_agent,
    details
  ) VALUES (
    v_token_record.id,
    v_token_record.user_id,
    'token_used',
    p_ip_address,
    p_user_agent,
    NULL
  );
  
  -- Retornar sucesso com user_id para a edge function atualizar a senha
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_token_record.user_id,
    'email', v_token_record.user_email
  );
END;
$$;