-- Verificar todas as políticas RLS atuais e otimizar para evitar auth_rls_initplan warnings
-- Substituir chamadas diretas auth.uid() por subqueries estáveis

-- 1. PROFILES - Otimizar políticas existentes
DROP POLICY IF EXISTS "profiles_select_consolidated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_consolidated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_super_admin" ON public.profiles;

-- Política SELECT otimizada para profiles
CREATE POLICY "profiles_select_consolidated" ON public.profiles
FOR SELECT
USING (
  -- Otimização para evitar reavaliação linha a linha (auth_rls_initplan)
  is_super_admin() OR 
  ((SELECT auth.uid()) = user_id)
);

-- Política UPDATE otimizada para profiles
CREATE POLICY "profiles_update_consolidated" ON public.profiles
FOR UPDATE
USING (
  -- Otimização para evitar reavaliação linha a linha (auth_rls_initplan)
  is_super_admin() OR 
  ((SELECT auth.uid()) = user_id)
)
WITH CHECK (
  -- Otimização para evitar reavaliação linha a linha (auth_rls_initplan)
  is_super_admin() OR 
  ((SELECT auth.uid()) = user_id)
);

-- Política INSERT otimizada para profiles
CREATE POLICY "profiles_insert_super_admin" ON public.profiles
FOR INSERT
WITH CHECK (
  -- Otimização para evitar reavaliação linha a linha (auth_rls_initplan)
  is_super_admin()
);

-- 2. SETORES - Otimizar políticas existentes
DROP POLICY IF EXISTS "setores_select_authenticated" ON public.setores;
DROP POLICY IF EXISTS "setores_insert_authenticated" ON public.setores;
DROP POLICY IF EXISTS "setores_update_authenticated" ON public.setores;

-- Política SELECT otimizada para setores
CREATE POLICY "setores_select_authenticated" ON public.setores
FOR SELECT
USING (
  -- Otimização para evitar reavaliação linha a linha (auth_rls_initplan)
  (SELECT auth.uid()) IS NOT NULL
);

-- Política INSERT otimizada para setores
CREATE POLICY "setores_insert_authenticated" ON public.setores
FOR INSERT
WITH CHECK (
  -- Otimização para evitar reavaliação linha a linha (auth_rls_initplan)
  (SELECT auth.uid()) IS NOT NULL
);

-- Política UPDATE otimizada para setores
CREATE POLICY "setores_update_authenticated" ON public.setores
FOR UPDATE
USING (
  -- Otimização para evitar reavaliação linha a linha (auth_rls_initplan)
  (SELECT auth.uid()) IS NOT NULL
);

-- 3. SLA_DEMANDAS - Otimizar políticas existentes
DROP POLICY IF EXISTS "sla_demandas_select_consolidated" ON public.sla_demandas;
DROP POLICY IF EXISTS "sla_demandas_update_consolidated" ON public.sla_demandas;
DROP POLICY IF EXISTS "sla_demandas_insert_consolidated" ON public.sla_demandas;

-- Política SELECT otimizada para sla_demandas
CREATE POLICY "sla_demandas_select_consolidated" ON public.sla_demandas
FOR SELECT
USING (
  -- Otimização para evitar reavaliação linha a linha (auth_rls_initplan)
  user_has_setor_access(setor_id) OR 
  ((SELECT auth.uid()) IS NOT NULL)
);

-- Política UPDATE otimizada para sla_demandas
CREATE POLICY "sla_demandas_update_consolidated" ON public.sla_demandas
FOR UPDATE
USING (
  -- Otimização para evitar reavaliação linha a linha (auth_rls_initplan)
  user_has_setor_access(setor_id) OR 
  can_edit()
);

-- Política INSERT otimizada para sla_demandas
CREATE POLICY "sla_demandas_insert_consolidated" ON public.sla_demandas
FOR INSERT
WITH CHECK (
  -- Otimização para evitar reavaliação linha a linha (auth_rls_initplan)
  ((SELECT auth.uid()) IS NOT NULL) OR 
  can_edit()
);