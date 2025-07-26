-- Finalizar correções dos avisos auth_rls_initplan restantes
-- Corrigir as 3 políticas específicas identificadas

-- 1. CORRIGIR: Table: public.sla_action_logs – Policy: sla_logs_insert_authenticated
DROP POLICY IF EXISTS "sla_logs_insert_authenticated" ON public.sla_action_logs;

CREATE POLICY "sla_logs_insert_authenticated" ON public.sla_action_logs
FOR INSERT
WITH CHECK (
  -- Otimização: auth_rls_initplan corrigido (substituído auth.uid() por SELECT auth.uid())
  ((SELECT auth.uid()) = autor_id)
);

-- 2. CORRIGIR: Table: public.sla_logs – Policy: sla_logs_insert_authenticated  
DROP POLICY IF EXISTS "sla_logs_insert_authenticated" ON public.sla_logs;

CREATE POLICY "sla_logs_insert_authenticated" ON public.sla_logs
FOR INSERT
WITH CHECK (
  -- Otimização: auth_rls_initplan corrigido (substituído auth.uid() por SELECT auth.uid())
  (SELECT auth.uid()) IS NOT NULL
);

-- 3. CORRIGIR: Table: public.user_setores – Policy: user_setores_select_consolidated
DROP POLICY IF EXISTS "user_setores_select_consolidated" ON public.user_setores;

CREATE POLICY "user_setores_select_consolidated" ON public.user_setores
FOR SELECT
USING (
  -- Otimização: auth_rls_initplan corrigido (substituído auth.uid() por SELECT auth.uid())
  ((SELECT auth.uid()) = user_id) OR 
  is_admin()
);

-- Verificar se as correções foram aplicadas corretamente
SELECT 'Correções auth_rls_initplan finalizadas com sucesso' as status;