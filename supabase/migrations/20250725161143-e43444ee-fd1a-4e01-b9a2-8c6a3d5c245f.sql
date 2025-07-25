-- Sistema de autenticação e roles
-- 1. Criar enum para roles
CREATE TYPE public.user_role AS ENUM ('super_admin', 'operador', 'viewer');

-- 2. Atualizar tabela profiles para incluir role
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'viewer';

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 4. Função para verificar role específica
CREATE OR REPLACE FUNCTION public.has_role(_role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = _role
      AND ativo = true
  );
$$;

-- 5. Função para verificar se é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT public.has_role('super_admin'::public.user_role);
$$;

-- 6. Função para verificar se pode editar (super_admin ou operador)
CREATE OR REPLACE FUNCTION public.can_edit()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT public.has_role('super_admin'::public.user_role) OR public.has_role('operador'::public.user_role);
$$;

-- 7. Atualizar a função is_admin existente para usar o novo sistema
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = COALESCE(user_uuid, auth.uid()) 
      AND (role = 'super_admin' OR user_type = 'administrador_master')
      AND ativo = true
  );
$$;

-- 8. Atualizar RLS policies para usar o novo sistema de roles

-- Profiles: Super admins podem ver/editar tudo, usuários só seus próprios dados
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_secure" ON public.profiles;

CREATE POLICY "profiles_select_super_admin" ON public.profiles
FOR SELECT USING (public.is_super_admin());

CREATE POLICY "profiles_select_own" ON public.profiles  
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_super_admin" ON public.profiles
FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "profiles_update_super_admin" ON public.profiles
FOR UPDATE USING (public.is_super_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()));

-- SLA Demandas: Super admins veem tudo, operadores podem editar, viewers só leem
DROP POLICY IF EXISTS "sla_select_admin" ON public.sla_demandas;
DROP POLICY IF EXISTS "sla_update_admin" ON public.sla_demandas;
DROP POLICY IF EXISTS "sla_delete_admin" ON public.sla_demandas;

CREATE POLICY "sla_select_authenticated" ON public.sla_demandas
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sla_insert_can_edit" ON public.sla_demandas
FOR INSERT WITH CHECK (public.can_edit());

CREATE POLICY "sla_update_can_edit" ON public.sla_demandas
FOR UPDATE USING (public.can_edit());

CREATE POLICY "sla_delete_super_admin" ON public.sla_demandas
FOR DELETE USING (public.is_super_admin());

-- SLA Comentários: Autenticados podem ver, operadores+ podem inserir
DROP POLICY IF EXISTS "comentarios_select_admin" ON public.sla_comentarios_internos;

CREATE POLICY "comentarios_select_authenticated" ON public.sla_comentarios_internos
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "comentarios_insert_can_edit" ON public.sla_comentarios_internos
FOR INSERT WITH CHECK (public.can_edit());

-- Setores: Todos podem ver, super admins podem editar
DROP POLICY IF EXISTS "setores_select_authenticated" ON public.setores;
DROP POLICY IF EXISTS "setores_insert_authenticated" ON public.setores;
DROP POLICY IF EXISTS "setores_update_authenticated" ON public.setores;

CREATE POLICY "setores_select_authenticated" ON public.setores
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "setores_insert_super_admin" ON public.setores
FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "setores_update_super_admin" ON public.setores
FOR UPDATE USING (public.is_super_admin());

-- User Setores: Próprios dados ou super admin
CREATE POLICY "user_setores_insert_super_admin" ON public.user_setores
FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "user_setores_update_super_admin" ON public.user_setores
FOR UPDATE USING (public.is_super_admin());

CREATE POLICY "user_setores_delete_super_admin" ON public.user_setores
FOR DELETE USING (public.is_super_admin());

-- 9. Configurar o primeiro usuário como super admin se existir
DO $$ 
DECLARE
  first_user_id UUID;
BEGIN
  SELECT user_id INTO first_user_id
  FROM public.profiles
  LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    UPDATE public.profiles 
    SET role = 'super_admin'
    WHERE user_id = first_user_id;
  END IF;
END $$;