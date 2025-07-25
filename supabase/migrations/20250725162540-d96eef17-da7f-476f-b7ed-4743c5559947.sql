-- Promover usuário Pedro Henrique Oldoni para Super Admin
UPDATE public.profiles 
SET role = 'super_admin'::public.user_role
WHERE email = 'pedro@cakto.com.br';