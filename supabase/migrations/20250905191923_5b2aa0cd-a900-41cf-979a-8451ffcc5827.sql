-- Parte 1: Otimizar políticas RLS mais críticas para performance

-- 1. Corrigir lib_custom_presets (tabela mencionada no problema)
DROP POLICY IF EXISTS "Users can manage their own lib_custom_presets" ON public.lib_custom_presets;

CREATE POLICY "Users can manage their own lib_custom_presets"
ON public.lib_custom_presets
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- 2. Corrigir lib_link_profiles 
DROP POLICY IF EXISTS "Authenticated users can manage their own lib_link_profiles" ON public.lib_link_profiles;

CREATE POLICY "Authenticated users can manage their own lib_link_profiles"
ON public.lib_link_profiles
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- 3. Corrigir user_setores (tabela crítica para permissões)
DROP POLICY IF EXISTS "user_setores_select_consolidated" ON public.user_setores;

CREATE POLICY "user_setores_select_consolidated"
ON public.user_setores
FOR SELECT
TO authenticated
USING (((SELECT auth.uid()) = user_id) OR is_admin());

-- 4. Corrigir notifications (consulta frequente)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);