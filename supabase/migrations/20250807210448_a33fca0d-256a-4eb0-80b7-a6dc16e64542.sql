-- Atualizar política para permitir que todos os usuários autenticados vejam perfis para menções
DROP POLICY IF EXISTS profiles_select_consolidated ON public.profiles;

-- Nova política que permite visualizar todos os perfis para usuários autenticados
CREATE POLICY "profiles_select_for_mentions" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Manter política de atualização restritiva
-- (A política de UPDATE já existe e está correta)