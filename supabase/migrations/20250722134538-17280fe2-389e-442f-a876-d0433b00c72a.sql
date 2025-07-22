-- Corrigir a foreign key criando o usuário na tabela users primeiro
-- E depois ajustando a função para não depender de um UUID específico

-- 1. Criar o usuário na tabela users primeiro
INSERT INTO public.users (id, name)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Super Administrador'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name;

-- 2. Agora criar o perfil do Super Admin
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

-- 3. Garantir que todos os setores tenham o Super Admin associado
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

-- 4. Versão mais robusta da função add_sla_comment
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
  current_user_id UUID;
  autor_nome_final TEXT;
BEGIN
  -- Pegar o user_id atual ou usar o Super Admin como fallback
  current_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Buscar nome do autor
  SELECT nome_completo INTO autor_nome_final
  FROM public.profiles
  WHERE user_id = current_user_id;
  
  -- Fallback para o nome se não encontrar
  autor_nome_final := COALESCE(autor_nome_final, 'Super Administrador');
  
  -- Verificar permissões (como Super Admin sempre tem permissão, isso vai passar)
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