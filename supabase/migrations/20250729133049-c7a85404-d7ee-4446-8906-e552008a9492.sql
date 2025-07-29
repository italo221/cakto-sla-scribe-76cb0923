-- Adicionar campo telefone na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS telefone TEXT;

-- Adicionar campo avatar_url na tabela profiles  
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Comentário sobre os campos adicionados
COMMENT ON COLUMN public.profiles.telefone IS 'Número de telefone do usuário';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL da foto de perfil do usuário';