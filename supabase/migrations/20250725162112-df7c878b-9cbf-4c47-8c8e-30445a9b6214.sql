-- Corrigir trigger handle_new_user para funcionar com o novo sistema de roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nome_completo, user_type, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nome_completo', new.email),
    COALESCE((new.raw_user_meta_data->>'user_type')::public.user_type, 'colaborador_setor'),
    'viewer'::public.user_role  -- Todos os novos usuários começam como viewer
  );
  RETURN new;
END;
$$;