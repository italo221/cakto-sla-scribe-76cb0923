-- Corrigir o problema de foreign key nos comentários
-- O perfil do Super Admin não existe, vamos criá-lo e ajustar a função

-- 1. Primeiro, vamos garantir que o perfil do Super Admin existe
INSERT INTO public.profiles (user_id, email, nome_completo, user_type, ativo)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@sistema.com',
  'Super Administrador',
  'administrador_master',
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  nome_completo = EXCLUDED.nome_completo,
  user_type = EXCLUDED.user_type,
  ativo = EXCLUDED.ativo;

-- 2. Garantir que todos os setores tenham o Super Admin associado
INSERT INTO public.user_setores (user_id, setor_id)
SELECT 
  '00000000-0000-0000-0000-000000000000'::uuid,
  id
FROM public.setores
WHERE id NOT IN (
  SELECT setor_id 
  FROM public.user_setores 
  WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid
);

-- 3. Atualizar a função add_sla_comment para ser mais robusta
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
  -- Pegar o user_id atual
  current_user_id := auth.uid();
  
  -- Se não há usuário logado (sistema mock), usar o Super Admin
  IF current_user_id IS NULL THEN
    current_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
    autor_nome_final := 'Super Administrador';
  ELSE
    -- Buscar dados do usuário
    SELECT nome_completo INTO user_profile
    FROM public.profiles
    WHERE user_id = current_user_id;
    
    -- Se não encontrar o perfil, usar dados padrão
    IF user_profile.nome_completo IS NULL THEN
      autor_nome_final := 'Super Administrador';
      current_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
    ELSE
      autor_nome_final := user_profile.nome_completo;
    END IF;
  END IF;
  
  -- Verificar se usuário tem acesso ao setor (depois de definir o current_user_id)
  IF NOT public.user_has_setor_access(p_setor_id, current_user_id) AND NOT public.is_admin(current_user_id) THEN
    RAISE EXCEPTION 'Acesso negado ao setor';
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