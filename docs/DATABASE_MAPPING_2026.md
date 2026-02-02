# Mapeamento Completo do Banco de Dados

> **DOCUMENTO INTERNO** - Contém estrutura sensível do banco de produção.
> Atualizado em: 02/02/2026

---

## Visão Geral

O banco utiliza **Supabase** (PostgreSQL) com:
- **RLS (Row Level Security)** habilitado em todas as tabelas
- **Soft Delete** para tickets (`deleted_at`, `deleted_by`, `deletion_reason`)
- **Views** para facilitar consultas (ex: `sla_demandas_deleted`, `profiles_for_mentions`)
- **Funções SQL** para operações críticas (ex: `soft_delete_ticket`, `restore_ticket`)

**Project ID:** `hnqsgjblwuffgpksfyyh`

---

## Índice

1. [Tabelas Principais](#tabelas-principais)
2. [Tabelas de Segurança](#tabelas-de-segurança)
3. [Tabelas de Configuração](#tabelas-de-configuração)
4. [Views](#views)
5. [Funções SQL](#funções-sql)
6. [Políticas RLS por Tabela](#políticas-rls-por-tabela)

---

## Tabelas Principais

### `sla_demandas` (Tickets)

Tabela principal de tickets/demandas do sistema.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ticket_number` | text | ✅ | `generate_ticket_number()` | Número legível (SLA-0001) |
| `titulo` | text | ❌ | - | Título do ticket |
| `descricao` | text | ❌ | - | Descrição detalhada |
| `status` | text | ❌ | `'aberto'` | aberto, em_andamento, resolvido, fechado, info_incompleta |
| `tipo_ticket` | text | ❌ | `'bug'` | bug, dúvida, sugestão, etc |
| `nivel_criticidade` | text | ❌ | - | P0, P1, P2, P3 |
| `pontuacao_total` | integer | ❌ | - | Score calculado |
| `pontuacao_operacional` | integer | ❌ | - | Componente do score |
| `pontuacao_urgencia` | integer | ❌ | - | Componente do score |
| `pontuacao_reputacao` | integer | ❌ | - | Componente do score |
| `pontuacao_cliente` | integer | ❌ | - | Componente do score |
| `pontuacao_financeiro` | integer | ❌ | - | Componente do score |
| `solicitante` | text | ❌ | - | Nome do solicitante |
| `time_responsavel` | text | ❌ | - | Time responsável |
| `responsavel_interno` | text | ✅ | - | Pessoa responsável |
| `assignee_user_id` | uuid | ✅ | - | FK para profiles (atribuído) |
| `setor_id` | uuid | ✅ | - | FK para setores |
| `prazo_interno` | timestamptz | ✅ | - | Deadline SLA |
| `prioridade_operacional` | enum | ✅ | `'media'` | baixa, media, alta, urgente |
| `tags` | text[] | ✅ | - | Array de tags |
| `link_referencia` | text | ✅ | - | Link externo |
| `anexos` | jsonb | ✅ | `'[]'` | Anexos legados |
| `arquivos` | jsonb | ✅ | - | Arquivos |
| `observacoes` | text | ✅ | - | Notas adicionais |
| `data_criacao` | timestamptz | ❌ | `now()` | Data de criação |
| `updated_at` | timestamptz | ✅ | `now()` | Última atualização |
| `first_in_progress_at` | timestamptz | ✅ | - | Primeiro "em andamento" |
| `resolved_at` | timestamptz | ✅ | - | Data de resolução |
| `created_by` | uuid | ✅ | - | Criador (user_id) |
| `deleted_at` | timestamptz | ✅ | - | **Soft delete** timestamp |
| `deleted_by` | uuid | ✅ | - | **Soft delete** autor |
| `deletion_reason` | text | ✅ | - | **Soft delete** motivo |
| `deletion_type` | text | ✅ | - | Tipo de exclusão |

**Índices:**
- PK: `id`
- Unique: `ticket_number`
- FK: `setor_id` → `setores.id`

---

### `sla_comentarios_internos` (Comentários)

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `sla_id` | uuid | ❌ | - | FK para sla_demandas |
| `autor_id` | uuid | ❌ | - | FK para profiles |
| `autor_nome` | text | ❌ | - | Nome do autor (cache) |
| `setor_id` | uuid | ❌ | - | FK para setores |
| `comentario` | text | ❌ | - | Conteúdo do comentário |
| `anexos` | jsonb | ✅ | `'[]'` | Anexos do comentário |
| `created_at` | timestamptz | ❌ | `now()` | Data de criação |
| `updated_at` | timestamptz | ✅ | `now()` | Última edição |

---

### `profiles` (Usuários)

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `user_id` | uuid | ❌ | - | FK para auth.users |
| `email` | text | ❌ | - | Email do usuário |
| `nome_completo` | text | ❌ | - | Nome completo |
| `telefone` | text | ✅ | - | Telefone |
| `avatar_url` | text | ✅ | - | URL do avatar |
| `role` | enum | ❌ | `'viewer'` | viewer, admin, super_admin |
| `user_type` | enum | ❌ | `'colaborador_setor'` | Tipo de usuário |
| `cargo_id` | uuid | ✅ | - | FK para cargos |
| `ativo` | boolean | ❌ | `true` | Status ativo |
| `navbar_position` | text | ✅ | `'top'` | Posição da navbar |
| `navbar_glass` | boolean | ✅ | `false` | Efeito glass |
| `created_at` | timestamptz | ❌ | `now()` | Data de criação |
| `updated_at` | timestamptz | ❌ | `now()` | Última atualização |
| `migrated_at` | timestamptz | ✅ | - | Data de migração |
| `migrated_from` | text | ✅ | - | Origem da migração |

---

### `setores` (Times/Setores)

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `nome` | text | ❌ | - | Nome do setor |
| `descricao` | text | ✅ | - | Descrição |
| `ativo` | boolean | ❌ | `true` | Status ativo |
| `created_at` | timestamptz | ❌ | `now()` | Criação |
| `updated_at` | timestamptz | ❌ | `now()` | Atualização |

---

### `user_setores` (Membros de Times)

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `user_id` | uuid | ❌ | - | FK para profiles |
| `setor_id` | uuid | ❌ | - | FK para setores |
| `is_leader` | boolean | ❌ | `false` | É líder do time |
| `created_at` | timestamptz | ❌ | `now()` | Criação |

---

### `subtickets` (Relacionamento Pai-Filho)

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `parent_ticket_id` | uuid | ❌ | - | FK ticket pai |
| `child_ticket_id` | uuid | ❌ | - | FK ticket filho (unique) |
| `sequence_number` | integer | ❌ | - | Número sequencial |
| `created_by` | uuid | ❌ | - | Criador |
| `created_at` | timestamptz | ❌ | `now()` | Criação |

---

## Tabelas de Segurança

### `email_allowlist` (Controle de Acesso por Email)

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `email` | text | ❌ | - | Email controlado |
| `status` | text | ❌ | - | pending, approved, rejected, revoked |
| `approved_by` | uuid | ✅ | - | Quem aprovou |
| `approved_at` | timestamptz | ✅ | - | Data de aprovação |
| `rejected_by` | uuid | ✅ | - | Quem rejeitou |
| `rejected_at` | timestamptz | ✅ | - | Data de rejeição |
| `rejection_reason` | text | ✅ | - | Motivo da rejeição |
| `revoked_by` | uuid | ✅ | - | Quem revogou |
| `revoked_at` | timestamptz | ✅ | - | Data de revogação |
| `revocation_reason` | text | ✅ | - | Motivo da revogação |
| `created_at` | timestamptz | ✅ | `now()` | Criação |
| `updated_at` | timestamptz | ✅ | `now()` | Atualização |

**RLS:** Apenas Super Admins (`is_super_admin()`)

---

### `password_recovery_tokens`

Tokens para recuperação de senha gerenciados por admins.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `user_id` | uuid | ❌ | - | Usuário alvo |
| `token_hash` | text | ❌ | - | Hash do token |
| `created_by` | uuid | ❌ | - | Admin que criou |
| `expires_at` | timestamptz | ❌ | - | Expiração |
| `used_at` | timestamptz | ✅ | - | Data de uso |
| `invalidated_at` | timestamptz | ✅ | - | Data de invalidação |
| `invalidated_reason` | text | ✅ | - | Motivo |
| `ip_address` | inet | ✅ | - | IP de criação |
| `user_agent` | text | ✅ | - | User agent |
| `created_at` | timestamptz | ❌ | `now()` | Criação |

---

### `password_recovery_audit`

Log de auditoria de recuperações de senha.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `user_id` | uuid | ❌ | - | Usuário afetado |
| `actor_id` | uuid | ✅ | - | Quem executou |
| `actor_email` | text | ✅ | - | Email do executor |
| `action` | text | ❌ | - | Ação executada |
| `token_id` | uuid | ✅ | - | Token relacionado |
| `ip_address` | inet | ✅ | - | IP |
| `user_agent` | text | ✅ | - | User agent |
| `details` | jsonb | ✅ | - | Detalhes extras |
| `created_at` | timestamptz | ❌ | `now()` | Timestamp |

---

### `audit_logs`

Log geral de auditoria do sistema.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `table_name` | text | ✅ | - | Tabela afetada |
| `record_id` | uuid | ✅ | - | ID do registro |
| `action` | text | ❌ | - | INSERT/UPDATE/DELETE |
| `old_data` | jsonb | ✅ | - | Dados anteriores |
| `new_data` | jsonb | ✅ | - | Dados novos |
| `user_id` | uuid | ✅ | - | Usuário |
| `ip_address` | inet | ✅ | - | IP |
| `created_at` | timestamptz | ✅ | `now()` | Timestamp |

---

## Tabelas de Configuração

### `cargos` (Cargos/Funções)

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | ❌ | `gen_random_uuid()` |
| `nome` | text | ❌ | - |
| `descricao` | text | ✅ | - |
| `ativo` | boolean | ❌ | `true` |
| `created_at` | timestamptz | ❌ | `now()` |
| `updated_at` | timestamptz | ❌ | `now()` |

---

### `permissoes_cargo` (Permissões por Cargo)

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | ❌ | `gen_random_uuid()` |
| `cargo_id` | uuid | ❌ | - |
| `pode_criar_ticket` | boolean | ❌ | `false` |
| `pode_editar_ticket` | boolean | ❌ | `false` |
| `pode_excluir_ticket` | boolean | ❌ | `false` |
| `pode_comentar` | boolean | ❌ | `false` |
| `pode_editar_comentario` | boolean | ❌ | `false` |
| `pode_excluir_comentario` | boolean | ❌ | `false` |
| `pode_editar_comentario_proprio` | boolean | ❌ | `true` |

---

### `setor_permissoes` (Permissões por Setor)

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | ❌ | `gen_random_uuid()` |
| `setor_id` | uuid | ❌ | - |
| `pode_criar_ticket` | boolean | ❌ | `false` |
| `pode_editar_ticket` | boolean | ❌ | `false` |
| `pode_excluir_ticket` | boolean | ❌ | `false` |
| `pode_comentar` | boolean | ❌ | `false` |
| `pode_resolver_ticket` | boolean | ❌ | `false` |

---

### `sla_policies` (Políticas SLA por Setor)

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | ❌ | `gen_random_uuid()` |
| `setor_id` | uuid | ❌ | - |
| `mode` | enum | ❌ | `'FIXO'` |
| `p0_hours` | integer | ❌ | `4` |
| `p1_hours` | integer | ❌ | `24` |
| `p2_hours` | integer | ❌ | `72` |
| `p3_hours` | integer | ❌ | `168` |
| `allow_superadmin_override` | boolean | ❌ | `true` |
| `created_by` | uuid | ✅ | - |
| `updated_by` | uuid | ✅ | - |

---

### `system_settings` (Configurações Globais)

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | ❌ | `gen_random_uuid()` |
| `setting_key` | text | ❌ | - |
| `setting_value` | jsonb | ❌ | - |
| `created_by` | uuid | ✅ | - |
| `updated_by` | uuid | ✅ | - |

---

## Views

### `sla_demandas_active`

Tickets **não excluídos** (`deleted_at IS NULL`).

```sql
SELECT * FROM sla_demandas WHERE deleted_at IS NULL;
```

### `sla_demandas_deleted`

Tickets **excluídos** com informações do autor da exclusão.

```sql
SELECT 
  d.*,
  p.nome_completo AS deleted_by_name,
  p.email AS deleted_by_email
FROM sla_demandas d
LEFT JOIN profiles p ON p.user_id = d.deleted_by
WHERE d.deleted_at IS NOT NULL;
```

### `profiles_for_mentions`

View segura para menções (sem expor PII sensível).

```sql
SELECT 
  user_id,
  nome_completo,
  avatar_url,
  CASE WHEN ativo THEN 'active' ELSE 'inactive' END AS status
FROM profiles
WHERE ativo = true;
```

---

## Funções SQL

### Funções de Verificação

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `is_super_admin()` | boolean | Verifica se é Super Admin |
| `is_admin(user_uuid?)` | boolean | Verifica se é Admin |
| `has_role(_role)` | boolean | Verifica role específica |
| `can_edit()` | boolean | Verifica permissão de edição |
| `user_has_setor_access(setor_id)` | boolean | Verifica acesso ao setor |

### Funções de Ticket

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `generate_ticket_number()` | - | text | Gera número SLA-XXXX |
| `soft_delete_ticket(p_ticket_id, p_reason)` | uuid, text | boolean | Exclusão lógica |
| `restore_ticket(p_ticket_id, p_restore_reason)` | uuid, text | boolean | Restaura ticket |
| `delete_ticket_cascade(ticket_id)` | uuid | boolean | Exclusão física (cascata) |
| `get_inbox_tickets_ordered(...)` | múltiplos | table | Lista ordenada com paginação |

### Funções de Subticket

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `get_next_subticket_sequence(p_parent_ticket_id)` | uuid | integer | Próximo número sequencial |
| `backfill_legacy_subtickets()` | - | void | Migração de subtickets legados |

### Funções de Segurança

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `generate_recovery_token(p_target_user_id, p_expiration_minutes?)` | uuid, int | json | Gera token de recuperação |
| `check_recovery_rate_limit(...)` | text, text, int?, int? | boolean | Rate limiting |
| `check_account_lockout(...)` | uuid, int?, int? | json | Verifica bloqueio |
| `cleanup_old_recovery_attempts()` | - | void | Limpa tentativas antigas |

### Funções de Tags

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `get_hidden_tags()` | - | text[] | Lista tags ocultas |
| `add_hidden_tag(p_tag)` | text | boolean | Adiciona tag oculta |
| `get_organized_tags(...)` | uuid?, uuid?, bool? | table | Tags organizadas |
| `get_tag_team_assignments()` | - | json | Atribuições de tags |

### Funções de Comentário

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `add_sla_comment(p_comentario, p_setor_id, p_sla_id)` | text, uuid, uuid | uuid | Adiciona comentário |

### Funções Auxiliares

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `generate_share_token()` | - | text | Token para compartilhamento |
| `get_user_stats(user_email)` | text | table | Estatísticas do usuário |
| `log_audit(...)` | múltiplos | void | Registra auditoria |

---

## Políticas RLS por Tabela

### `sla_demandas`

| Policy | Command | Expressão |
|--------|---------|-----------|
| `sla_demandas_select_all_authenticated` | SELECT | `auth.uid() IS NOT NULL` |
| `sla_demandas_select_deleted` | SELECT | `deleted_at IS NOT NULL AND auth.uid() IS NOT NULL` |
| `sla_demandas_insert_authenticated` | INSERT | `auth.uid() IS NOT NULL` |
| `sla_demandas_update_restricted` | UPDATE | `deleted_at IS NULL AND (is_super_admin() OR created_by = auth.uid())` |
| ❌ DELETE | - | **Não permitido** (usar `soft_delete_ticket`) |

### `profiles`

| Policy | Command | Expressão |
|--------|---------|-----------|
| `profiles_select_for_mentions` | SELECT | `COALESCE(ativo, true)` |
| `profiles_update_consolidated` | UPDATE | `is_super_admin() OR auth.uid() = user_id` |
| `profiles_insert_super_admin` | INSERT | `is_super_admin()` |
| ❌ DELETE | - | **Não permitido** |

### `email_allowlist`

| Policy | Command | Expressão |
|--------|---------|-----------|
| `allowlist_admin_only` | ALL | `is_super_admin()` |

### `sla_comentarios_internos`

| Policy | Command | Expressão |
|--------|---------|-----------|
| `sla_comentarios_select_all_authenticated` | SELECT | `auth.uid() IS NOT NULL` |
| `comentarios_insert_authenticated` | INSERT | `auth.uid() = autor_id AND auth.uid() IS NOT NULL` |
| `comentarios_update_admin_or_own` | UPDATE | `is_admin() OR auth.uid() = autor_id` |
| `comentarios_delete_admin_or_own` | DELETE | `is_admin() OR auth.uid() = autor_id` |

### `notifications`

| Policy | Command | Expressão |
|--------|---------|-----------|
| `Users can view their own notifications` | SELECT | `auth.uid() = user_id` |
| `Users can update their own notifications` | UPDATE | `auth.uid() = user_id` |
| `notifications_insert_restricted` | INSERT | `is_super_admin() OR user_id = auth.uid()` |
| ❌ DELETE | - | **Não permitido** |

---

## Enums

### `user_role`
- `viewer`
- `admin`
- `super_admin`

### `user_type`
- `colaborador_setor`
- `gestor`
- `externo`

### `sla_mode`
- `FIXO`
- `DINAMICO`

### `prioridade_operacional`
- `baixa`
- `media`
- `alta`
- `urgente`

### `sla_level`
- `P0`
- `P1`
- `P2`
- `P3`

### `sla_event_action`
- `SET`
- `CHANGE`
- `CLEAR`

### `link_type`
- `link`
- `social`
- `header`

---

## Triggers

### `sla_demandas`

| Trigger | Evento | Descrição |
|---------|--------|-----------|
| `set_ticket_number` | BEFORE INSERT | Gera número sequencial |
| `track_first_in_progress` | BEFORE UPDATE | Registra primeiro "em andamento" |
| `set_resolved_at` | BEFORE UPDATE | Registra data de resolução |
| `protect_created_by` | BEFORE UPDATE | Impede alteração do criador |

### `profiles`

| Trigger | Evento | Descrição |
|---------|--------|-----------|
| `prevent_self_role_escalation` | BEFORE UPDATE | Impede auto-promoção |

---

## Changelog

| Data | Alteração |
|------|-----------|
| 02/02/2026 | Documento criado com mapeamento completo pós-implementações de segurança |
| - | Adicionada tabela `email_allowlist` |
| - | Implementado Soft Delete em `sla_demandas` |
| - | Views `sla_demandas_active` e `sla_demandas_deleted` |
| - | Funções `soft_delete_ticket()` e `restore_ticket()` |
| - | RLS consolidado com políticas restritivas |
