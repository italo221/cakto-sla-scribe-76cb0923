-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Limpar políticas de SELECT conflitantes
DROP POLICY IF EXISTS profiles_select_consolidated ON public.profiles;
DROP POLICY IF EXISTS profiles_public_select ON public.profiles;
DROP POLICY IF EXISTS profiles_select_for_mentions ON public.profiles;

-- Política nova: qualquer usuário autenticado pode ler perfis
CREATE POLICY profiles_select_for_mentions
ON public.profiles
FOR SELECT
TO authenticated
USING (COALESCE(ativo, TRUE));