-- Criar usuário administrador master para testes

-- Primeiro, vamos inserir o usuário na tabela auth.users (simulando um cadastro)
-- Nota: Em produção, isso seria feito através do cadastro normal

-- Inserir perfil de administrador master diretamente
INSERT INTO public.profiles (
  user_id, 
  email, 
  nome_completo, 
  user_type, 
  ativo
) VALUES (
  gen_random_uuid(),
  'admin@sistemasla.com',
  'Administrador Master',
  'administrador_master',
  true
) ON CONFLICT (email) DO NOTHING;

-- Verificar se foi inserido
SELECT * FROM public.profiles WHERE email = 'admin@sistemasla.com';