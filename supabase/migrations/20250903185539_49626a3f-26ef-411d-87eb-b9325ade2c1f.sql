-- Corrigir política de INSERT para permitir criação de tags globais
DROP POLICY "Users can create tags in their teams" ON public.organized_tags;

CREATE POLICY "Users can create tags in their teams or global tags" 
ON public.organized_tags 
FOR INSERT 
WITH CHECK (
  -- Usuários podem criar tags globais (created_by = null e is_global = true)
  (is_global = true AND created_by IS NULL) OR
  -- Ou tags em seus próprios times
  (auth.uid() = created_by AND ((team_id IS NULL) OR (team_id IN ( 
    SELECT us.setor_id
    FROM user_setores us
    WHERE (us.user_id = auth.uid())
  )) OR is_admin()))
);