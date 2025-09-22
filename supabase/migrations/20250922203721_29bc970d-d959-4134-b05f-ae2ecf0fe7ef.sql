-- Primeiro, vamos corrigir a função log_sla_action para lidar melhor com usuários inexistentes
CREATE OR REPLACE FUNCTION public.log_sla_action(
  p_sla_id uuid, 
  p_acao text, 
  p_setor_origem_id uuid DEFAULT NULL::uuid, 
  p_setor_destino_id uuid DEFAULT NULL::uuid, 
  p_justificativa text DEFAULT NULL::text, 
  p_dados_anteriores jsonb DEFAULT NULL::jsonb, 
  p_dados_novos jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  log_id UUID;
  user_profile RECORD;
  current_user_id UUID;
  safe_setor_origem UUID;
  safe_setor_destino UUID;
  valid_author_id UUID;
BEGIN
  -- Verificar se há usuário logado
  current_user_id := auth.uid();
  
  -- Tratar UUIDs vazios convertendo para NULL
  safe_setor_origem := CASE 
    WHEN p_setor_origem_id IS NULL OR p_setor_origem_id::text = '' THEN NULL 
    ELSE p_setor_origem_id 
  END;
  
  safe_setor_destino := CASE 
    WHEN p_setor_destino_id IS NULL OR p_setor_destino_id::text = '' THEN NULL 
    ELSE p_setor_destino_id 
  END;
  
  IF current_user_id IS NULL THEN
    -- Se não há usuário logado, buscar um admin válido para usar como autor
    SELECT user_id INTO valid_author_id
    FROM public.profiles
    WHERE role = 'super_admin' AND ativo = true
    LIMIT 1;
    
    -- Se não encontrar admin, usar o primeiro usuário ativo
    IF valid_author_id IS NULL THEN
      SELECT user_id INTO valid_author_id
      FROM public.profiles
      WHERE ativo = true
      LIMIT 1;
    END IF;
    
    -- Se ainda não encontrar, pular o log
    IF valid_author_id IS NULL THEN
      RETURN NULL;
    END IF;
    
    -- Inserir log com usuário válido
    INSERT INTO public.sla_action_logs (
      sla_id, acao, autor_id, autor_email,
      setor_origem_id, setor_destino_id, justificativa,
      dados_anteriores, dados_novos
    ) VALUES (
      p_sla_id, p_acao, valid_author_id, 'sistema@automatico',
      safe_setor_origem, safe_setor_destino, p_justificativa,
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
      safe_setor_origem, safe_setor_destino, p_justificativa,
      p_dados_anteriores, p_dados_novos
    ) RETURNING id INTO log_id;
  END IF;
  
  RETURN log_id;
END;
$$;