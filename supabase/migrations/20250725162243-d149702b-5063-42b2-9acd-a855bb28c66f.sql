-- Corrigir problema com o campo role nullable
-- Primeiro, definir valor padrão para role
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'viewer'::public.user_role;

-- Tornar role NOT NULL
ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;

-- Atualizar registros existentes que possam ter role NULL
UPDATE public.profiles SET role = 'viewer'::public.user_role WHERE role IS NULL;

-- Simplificar a função handle_new_user para evitar conflitos de tipo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nome_completo, user_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nome_completo', new.email),
    'colaborador_setor'::public.user_type
  );
  -- O campo role receberá o valor padrão 'viewer' automaticamente
  RETURN new;
END;
$$;