-- ============================================
-- FASE 1: EMERGENCY HARDENING - Endurecimento de Segurança
-- ============================================

-- 1. BLOQUEAR ROLE ANON (Nenhum acesso sem autenticação)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- 2. ADICIONAR COLUNAS DE SOFT DELETE em sla_demandas
ALTER TABLE sla_demandas 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS deletion_type TEXT CHECK (deletion_type IN ('user', 'admin'));

-- Índice para queries de tickets excluídos
CREATE INDEX IF NOT EXISTS idx_sla_demandas_deleted_at 
ON sla_demandas(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- 3. ADICIONAR COLUNA created_by em sla_demandas (para rastrear autoria)
ALTER TABLE sla_demandas 
ADD COLUMN IF NOT EXISTS created_by UUID;

-- 4. ADICIONAR COLUNAS DE MIGRAÇÃO em profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS migrated_from TEXT,
ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;

-- 5. TRIGGER: Garantir created_by seja preenchido automaticamente
CREATE OR REPLACE FUNCTION set_ticket_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- Se created_by não foi fornecido, usar o usuário atual
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  
  -- Validar que created_by deve ser o usuário atual (com check de NULL)
  IF TG_OP = 'INSERT' AND (NEW.created_by != auth.uid() OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'created_by deve ser o usuário atual autenticado';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_created_by ON sla_demandas;
CREATE TRIGGER enforce_created_by
BEFORE INSERT ON sla_demandas
FOR EACH ROW EXECUTE FUNCTION set_ticket_created_by();

-- 6. TRIGGER: Proteção contra auto-promoção de privilégios
-- (Complementa o trigger validate_role_changes já existente)
CREATE OR REPLACE FUNCTION prevent_self_role_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Buscar role do usuário atual
  SELECT user_type INTO current_user_role
  FROM profiles
  WHERE user_id = auth.uid();

  -- Verificar se está tentando mudar user_type ou role
  IF OLD.user_type IS DISTINCT FROM NEW.user_type OR OLD.role IS DISTINCT FROM NEW.role THEN
    -- Usuários comuns não podem mudar nenhum user_type/role
    IF current_user_role != 'administrador_master' THEN
      RAISE EXCEPTION 'Apenas Super Admins podem alterar user_type ou role de usuários';
    END IF;
    
    -- Super admins não podem mudar o próprio user_type/role
    IF NEW.user_id = auth.uid() THEN
      RAISE EXCEPTION 'Super Admins não podem alterar o próprio user_type ou role';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS prevent_privilege_escalation ON profiles;
CREATE TRIGGER prevent_privilege_escalation
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_self_role_change();

-- 7. RLS: Atualizar política de UPDATE em sla_demandas
-- Apenas dono do ticket OU super admin pode editar
DROP POLICY IF EXISTS "sla_demandas_update_authenticated_users" ON sla_demandas;
DROP POLICY IF EXISTS "sla_demandas_update_restricted" ON sla_demandas;

CREATE POLICY "sla_demandas_update_restricted" ON sla_demandas
FOR UPDATE USING (
  deleted_at IS NULL -- Não permite editar tickets excluídos
  AND (
    is_super_admin() -- Super admin edita qualquer ticket
    OR created_by = auth.uid() -- Dono edita próprio ticket
  )
) WITH CHECK (
  deleted_at IS NULL
  AND (
    is_super_admin()
    OR created_by = auth.uid()
  )
);

-- 8. RLS: Permitir visualização de tickets excluídos (para todos autenticados)
DROP POLICY IF EXISTS "sla_demandas_select_deleted" ON sla_demandas;

CREATE POLICY "sla_demandas_select_deleted" ON sla_demandas
FOR SELECT USING (
  deleted_at IS NOT NULL 
  AND auth.uid() IS NOT NULL
);

-- 9. REMOVER política de DELETE hard (bloquear exclusão física)
DROP POLICY IF EXISTS "sla_delete_super_admin_new" ON sla_demandas;
-- NÃO criar nova política de DELETE - isso bloqueia hard delete

-- 10. CORRIGIR política permissiva de notifications INSERT
DROP POLICY IF EXISTS "Allow system to create notifications for any user" ON notifications;

CREATE POLICY "notifications_insert_restricted" ON notifications
FOR INSERT WITH CHECK (
  is_super_admin() -- Admins podem criar para qualquer usuário
  OR user_id = auth.uid() -- Usuário pode criar apenas para si mesmo
);