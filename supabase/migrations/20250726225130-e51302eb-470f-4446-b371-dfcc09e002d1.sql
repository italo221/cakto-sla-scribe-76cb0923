-- PRIMEIRO: Verificar se existem múltiplas políticas permissivas
-- Vamos habilitar RLS em todas as tabelas que precisam primeiro

-- Habilitar RLS nas tabelas que não têm
ALTER TABLE public.color_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_comentarios_internos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_kyc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- CONSOLIDAR POLÍTICAS MÚLTIPLAS PERMISSIVAS

-- 1. PROFILES: Consolidar SELECT policies
DROP POLICY IF EXISTS "profiles_select_super_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_new" ON public.profiles;

CREATE POLICY "profiles_select_consolidated" ON public.profiles
FOR SELECT
USING (
  is_super_admin() OR 
  (auth.uid() = user_id)
);

-- 2. PROFILES: Consolidar UPDATE policies  
DROP POLICY IF EXISTS "profiles_update_super_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_new" ON public.profiles;

CREATE POLICY "profiles_update_consolidated" ON public.profiles
FOR UPDATE
USING (
  is_super_admin() OR 
  (auth.uid() = user_id)
)
WITH CHECK (
  is_super_admin() OR 
  (auth.uid() = user_id)
);

-- 3. SLA_DEMANDAS: Consolidar SELECT policies
DROP POLICY IF EXISTS "sla_select_setor" ON public.sla_demandas;
DROP POLICY IF EXISTS "sla_select_authenticated_new" ON public.sla_demandas;

CREATE POLICY "sla_demandas_select_consolidated" ON public.sla_demandas
FOR SELECT
USING (
  user_has_setor_access(setor_id) OR 
  (auth.uid() IS NOT NULL)
);

-- 4. SLA_DEMANDAS: Consolidar UPDATE policies
DROP POLICY IF EXISTS "sla_update_setor" ON public.sla_demandas;
DROP POLICY IF EXISTS "sla_update_can_edit_new" ON public.sla_demandas;

CREATE POLICY "sla_demandas_update_consolidated" ON public.sla_demandas
FOR UPDATE
USING (
  user_has_setor_access(setor_id) OR 
  can_edit()
);

-- 5. SLA_DEMANDAS: Consolidar INSERT policies
DROP POLICY IF EXISTS "sla_insert_authenticated" ON public.sla_demandas;
DROP POLICY IF EXISTS "sla_insert_can_edit_new" ON public.sla_demandas;

CREATE POLICY "sla_demandas_insert_consolidated" ON public.sla_demandas
FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL) OR 
  can_edit()
);

-- 6. SLA_ACTION_LOGS: Consolidar SELECT policies
DROP POLICY IF EXISTS "sla_logs_select_admin" ON public.sla_action_logs;
DROP POLICY IF EXISTS "sla_logs_select_setor_access" ON public.sla_action_logs;

CREATE POLICY "sla_action_logs_select_consolidated" ON public.sla_action_logs
FOR SELECT
USING (
  is_admin() OR 
  (sla_id IN (SELECT s.id FROM sla_demandas s WHERE user_has_setor_access(s.setor_id)))
);

-- 7. SLA_COMENTARIOS_INTERNOS: Consolidar SELECT policies
DROP POLICY IF EXISTS "comentarios_select_admin" ON public.sla_comentarios_internos;
DROP POLICY IF EXISTS "comentarios_select_setor" ON public.sla_comentarios_internos;

CREATE POLICY "sla_comentarios_select_consolidated" ON public.sla_comentarios_internos
FOR SELECT
USING (
  is_admin() OR 
  user_has_setor_access(setor_id)
);

-- 8. USER_SETORES: Consolidar SELECT policies
DROP POLICY IF EXISTS "user_setores_select_own" ON public.user_setores;
DROP POLICY IF EXISTS "user_setores_select_admin" ON public.user_setores;

CREATE POLICY "user_setores_select_consolidated" ON public.user_setores
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  is_admin()
);

-- 9. SLA_LOGS: Consolidar SELECT policies (se houver múltiplas)
-- Verificando se há múltiplas...