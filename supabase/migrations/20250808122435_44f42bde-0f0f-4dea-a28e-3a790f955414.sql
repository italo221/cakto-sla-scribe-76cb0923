-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas conflitantes
DROP POLICY IF EXISTS profiles_select_consolidated ON public.profiles;
DROP POLICY IF EXISTS profiles_public_select ON public.profiles;
DROP POLICY IF EXISTS profiles_select_for_mentions ON public.profiles;

-- Nova política de SELECT: autenticados podem ler perfis ativos OU com ativo nulo
CREATE POLICY profiles_select_for_mentions
ON public.profiles
FOR SELECT
TO authenticated
USING (COALESCE(ativo, TRUE));

-- Índices para busca
CREATE INDEX IF NOT EXISTS idx_profiles_nome_lower
  ON public.profiles (LOWER(nome_completo));
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON public.profiles (LOWER(email));