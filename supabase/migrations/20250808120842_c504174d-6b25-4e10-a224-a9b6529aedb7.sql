-- Habilitar RLS (se não estiver)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas que possam estar bloqueando
DROP POLICY IF EXISTS profiles_select_consolidated ON public.profiles;
DROP POLICY IF EXISTS profiles_public_select ON public.profiles;
DROP POLICY IF EXISTS profiles_select_for_mentions ON public.profiles;

-- NOVA política de SELECT: todo usuário autenticado pode ler perfis ativos
CREATE POLICY profiles_select_for_mentions
ON public.profiles
FOR SELECT
TO authenticated
USING (ativo IS TRUE);

-- Criar índices para melhor performance das buscas por menção (sem CONCURRENTLY em migration)
CREATE INDEX IF NOT EXISTS idx_profiles_nome_lower
  ON public.profiles (lower(nome_completo));

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON public.profiles (lower(email));