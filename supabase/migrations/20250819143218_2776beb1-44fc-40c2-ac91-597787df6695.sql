-- Primeiro, remover as políticas atuais restritivas de SELECT e UPDATE
DROP POLICY IF EXISTS "sla_demandas_select_access_or_creator" ON sla_demandas;
DROP POLICY IF EXISTS "sla_demandas_update_sector_access_only" ON sla_demandas;

-- Criar nova política de SELECT que permite todos os usuários autenticados visualizarem todos os tickets
CREATE POLICY "sla_demandas_select_all_authenticated" 
ON sla_demandas 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Política de UPDATE mais permissiva para permitir que usuários fechem tickets
CREATE POLICY "sla_demandas_update_authenticated_users" 
ON sla_demandas 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Manter a política de DELETE mais restritiva apenas para super admins
-- A política "sla_delete_super_admin_new" já existe e está correta

-- Verificar e atualizar a política de INSERT se necessário
DROP POLICY IF EXISTS "sla_demandas_insert_operators_any_sector" ON sla_demandas;
CREATE POLICY "sla_demandas_insert_authenticated" 
ON sla_demandas 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);