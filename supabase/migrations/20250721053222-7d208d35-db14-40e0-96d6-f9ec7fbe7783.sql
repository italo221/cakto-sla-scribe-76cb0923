-- Atualizar usuário teste@gmail.com para administrador master
UPDATE public.profiles 
SET user_type = 'administrador_master'
WHERE email = 'teste@gmail.com';