
-- Corrigir as funções de segurança para funcionar com o sistema mock
-- Como estamos usando um sistema aberto, vamos simplificar as verificações

-- 1. Atualizar função is_admin para funcionar com o mock user
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = ''
AS $$
  -- Se não há usuário logado (sistema mock), sempre retorna true
  -- Se há usuário logado, verifica se é admin
  SELECT CASE 
    WHEN user_uuid IS NULL THEN true
    WHEN user_uuid = '00000000-0000-0000-0000-000000000000'::uuid THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = user_uuid 
      AND user_type = 'administrador_master'
    )
  END;
$$;

-- 2. Atualizar função user_has_setor_access para funcionar com o mock
CREATE OR REPLACE FUNCTION public.user_has_setor_access(setor_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = ''
AS $$
  -- Se não há usuário logado (sistema mock), sempre retorna true
  -- Se é admin, sempre retorna true
  -- Se é usuário normal, verifica acesso ao setor
  SELECT CASE 
    WHEN user_uuid IS NULL THEN true
    WHEN user_uuid = '00000000-0000-0000-0000-000000000000'::uuid THEN true
    WHEN public.is_admin(user_uuid) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.user_setores 
      WHERE user_id = user_uuid 
      AND setor_id = setor_uuid
    )
  END;
$$;

-- 3. Atualizar função add_sla_comment para funcionar melhor com o sistema mock
CREATE OR REPLACE FUNCTION public.add_sla_comment(
  p_sla_id uuid, 
  p_setor_id uuid, 
  p_comentario text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  comment_id UUID;
  user_profile RECORD;
  current_user_id UUID;
  autor_nome_final TEXT;
BEGIN
  -- Verificar se usuário tem acesso ao setor (agora vai funcionar com mock)
  IF NOT public.user_has_setor_access(p_setor_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado ao setor';
  END IF;
  
  -- Pegar o user_id atual
  current_user_id := auth.uid();
  
  -- Se não há usuário logado (sistema mock), usar dados padrão
  IF current_user_id IS NULL THEN
    current_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
    autor_nome_final := 'Super Administrador';
  ELSE
    -- Buscar dados do usuário
    SELECT nome_completo INTO user_profile
    FROM public.profiles
    WHERE user_id = current_user_id;
    
    autor_nome_final := COALESCE(user_profile.nome_completo, 'Super Administrador');
  END IF;
  
  -- Inserir comentário
  INSERT INTO public.sla_comentarios_internos (
    sla_id, setor_id, autor_id, autor_nome, comentario
  ) VALUES (
    p_sla_id, p_setor_id, current_user_id, autor_nome_final, p_comentario
  ) RETURNING id INTO comment_id;
  
  RETURN comment_id;
END;
$$;

-- 4. Criar perfil do Super Admin se não existir
INSERT INTO public.profiles (user_id, email, nome_completo, user_type)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@sistema.com',
  'Super Administrador',
  'administrador_master'
)
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  nome_completo = EXCLUDED.nome_completo,
  user_type = EXCLUDED.user_type;

-- 5. Garantir que o Super Admin tenha acesso a todos os setores
INSERT INTO public.user_setores (user_id, setor_id)
SELECT '00000000-0000-0000-0000-000000000000'::uuid, id
FROM public.setores
ON CONFLICT (user_id, setor_id) DO NOTHING;
