-- Promover usuários "Super Administrador" e "Mateus" para Super Admin
UPDATE public.profiles 
SET role = 'super_admin'::public.user_role
WHERE nome_completo IN ('Super Administrador', 'Mateus');

-- Alterar Pedro para Admin Master (user_type)
UPDATE public.profiles 
SET user_type = 'administrador_master'::public.user_type
WHERE email = 'pedro@cakto.com.br';