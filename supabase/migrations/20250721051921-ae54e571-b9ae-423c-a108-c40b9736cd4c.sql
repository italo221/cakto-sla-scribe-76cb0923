-- Primeiro vamos mudar o usuário teste@gmail.com para colaborador_setor
UPDATE public.profiles 
SET user_type = 'colaborador_setor' 
WHERE email = 'teste@gmail.com';

-- Agora vamos vincular ele APENAS ao setor TI SUPORTE
INSERT INTO public.user_setores (user_id, setor_id)
SELECT 
  user_id,
  '3a3b3e81-947f-4638-afa1-930c8d69e764' -- ID do setor TI SUPORTE
FROM public.profiles 
WHERE email = 'teste@gmail.com'
ON CONFLICT (user_id, setor_id) DO NOTHING;