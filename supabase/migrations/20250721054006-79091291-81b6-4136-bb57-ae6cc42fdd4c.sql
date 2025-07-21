-- Corrigir metadados do usuário teste@gmail.com (definitivo)
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb), 
  '{user_type}', 
  '"administrador_master"'
)
WHERE email = 'teste@gmail.com';

-- Tornar a função log_sla_action mais robusta (não falhar se não houver usuário logado)
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
AS $function$
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
$function$;