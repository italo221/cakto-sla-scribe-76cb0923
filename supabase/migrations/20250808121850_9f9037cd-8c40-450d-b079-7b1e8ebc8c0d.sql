-- Garantir RLS habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas conflitantes
DROP POLICY IF EXISTS profiles_select_consolidated ON public.profiles;
DROP POLICY IF EXISTS profiles_public_select ON public.profiles;
DROP POLICY IF EXISTS profiles_select_for_mentions ON public.profiles;

-- Nova política de SELECT: qualquer usuário autenticado pode ver perfis
-- 'ativo' verdadeiro OU nulo (para não bloquear cadastros antigos)
CREATE POLICY profiles_select_for_mentions
ON public.profiles
FOR SELECT
TO authenticated
USING (COALESCE(ativo, TRUE) = TRUE);

-- Criar índices se ainda não existirem
CREATE INDEX IF NOT EXISTS idx_profiles_nome_lower
  ON public.profiles (LOWER(nome_completo));
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON public.profiles (LOWER(email));