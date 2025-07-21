-- Criar usuário colaborador de teste para o setor TI
-- Primeiro, vamos inserir o usuário na tabela profiles
INSERT INTO public.profiles (
  user_id,
  email, 
  nome_completo,
  user_type,
  ativo
) VALUES (
  gen_random_uuid(), -- Simular um user_id
  'colaborador.ti@empresa.com',
  'Carlos TI Colaborador', 
  'colaborador_setor',
  true
);

-- Agora vamos vincular este usuário ao setor TI SUPORTE
INSERT INTO public.user_setores (
  user_id,
  setor_id
) 
SELECT 
  p.user_id,
  '3a3b3e81-947f-4638-afa1-930c8d69e764' -- ID do setor TI SUPORTE
FROM public.profiles p 
WHERE p.email = 'colaborador.ti@empresa.com';

-- Criar outro usuário colaborador para o setor Marketing  
INSERT INTO public.profiles (
  user_id,
  email,
  nome_completo, 
  user_type,
  ativo
) VALUES (
  gen_random_uuid(),
  'colaborador.marketing@empresa.com',
  'Ana Marketing Colaboradora',
  'colaborador_setor', 
  true
);

-- Vincular ao setor Marketing
INSERT INTO public.user_setores (
  user_id,
  setor_id
)
SELECT 
  p.user_id,
  '709c1552-e2ab-4b5a-92ee-7fdaf8c1b581' -- ID do setor Marketing
FROM public.profiles p
WHERE p.email = 'colaborador.marketing@empresa.com';