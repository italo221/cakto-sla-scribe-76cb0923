-- Remover políticas permissivas que permitem acesso total
DROP POLICY IF EXISTS "Permitir leitura de SLA" ON public.sla_demandas;
DROP POLICY IF EXISTS "Permitir inserção de SLA" ON public.sla_demandas;  
DROP POLICY IF EXISTS "Permitir atualização de SLA" ON public.sla_demandas;

-- As políticas corretas já existem:
-- - sla_select_admin: Admins podem ver todos os SLAs
-- - sla_select_setor: Usuários só veem SLAs do seu setor
-- - sla_update_admin: Admins podem atualizar todos
-- - sla_update_setor: Usuários só podem atualizar SLAs do seu setor
-- - sla_insert_authenticated: Usuários autenticados podem criar SLAs

-- Verificar se a política de DELETE para admins existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sla_demandas' 
        AND policyname = 'sla_delete_admin'
    ) THEN
        CREATE POLICY "sla_delete_admin" 
        ON public.sla_demandas 
        FOR DELETE 
        USING (is_admin());
    END IF;
END $$;