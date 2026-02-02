# 📊 Relatório de Implementação - Endurecimento de Segurança

> ⚠️ **DOCUMENTO CONFIDENCIAL** - NÃO PUBLICAR NO GITHUB
>
> Este documento contém informações sensíveis sobre vulnerabilidades e configurações de segurança.
> Adicione ao `.gitignore` antes de fazer commit.

## Sistema SLA / Cakto SLA Scribe

**Data de Início:** 02/02/2026  
**Data de Conclusão:** Em andamento  
**Ambiente:** Produção  
**Projeto Supabase:** `hnqsgjblwuffgpksfyyh`

---

## 📋 1. RESUMO EXECUTIVO

### Status Geral

| Categoria | Quantidade | Status |
|-----------|------------|--------|
| ✅ Já Implementado | 5 | Proteções existentes |
| 🔴 Crítico | 4 | Ação imediata necessária |
| 🟡 Médio | 4 | Ação recomendada |
| 🟢 Baixo | 3 | Monitorar |

### Score de Segurança

| Categoria | Antes | Agora | Meta |
|-----------|-------|-------|------|
| Autenticação | 70/100 | 70/100 | 90/100 |
| Autorização | 75/100 | 75/100 | 95/100 |
| Proteção de Dados | 60/100 | 60/100 | 85/100 |
| Auditoria | 80/100 | 80/100 | 95/100 |
| RLS | 65/100 | 65/100 | 90/100 |
| **TOTAL** | **70/100** | **70/100** | **91/100** |

---

## ✅ 2. O QUE JÁ ESTÁ IMPLEMENTADO

### 2.1 Trigger de Proteção contra Escalada de Privilégios

**Status:** ✅ Implementado e Funcionando

**O que existe:**
```sql
-- Trigger: validate_role_changes
-- Função: validate_profile_role_change()
-- Tabela: profiles

CREATE TRIGGER validate_role_changes 
BEFORE UPDATE ON public.profiles 
FOR EACH ROW 
EXECUTE FUNCTION validate_profile_role_change();
```

**Comportamento:**
- ✅ Apenas Super Admins podem alterar roles
- ✅ Alterações são logadas em `sla_logs`
- ✅ Erros são lançados para não-admins

**Teste de Validação:**
```sql
-- Usuário operador tentando mudar próprio role
UPDATE profiles SET role = 'super_admin' WHERE user_id = auth.uid();
-- Resultado: ERRO "Apenas Super Administradores podem alterar roles de usuários"
```

---

### 2.2 Funções de Autorização Centralizadas

**Status:** ✅ Implementado

| Função | Propósito | SECURITY DEFINER |
|--------|-----------|------------------|
| `is_super_admin()` | Verifica se é super admin | ✅ Sim |
| `is_admin(user_uuid?)` | Verifica se é admin | ✅ Sim |
| `has_role(_user_id, _role)` | Verifica role específico | ✅ Sim |
| `can_edit()` | Verifica permissão de edição | ✅ Sim |
| `user_has_setor_access(setor_id)` | Verifica acesso ao setor | ✅ Sim |

---

### 2.3 Sistema de Recuperação de Senha Seguro

**Status:** ✅ Implementado

**Componentes:**
- `password_recovery_tokens` - Tokens com hash SHA256
- `password_recovery_audit` - Auditoria completa
- `password_recovery_attempts` - Rate limiting
- `generate_recovery_token()` - Geração segura
- `use_recovery_token()` - Uso único com invalidação
- `check_recovery_rate_limit()` - Proteção contra brute force
- `check_account_lockout()` - Bloqueio após tentativas

---

### 2.4 RLS Habilitado em Todas as Tabelas

**Status:** ✅ Implementado

Todas as 37 tabelas públicas têm RLS habilitado.

---

### 2.5 Logs de Auditoria

**Status:** ✅ Implementado

| Tabela | Propósito |
|--------|-----------|
| `sla_action_logs` | Ações em tickets |
| `sla_logs` | Logs gerais do sistema |
| `logs_permissoes` | Alterações de permissões |
| `password_recovery_audit` | Recuperação de senha |

---

## 🔴 3. VULNERABILIDADES CRÍTICAS

### 3.1 Notifications INSERT Permissivo

**Severidade:** 🔴 CRÍTICA  
**Status:** ❌ Não Corrigido

**Problema Atual:**
```sql
-- Policy atual (PERIGOSA)
CREATE POLICY "Allow system to create notifications for any user" 
ON notifications
FOR INSERT 
WITH CHECK (true);  -- QUALQUER USUÁRIO PODE INSERIR!
```

**Risco:**
- Qualquer usuário autenticado pode criar notificações para qualquer outro
- Phishing interno
- Spam/DoS via flood de notificações

**Correção Recomendada:**
```sql
-- Opção 1: Apenas via funções do sistema
DROP POLICY IF EXISTS "Allow system to create notifications for any user" ON notifications;

CREATE POLICY "notifications_insert_system_only" ON notifications
FOR INSERT 
WITH CHECK (
  -- Apenas funções SECURITY DEFINER podem inserir
  -- Verificar se a chamada vem de uma função do sistema
  current_setting('role') = 'service_role'
  OR is_admin()
);

-- Opção 2: Restringir para próprio usuário ou sistema
CREATE POLICY "notifications_insert_restricted" ON notifications
FOR INSERT 
WITH CHECK (
  is_admin() 
  OR user_id = auth.uid()  -- Só pode criar para si mesmo
);
```

**Prioridade:** 🔴 Imediata  
**Prazo:** 24 horas

---

### 3.2 Falta de created_by em sla_demandas

**Severidade:** 🔴 CRÍTICA  
**Status:** ❌ Não Implementado

**Problema:**
- Não há coluna `created_by` para rastrear quem criou o ticket
- Campo `solicitante` é texto livre, não referência a usuário
- Impossível auditar criação de tickets

**Correção Recomendada:**
```sql
-- Adicionar coluna (sem quebrar existentes)
ALTER TABLE sla_demandas 
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Trigger para preencher automaticamente
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_sla_demandas_created_by
BEFORE INSERT ON sla_demandas
FOR EACH ROW EXECUTE FUNCTION set_created_by();
```

**Prioridade:** 🔴 Alta  
**Prazo:** 3 dias

---

### 3.3 Falta de Soft Delete

**Severidade:** 🔴 CRÍTICA  
**Status:** ❌ Não Implementado

**Problema:**
- DELETE é permanente em `sla_demandas`
- Apenas Super Admin pode deletar (bom)
- Mas sem possibilidade de recuperação

**Correção Recomendada:**
```sql
-- Adicionar colunas de soft delete
ALTER TABLE sla_demandas 
ADD COLUMN deleted_at TIMESTAMPTZ,
ADD COLUMN deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN deletion_reason TEXT;

-- Índice para queries
CREATE INDEX idx_sla_demandas_deleted_at 
ON sla_demandas(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Função de soft delete
CREATE OR REPLACE FUNCTION soft_delete_ticket(
  p_ticket_id UUID,
  p_reason TEXT DEFAULT 'Não informado'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN := FALSE;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Apenas Super Admins podem excluir tickets';
  END IF;
  
  IF LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Motivo da exclusão deve ter pelo menos 10 caracteres';
  END IF;
  
  UPDATE sla_demandas
  SET 
    deleted_at = now(),
    deleted_by = auth.uid(),
    deletion_reason = p_reason
  WHERE id = p_ticket_id
    AND deleted_at IS NULL;
    
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  -- Log da ação
  INSERT INTO sla_action_logs (sla_id, acao, autor_id, autor_email, dados_anteriores)
  SELECT 
    p_ticket_id,
    'soft_delete',
    auth.uid(),
    (SELECT email FROM profiles WHERE user_id = auth.uid()),
    to_jsonb(sla_demandas.*)
  FROM sla_demandas WHERE id = p_ticket_id;
  
  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atualizar RLS para esconder deletados
DROP POLICY IF EXISTS "sla_demandas_select_all_authenticated" ON sla_demandas;

CREATE POLICY "sla_demandas_select_active" ON sla_demandas
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND deleted_at IS NULL
);

-- Policy separada para admins verem deletados
CREATE POLICY "sla_demandas_select_deleted_admin" ON sla_demandas
FOR SELECT USING (
  is_admin()
  AND deleted_at IS NOT NULL
);
```

**Prioridade:** 🔴 Alta  
**Prazo:** 3 dias

---

### 3.4 Edge Functions sem Autenticação

**Severidade:** 🔴 CRÍTICA  
**Status:** ❌ Não Corrigido

**Problema:**
```toml
# supabase/config.toml
[functions.generate-sla-tags]
verify_jwt = false  # PERIGOSO

[functions.cleanup-old-records]
verify_jwt = false  # PERIGOSO

[functions.reset-password]
verify_jwt = false  # OK (precisa ser público)
```

**Risco:**
- `cleanup-old-records` usa SERVICE_ROLE_KEY
- Qualquer pessoa pode acionar limpeza de dados
- Potencial perda de dados

**Correção Recomendada:**
```toml
[functions.generate-sla-tags]
verify_jwt = true

[functions.cleanup-old-records]
verify_jwt = true

[functions.reset-password]
verify_jwt = false  # Mantém público (com validação interna)
```

E adicionar verificação de admin nas funções:
```typescript
// Em cleanup-old-records/index.ts
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

// Verificar se é admin
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (profile?.role !== 'super_admin') {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
}
```

**Prioridade:** 🔴 Imediata  
**Prazo:** 24 horas

---

## 🟡 4. VULNERABILIDADES MÉDIAS

### 4.1 search_path não Definido

**Problema:**
```sql
-- Função sem search_path
create_bidirectional_ticket_link() -- config: NOT SET
```

**Correção:**
```sql
ALTER FUNCTION public.create_bidirectional_ticket_link() 
SET search_path = public;
```

---

### 4.2 OTP com Expiração Longa

**Problema:** Tokens OTP excedem limite recomendado de 5-10 minutos.

**Correção:** Acessar Supabase Dashboard → Authentication → URL Configuration → Reduzir tempo.

---

### 4.3 Leaked Password Protection Desabilitado

**Problema:** Usuários podem usar senhas conhecidamente comprometidas.

**Correção:** Supabase Dashboard → Authentication → Settings → Habilitar "Leaked Password Protection"

---

### 4.4 PostgreSQL com Patches Disponíveis

**Problema:** Versão do PostgreSQL tem atualizações de segurança.

**Correção:** Agendar atualização via Supabase Dashboard.

---

## 📊 5. ESTATÍSTICAS ATUAIS

### 5.1 Distribuição de Usuários

| user_type | role | ativo | total |
|-----------|------|-------|-------|
| administrador_master | super_admin | ✅ | 3 |
| administrador_master | viewer | ✅ | 3 |
| colaborador_setor | super_admin | ✅ | 8 |
| colaborador_setor | operador | ✅ | 11 |
| colaborador_setor | viewer | ✅ | 5 |

**Total:** 30 usuários ativos

### 5.2 Análise de Roles

⚠️ **Inconsistência Detectada:**
- 3 usuários são `administrador_master` mas têm role `viewer`
- 8 usuários são `colaborador_setor` mas têm role `super_admin`

**Recomendação:** Alinhar `user_type` com `role` ou consolidar em um único campo.

---

## 🔧 6. PLANO DE AÇÃO

### Fase 1 - Crítico (Imediato - 24h)

| # | Ação | Status | Responsável |
|---|------|--------|-------------|
| 1 | Corrigir policy de notifications INSERT | ⏳ Pendente | - |
| 2 | Habilitar verify_jwt em edge functions | ⏳ Pendente | - |
| 3 | Adicionar auth check em cleanup-old-records | ⏳ Pendente | - |

### Fase 2 - Alto (1 semana)

| # | Ação | Status | Responsável |
|---|------|--------|-------------|
| 4 | Adicionar coluna created_by em sla_demandas | ⏳ Pendente | - |
| 5 | Implementar soft delete | ⏳ Pendente | - |
| 6 | Corrigir search_path das funções | ⏳ Pendente | - |
| 7 | Habilitar Leaked Password Protection | ⏳ Pendente | - |

### Fase 3 - Médio (2-4 semanas)

| # | Ação | Status | Responsável |
|---|------|--------|-------------|
| 8 | Atualizar PostgreSQL | ⏳ Pendente | - |
| 9 | Reduzir tempo OTP | ⏳ Pendente | - |
| 10 | Alinhar user_type com role | ⏳ Pendente | - |

---

## 🔄 7. ROLLBACK PLAN

### Em Caso de Falha Catastrófica

```sql
-- PASSO 1: Restaurar policy original de notifications
DROP POLICY IF EXISTS "notifications_insert_system_only" ON notifications;
CREATE POLICY "Allow system to create notifications for any user" ON notifications
FOR INSERT WITH CHECK (true);

-- PASSO 2: Remover colunas de soft delete
ALTER TABLE sla_demandas 
DROP COLUMN IF EXISTS deleted_at,
DROP COLUMN IF EXISTS deleted_by,
DROP COLUMN IF EXISTS deletion_reason;

-- PASSO 3: Remover coluna created_by
ALTER TABLE sla_demandas 
DROP COLUMN IF EXISTS created_by;

-- PASSO 4: Reverter edge functions
-- Editar supabase/config.toml e restaurar verify_jwt = false
```

---

## ✅ 8. CHECKLIST DE VALIDAÇÃO

### Antes de Implementar

- [ ] Backup do banco realizado
- [ ] Ambiente de teste validado
- [ ] Rollback plan documentado
- [ ] Stakeholders notificados

### Durante Implementação

- [ ] Cada mudança testada em transação
- [ ] Logs monitorados
- [ ] Funcionalidades críticas validadas

### Após Implementação

- [ ] Todos os testes passaram
- [ ] Score de segurança recalculado
- [ ] Documentação atualizada
- [ ] Monitoramento configurado

---

## 📝 9. NOTAS IMPORTANTES

### ⚠️ .gitignore

**IMPORTANTE:** Adicione ao `.gitignore`:

```gitignore
# Documentos de segurança - NÃO PUBLICAR
docs/DEVSECOPS_REPORT.md
docs/SECURITY_IMPLEMENTATION_REPORT.md
docs/00_mapeamento_banco_atual.md
docs/*security*.md
docs/*SECURITY*.md
```

O arquivo `.gitignore` é read-only neste projeto. **Você deve atualizar manualmente** antes de fazer commit.

### ⚠️ Dados de Produção

Este sistema está em **PRODUÇÃO** com 30 usuários ativos e dados reais.
Todas as mudanças devem ser testadas em transação antes de commit.

---

**Última Atualização:** 02/02/2026  
**Próxima Revisão:** 09/02/2026  
**Versão do Documento:** 1.0
