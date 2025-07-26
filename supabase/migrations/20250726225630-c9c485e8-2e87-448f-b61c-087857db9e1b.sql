-- Continuar otimização das demais políticas RLS

-- 4. SLA_ACTION_LOGS - Otimizar políticas existentes  
DROP POLICY IF EXISTS "sla_logs_insert_authenticated" ON public.sla_action_logs;

-- Política INSERT otimizada para sla_action_logs
CREATE POLICY "sla_logs_insert_authenticated" ON public.sla_action_logs
FOR INSERT
WITH CHECK (
  -- Otimização para evitar reavaliação linha a linha (auth_rls_initplan)
  ((SELECT auth.uid()) = autor_id)
);

-- 5. SLA_LOGS - Otimizar políticas existentes
DROP POLICY IF EXISTS "sla_logs_insert_authenticated" ON public.sla_logs;

-- Política INSERT otimizada para sla_logs
CREATE POLICY "sla_logs_insert_authenticated" ON public.sla_logs
FOR INSERT
WITH CHECK (
  -- Otimização para evitar reavaliação linha a linha (auth_rls_initplan)
  (SELECT auth.uid()) IS NOT NULL
);

-- 6. USER_SETORES - Otimizar política existente
DROP POLICY IF EXISTS "user_setores_select_consolidated" ON public.user_setores;

-- Política SELECT otimizada para user_setores
CREATE POLICY "user_setores_select_consolidated" ON public.user_setores
FOR SELECT
USING (
  -- Otimização para evitar reavaliação linha a linha (auth_rls_initplan)
  ((SELECT auth.uid()) = user_id) OR 
  is_admin()
);

-- 7. Verificar se há outras políticas que precisam de otimização
-- Revisar funções security definer que usam auth.uid() internamente

-- Otimizar as funções security definer que usam auth.uid()
CREATE OR REPLACE FUNCTION public.has_role(_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = (SELECT auth.uid()) -- Otimização para evitar recálculo
      AND role = _role
      AND ativo = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT (SELECT auth.uid()))
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = COALESCE(user_uuid, (SELECT auth.uid())) 
      AND (role = 'super_admin' OR user_type = 'administrador_master')
      AND ativo = true
  );
$function$;

-- Verificar o resultado final
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, cmd;