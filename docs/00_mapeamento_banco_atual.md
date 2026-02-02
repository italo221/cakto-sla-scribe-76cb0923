# 🗃️ Mapeamento do Banco de Dados Atual

> ⚠️ **DOCUMENTO CONFIDENCIAL** - NÃO PUBLICAR NO GITHUB
> 
> Este documento contém informações sensíveis sobre a estrutura do banco de dados.
> Adicione ao `.gitignore` antes de fazer commit.

**Data do Mapeamento:** 02/02/2026  
**Sistema:** SLA / Cakto SLA Scribe  
**Projeto Supabase:** `hnqsgjblwuffgpksfyyh`

---

## 📊 Resumo das Tabelas

| Tabela | Propósito | RLS Habilitado |
|--------|-----------|----------------|
| `profiles` | Perfis de usuários | ✅ Sim |
| `sla_demandas` | Tickets/Demandas | ✅ Sim |
| `sla_comentarios_internos` | Comentários em tickets | ✅ Sim |
| `sla_action_logs` | Logs de ações | ✅ Sim |
| `setores` | Departamentos/Times | ✅ Sim |
| `user_setores` | Vínculo usuário-setor | ✅ Sim |
| `notifications` | Notificações | ✅ Sim |
| `cargos` | Cargos/Funções | ✅ Sim |
| `permissoes_cargo` | Permissões por cargo | ✅ Sim |
| `setor_permissoes` | Permissões por setor | ✅ Sim |
| `organized_tags` | Tags organizadas | ✅ Sim |
| `ticket_attachments` | Anexos de tickets | ✅ Sim |
| `ticket_external_links` | Links externos | ✅ Sim |
| `subtickets` | Sub-tickets | ✅ Sim |
| `sla_policies` | Políticas SLA | ✅ Sim |
| `comment_reactions` | Reações a comentários | ✅ Sim |
| `leads` | Dados de leads | ✅ Sim |
| `user_kyc` | KYC de usuários | ✅ Sim |
| `user_profits` | Lucros de usuários | ✅ Sim |
| `password_recovery_tokens` | Tokens de recuperação | ✅ Sim |
| `password_recovery_audit` | Auditoria de recuperação | ✅ Sim |
| `logs_permissoes` | Logs de permissões | ✅ Sim |
| `system_settings` | Configurações do sistema | ✅ Sim |

---

## 👤 Tabela: profiles

### Estrutura

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | NO | - |
| `email` | text | NO | - |
| `nome_completo` | text | NO | - |
| `user_type` | USER-DEFINED (user_type) | NO | 'colaborador_setor' |
| `ativo` | boolean | NO | true |
| `created_at` | timestamp with time zone | NO | now() |
| `updated_at` | timestamp with time zone | NO | now() |
| `role` | USER-DEFINED (user_role) | NO | 'viewer' |
| `cargo_id` | uuid | YES | - |
| `telefone` | text | YES | - |
| `avatar_url` | text | YES | - |
| `navbar_position` | text | YES | 'top' |
| `navbar_glass` | boolean | YES | false |

### Enums Relacionados

```sql
-- user_type
CREATE TYPE user_type AS ENUM ('administrador_master', 'colaborador_setor');

-- user_role  
CREATE TYPE user_role AS ENUM ('super_admin', 'operador', 'viewer');
```

### Políticas RLS

| Policy | Comando | Condição |
|--------|---------|----------|
| `profiles_select_for_mentions` | SELECT | `COALESCE(ativo, true)` |
| `profiles_update_consolidated` | UPDATE | `is_super_admin() OR auth.uid() = user_id` |
| `profiles_insert_super_admin` | INSERT | `is_super_admin()` |

### Triggers

| Trigger | Evento | Função |
|---------|--------|--------|
| `update_profiles_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |
| `validate_role_changes` | BEFORE UPDATE | `validate_profile_role_change()` |

### Estatísticas de Usuários

| user_type | role | ativo | total |
|-----------|------|-------|-------|
| administrador_master | super_admin | true | 3 |
| administrador_master | viewer | true | 3 |
| colaborador_setor | super_admin | true | 8 |
| colaborador_setor | operador | true | 11 |
| colaborador_setor | viewer | true | 5 |

**Total de Usuários Ativos:** 30

---

## 🎫 Tabela: sla_demandas

### Estrutura

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | gen_random_uuid() |
| `titulo` | text | NO | - |
| `time_responsavel` | text | NO | - |
| `solicitante` | text | NO | - |
| `descricao` | text | NO | - |
| `pontuacao_financeiro` | integer | NO | - |
| `pontuacao_cliente` | integer | NO | - |
| `pontuacao_reputacao` | integer | NO | - |
| `pontuacao_urgencia` | integer | NO | - |
| `pontuacao_operacional` | integer | NO | - |
| `pontuacao_total` | integer | NO | - |
| `nivel_criticidade` | text | NO | - |
| `observacoes` | text | YES | - |
| `status` | text | NO | 'aberto' |
| `data_criacao` | timestamp with time zone | NO | now() |
| `arquivos` | jsonb | YES | - |
| `tags` | ARRAY | YES | - |
| `ticket_number` | text | YES | - |
| `setor_id` | uuid | YES | - |
| `prioridade_operacional` | USER-DEFINED | YES | 'media' |
| `prazo_interno` | timestamp with time zone | YES | - |
| `responsavel_interno` | text | YES | - |
| `updated_at` | timestamp with time zone | YES | now() |
| `tipo_ticket` | text | NO | 'bug' |
| `link_referencia` | text | YES | - |
| `anexos` | jsonb | YES | '[]' |
| `resolved_at` | timestamp with time zone | YES | - |
| `assignee_user_id` | uuid | YES | - |
| `first_in_progress_at` | timestamp with time zone | YES | - |

### Políticas RLS

| Policy | Comando | Condição |
|--------|---------|----------|
| `sla_demandas_select_all_authenticated` | SELECT | `auth.uid() IS NOT NULL` |
| `sla_demandas_insert_authenticated` | INSERT | `auth.uid() IS NOT NULL` |
| `sla_demandas_update_authenticated_users` | UPDATE | `auth.uid() IS NOT NULL` |
| `sla_delete_super_admin_new` | DELETE | `is_super_admin()` |

### ⚠️ Observações de Segurança

- **SELECT muito permissivo**: Todos os usuários autenticados podem ver TODOS os tickets
- **Falta created_by**: Não há rastreamento de quem criou o ticket
- **Falta deleted_at**: Não há soft delete implementado

---

## 🔧 Funções do Banco

### Funções de Autorização

| Função | Security | search_path |
|--------|----------|-------------|
| `is_super_admin()` | DEFINER | `""` (vazio) |
| `is_admin(user_uuid?)` | DEFINER | `""` |
| `has_role(_user_id, _role)` | DEFINER | `""` |
| `can_edit()` | DEFINER | `""` |
| `user_has_setor_access(setor_id)` | DEFINER | `""` |

### Funções de Negócio

| Função | Security | search_path |
|--------|----------|-------------|
| `generate_ticket_number()` | DEFINER | `""` |
| `validate_ticket_creation()` | DEFINER | `""` |
| `validate_profile_role_change()` | DEFINER | `public` ✅ |
| `generate_recovery_token()` | DEFINER | `public` ✅ |
| `use_recovery_token()` | DEFINER | `public` ✅ |

### ⚠️ Funções com search_path NÃO Definido

```
create_bidirectional_ticket_link - NOT SET
```

---

## 🛡️ Políticas RLS com `true` (Permissivas)

| Tabela | Policy | Tipo | Risco |
|--------|--------|------|-------|
| `comment_reactions` | Users can view... | SELECT | 🟢 Baixo (leitura pública OK) |
| `lib_link_clicks` | Public can insert... | INSERT | 🟡 Médio (analytics) |
| `lib_themes` | lib_themes are public... | SELECT | 🟢 Baixo (temas são públicos) |
| `notifications` | Allow system to create... | INSERT | 🔴 **CRÍTICO** |
| `password_recovery_audit` | System can insert... | INSERT | 🟡 Médio (logs de sistema) |
| `ticket_external_link_views` | Anyone can insert... | INSERT | 🟡 Médio (analytics) |

### 🔴 CRÍTICO: notifications INSERT

A política `Allow system to create notifications for any user` permite INSERT com `WITH CHECK (true)`, o que significa que **qualquer usuário autenticado pode criar notificações para qualquer outro usuário**.

**Risco:**
- Spam de notificações
- Phishing interno
- Negação de serviço

---

## 📊 Alertas do Linter Supabase

| Nível | Alerta | Quantidade |
|-------|--------|------------|
| WARN | Function Search Path Mutable | 1 |
| WARN | RLS Policy Always True | 4 |
| WARN | Auth OTP long expiry | 1 |
| WARN | Leaked Password Protection Disabled | 1 |
| WARN | Postgres version has security patches | 1 |

---

## ✅ Funcionalidades de Segurança Já Implementadas

1. **Trigger de proteção de role**: `validate_role_changes` impede que usuários não-admin alterem roles
2. **Funções is_super_admin/is_admin**: Centralizadas e com SECURITY DEFINER
3. **RLS habilitado**: Todas as tabelas principais têm RLS
4. **Sistema de recuperação de senha**: Com tokens, rate limiting e auditoria
5. **Logs de ações**: `sla_action_logs` e `logs_permissoes` para auditoria

---

## ❌ Vulnerabilidades Identificadas

### 🔴 Críticas

1. **notifications INSERT permissivo** - Qualquer usuário pode criar notificação para qualquer outro
2. **sla_demandas SELECT muito aberto** - Todos veem todos os tickets (pode ser intencional)
3. **Falta soft delete** - Exclusões são permanentes
4. **Falta created_by em tickets** - Não há rastreamento de autoria

### 🟡 Médias

1. **search_path não definido** em `create_bidirectional_ticket_link`
2. **OTP com expiração longa**
3. **Leaked Password Protection desabilitado**
4. **PostgreSQL com patches disponíveis**

### 🟢 Baixas

1. **Políticas `true` em SELECT** - Aceitável para dados públicos

---

## 📋 Relacionamentos (Foreign Keys)

```
profiles.cargo_id → cargos.id
user_setores.user_id → profiles.user_id
user_setores.setor_id → setores.id
sla_demandas.setor_id → setores.id
sla_comentarios_internos.sla_id → sla_demandas.id
sla_comentarios_internos.autor_id → profiles.user_id
sla_comentarios_internos.setor_id → setores.id
ticket_attachments.ticket_id → sla_demandas.id
ticket_attachments.uploaded_by → profiles.user_id
subtickets.parent_ticket_id → sla_demandas.id
subtickets.child_ticket_id → sla_demandas.id
sla_policies.setor_id → setores.id
permissoes_cargo.cargo_id → cargos.id
setor_permissoes.setor_id → setores.id
organized_tags.sector_id → setores.id
organized_tags.team_id → setores.id
password_recovery_tokens.user_id → profiles.user_id
password_recovery_tokens.created_by → profiles.user_id
```

---

## 🔐 Edge Functions

| Função | verify_jwt | Status |
|--------|------------|--------|
| `generate-sla-tags` | false | ⚠️ Sem auth |
| `cleanup-old-records` | false | ⚠️ Sem auth |
| `reset-password` | false | ⚠️ Sem auth |
| `dashboard-insights` | true (default) | ✅ OK |

---

**Última Atualização:** 02/02/2026  
**Próxima Revisão:** 02/03/2026
