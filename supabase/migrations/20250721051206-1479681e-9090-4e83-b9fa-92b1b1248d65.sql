-- Atualizar o usuário teste@gmail.com para ser administrador master
UPDATE public.profiles 
SET user_type = 'administrador_master' 
WHERE email = 'teste@gmail.com';