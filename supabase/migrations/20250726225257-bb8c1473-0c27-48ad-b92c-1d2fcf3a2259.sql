-- Corrigir política duplicada final na tabela user_setores
-- Remover a política duplicada e manter apenas a consolidada

DROP POLICY IF EXISTS "user_setores_all_admin" ON public.user_setores;

-- A política consolidada já existe: "user_setores_select_consolidated"
-- Vamos adicionar as outras ações que a política "all_admin" cobria

-- Criar políticas específicas para INSERT, UPDATE, DELETE para admins
CREATE POLICY "user_setores_insert_admin" ON public.user_setores
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "user_setores_update_admin" ON public.user_setores
FOR UPDATE
USING (is_admin());

CREATE POLICY "user_setores_delete_admin" ON public.user_setores
FOR DELETE
USING (is_admin());

-- Verificação final das políticas
SELECT schemaname, tablename, policyname, cmd, permissive 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_setores'
ORDER BY cmd;