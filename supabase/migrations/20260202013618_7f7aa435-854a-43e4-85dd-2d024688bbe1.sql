-- =====================================================
-- FASES 2, 3 e 5: SECURITY HARDENING (SEM FASE 4)
-- Fase 4 removida: enum user_type não possui 'viewer'
-- =====================================================

-- =====================================================
-- FASE 2: Sistema de Allowlist de Emails
-- =====================================================

-- Tabela de allowlist para controle de acesso por email
CREATE TABLE IF NOT EXISTS email_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  revoked_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE email_allowlist ENABLE ROW LEVEL SECURITY;

-- Apenas super admins podem gerenciar a allowlist
CREATE POLICY "allowlist_admin_only" ON email_allowlist
FOR ALL USING (is_super_admin());

-- =====================================================
-- FASE 3: Soft Delete - Funções e Views
-- =====================================================

-- Função de soft delete com validação e auditoria
CREATE OR REPLACE FUNCTION soft_delete_ticket(
  p_ticket_id UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_role TEXT;
  v_ticket_owner UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Validar motivo
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Motivo de exclusão deve ter no mínimo 10 caracteres';
  END IF;

  -- Obter role do usuário
  SELECT user_type INTO v_user_role 
  FROM profiles WHERE user_id = auth.uid();
  
  v_is_admin := is_super_admin();

  -- Verificar se ticket existe e não foi excluído
  SELECT created_by INTO v_ticket_owner 
  FROM sla_demandas 
  WHERE id = p_ticket_id AND deleted_at IS NULL;

  IF v_ticket_owner IS NULL THEN
    RAISE EXCEPTION 'Ticket não encontrado ou já foi excluído';
  END IF;

  -- Verificar permissão: admin ou dono do ticket
  IF NOT v_is_admin AND v_ticket_owner != auth.uid() THEN
    RAISE EXCEPTION 'Você não tem permissão para excluir este ticket';
  END IF;

  -- Executar soft delete
  UPDATE sla_demandas
  SET 
    deleted_at = now(),
    deleted_by = auth.uid(),
    deletion_reason = p_reason,
    deletion_type = CASE WHEN v_is_admin THEN 'admin' ELSE 'user' END
  WHERE id = p_ticket_id;

  -- Registrar na auditoria de ações SLA
  INSERT INTO sla_action_logs (
    sla_id, acao, autor_id, autor_email, justificativa, dados_anteriores
  )
  SELECT 
    p_ticket_id,
    'SOFT_DELETE',
    auth.uid(),
    (SELECT email FROM profiles WHERE user_id = auth.uid()),
    p_reason,
    jsonb_build_object('deleted_by_role', CASE WHEN v_is_admin THEN 'admin' ELSE 'user' END)
  ;

  RETURN jsonb_build_object(
    'success', true, 
    'ticket_id', p_ticket_id, 
    'deleted_at', now(),
    'deleted_by', auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION soft_delete_ticket(UUID, TEXT) TO authenticated;

-- Função de restauração (apenas super admins)
CREATE OR REPLACE FUNCTION restore_ticket(
  p_ticket_id UUID,
  p_restore_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_deleted_at TIMESTAMPTZ;
BEGIN
  -- Verificar se é super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Apenas super admins podem restaurar tickets';
  END IF;

  -- Verificar se ticket está excluído
  SELECT deleted_at INTO v_deleted_at
  FROM sla_demandas 
  WHERE id = p_ticket_id;

  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'Ticket não está excluído ou não existe';
  END IF;

  -- Restaurar ticket
  UPDATE sla_demandas
  SET 
    deleted_at = NULL, 
    deleted_by = NULL, 
    deletion_reason = NULL, 
    deletion_type = NULL
  WHERE id = p_ticket_id;

  -- Registrar na auditoria
  INSERT INTO sla_action_logs (
    sla_id, acao, autor_id, autor_email, justificativa
  )
  SELECT 
    p_ticket_id,
    'RESTORE',
    auth.uid(),
    (SELECT email FROM profiles WHERE user_id = auth.uid()),
    p_restore_reason
  ;

  RETURN jsonb_build_object(
    'success', true, 
    'ticket_id', p_ticket_id,
    'restored_at', now(),
    'restored_by', auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION restore_ticket(UUID, TEXT) TO authenticated;

-- View para tickets ativos (não excluídos)
CREATE OR REPLACE VIEW sla_demandas_active AS
SELECT * FROM sla_demandas WHERE deleted_at IS NULL;

-- View para tickets excluídos com informações do autor
CREATE OR REPLACE VIEW sla_demandas_deleted AS
SELECT 
  d.*,
  p.nome_completo as deleted_by_name,
  p.email as deleted_by_email
FROM sla_demandas d
LEFT JOIN profiles p ON p.user_id = d.deleted_by
WHERE d.deleted_at IS NOT NULL
ORDER BY d.deleted_at DESC;

-- =====================================================
-- FASE 5: Hardening Adicional
-- =====================================================

-- View segura para menções (expõe apenas dados necessários)
CREATE OR REPLACE VIEW profiles_for_mentions AS
SELECT 
  user_id,
  nome_completo,
  avatar_url,
  CASE WHEN ativo = true THEN 'ativo' ELSE 'inativo' END as status
FROM profiles
WHERE ativo = true;

-- Função de busca de menções (CORRIGIDO: nome_completo no RETURNS TABLE)
CREATE OR REPLACE FUNCTION search_mentions(search_term TEXT)
RETURNS TABLE (user_id UUID, nome_completo TEXT, avatar_url TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.nome_completo, p.avatar_url
  FROM profiles p
  WHERE p.ativo = true
  AND p.nome_completo ILIKE '%' || search_term || '%'
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION search_mentions(TEXT) TO authenticated;

-- Tabela de auditoria centralizada
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas super admins podem ver logs de auditoria
CREATE POLICY "audit_logs_super_admin_select" ON audit_logs
FOR SELECT USING (is_super_admin());

-- Função helper para registrar auditoria
CREATE OR REPLACE FUNCTION log_audit(
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION log_audit(TEXT, TEXT, UUID, JSONB, JSONB) TO authenticated;

-- =====================================================
-- Índices adicionais para performance
-- =====================================================

-- Índice para soft delete queries
CREATE INDEX IF NOT EXISTS idx_sla_demandas_deleted_at ON sla_demandas(deleted_at) WHERE deleted_at IS NOT NULL;

-- Índice para allowlist lookups
CREATE INDEX IF NOT EXISTS idx_email_allowlist_email ON email_allowlist(email);
CREATE INDEX IF NOT EXISTS idx_email_allowlist_status ON email_allowlist(status);