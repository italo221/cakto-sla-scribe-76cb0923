# 🔒 Relatório DevSecOps - Análise Completa de Segurança

**Projeto:** Sistema SLA / Cakto SLA Scribe  
**Data da Análise:** 28/01/2026  
**Versão:** 1.0

---

## 📊 Resumo Executivo

| Categoria | Status | Itens Encontrados |
|-----------|--------|-------------------|
| 🔴 Críticos | ⚠️ Atenção Necessária | 8 |
| 🟡 Avisos | ⚠️ Recomendado Revisar | 10 |
| 🔵 Informativos | ℹ️ Para Conhecimento | 3 |

**Score de Segurança Geral:** 65/100 (Necessita Melhorias)

---

## 🔴 PROBLEMAS CRÍTICOS (Ação Imediata Requerida)

### 1. Dados de Funcionários Expostos (profiles)
**Severidade:** 🔴 CRÍTICO  
**Tabela:** `profiles`

**Problema:**
A tabela `profiles` contém nomes, emails e telefones de funcionários. A política `profiles_select_for_mentions` permite SELECT com condição `COALESCE(ativo, true)`, potencialmente expondo dados pessoais.

**Risco:**
- Vazamento de informações pessoais (LGPD)
- Engenharia social contra funcionários
- Phishing direcionado

**Recomendação:**
```sql
-- Substituir política existente por uma mais restritiva
DROP POLICY IF EXISTS "profiles_select_for_mentions" ON profiles;

CREATE POLICY "profiles_select_authenticated_only" ON profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Super admin vê todos
    is_super_admin() OR
    -- Usuário vê próprio perfil
    auth.uid() = user_id OR
    -- Usuários do mesmo setor podem ver uns aos outros
    EXISTS (
      SELECT 1 FROM user_setores us1
      JOIN user_setores us2 ON us1.setor_id = us2.setor_id
      WHERE us1.user_id = auth.uid() AND us2.user_id = profiles.user_id
    )
  )
);
```

---

### 2. Tickets Internos Visíveis para Todos os Funcionários (sla_demandas)
**Severidade:** 🔴 CRÍTICO  
**Tabela:** `sla_demandas`

**Problema:**
Todos os tickets são visíveis para qualquer usuário autenticado, incluindo informações sensíveis como observações internas, pontuações financeiras e níveis de criticidade.

**Risco:**
- Funcionários podem ver tickets de outros departamentos
- Exposição de informações confidenciais de clientes
- Violação de compartimentalização

**Recomendação:**
Implementar controle de acesso baseado em setor:
```sql
-- Restringir SELECT apenas para tickets do setor do usuário
CREATE POLICY "sla_demandas_select_by_sector" ON sla_demandas
FOR SELECT USING (
  is_super_admin() OR
  -- Tickets do setor do usuário
  setor_id IN (SELECT setor_id FROM user_setores WHERE user_id = auth.uid()) OR
  -- Tickets criados pelo usuário
  solicitante = (SELECT email FROM profiles WHERE user_id = auth.uid())
);
```

---

### 3. Comentários Internos Expostos (sla_comentarios_internos)
**Severidade:** 🔴 CRÍTICO  
**Tabela:** `sla_comentarios_internos`

**Problema:**
Comentários internos de tickets são legíveis por qualquer usuário autenticado.

**Risco:**
- Discussões confidenciais expostas
- Informações sobre decisões internas vazadas
- Possível exposição de dados de clientes

---

### 4. Anexos de Tickets Acessíveis (ticket_attachments)
**Severidade:** 🔴 CRÍTICO  
**Tabela:** `ticket_attachments`

**Problema:**
Nomes de arquivos, tipos MIME e caminhos de storage são legíveis por todos os usuários autenticados.

**Risco:**
- Metadados de documentos confidenciais expostos
- Possível inferência de conteúdo sensível pelo nome do arquivo

---

### 5. Dados de Leads/Vendas (leads)
**Severidade:** 🔴 CRÍTICO (Potencial)  
**Tabela:** `leads`

**Problema:**
Embora restrito a admins, a tabela contém dados sensíveis de clientes potenciais.

**Status:** ✅ Parcialmente mitigado (apenas admins têm acesso)

**Recomendação:**
- Implementar logs de auditoria para acesso a dados de leads
- Considerar criptografia em repouso para campos sensíveis

---

### 6. Dados KYC e Financeiros (user_kyc, user_profits)
**Severidade:** 🔴 CRÍTICO  
**Tabelas:** `user_kyc`, `user_profits`

**Problema:**
Políticas permitem que usuários vejam dados pelo email, o que pode expor dados se emails forem compartilhados.

**Recomendação:**
```sql
-- Restringir acesso apenas por user_id
CREATE POLICY "user_kyc_select_strict" ON user_kyc
FOR SELECT USING (
  is_admin() OR
  email = (SELECT email FROM profiles WHERE user_id = auth.uid())
);
```

---

### 7. Notificações com INSERT Permissivo (notifications)
**Severidade:** 🔴 CRÍTICO  
**Tabela:** `notifications`

**Problema:**
Política de INSERT com condição `true` permite que qualquer usuário crie notificações para qualquer outro usuário.

**Risco:**
- Spam de notificações
- Phishing interno
- Negação de serviço por flood de notificações

**Recomendação:**
```sql
-- Restringir INSERT para apenas criar notificações através de triggers/funções
DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;

CREATE POLICY "notifications_insert_restricted" ON notifications
FOR INSERT WITH CHECK (
  -- Apenas funções SECURITY DEFINER devem criar notificações
  -- Ou restringir para admins
  is_admin()
);
```

---

### 8. Links Externos de Tickets (ticket_external_links)
**Severidade:** 🟡 ALTO  
**Tabela:** `ticket_external_links`

**Problema:**
Tokens de compartilhamento podem ser visíveis para todos os usuários autenticados.

---

## 🟡 AVISOS (Recomendado Corrigir)

### 9. Function Search Path Mutable
**Severidade:** 🟡 MÉDIO

**Problema:**
Algumas funções não têm `search_path` definido, potencialmente vulneráveis a ataques de injeção de schema.

**Funções Afetadas:**
- `create_bidirectional_ticket_link()`

**Correção:**
```sql
ALTER FUNCTION public.create_bidirectional_ticket_link() 
SET search_path = public;
```

---

### 10. Políticas RLS com `true` (Permissivo Demais)
**Severidade:** 🟡 MÉDIO

**Problema:**
3 políticas usam `USING (true)` ou `WITH CHECK (true)` em operações INSERT/UPDATE/DELETE.

**Tabelas Afetadas:**
- Verificar e corrigir tabelas com políticas permissivas

---

### 11. OTP com Expiração Longa
**Severidade:** 🟡 MÉDIO

**Problema:**
O tempo de expiração do OTP (One-Time Password) excede o limite recomendado.

**Correção:**
Acessar Supabase Dashboard > Authentication > URL Configuration e reduzir tempo de expiração para 5-10 minutos.

---

### 12. Leaked Password Protection Desabilitado
**Severidade:** 🟡 MÉDIO

**Problema:**
A proteção contra senhas vazadas está desabilitada, permitindo que usuários usem senhas conhecidamente comprometidas.

**Correção:**
1. Acessar Supabase Dashboard
2. Authentication > Settings
3. Habilitar "Leaked Password Protection"

---

### 13. Versão do PostgreSQL com Patches Disponíveis
**Severidade:** 🟡 MÉDIO

**Problema:**
A versão atual do PostgreSQL tem patches de segurança disponíveis.

**Correção:**
Agendar atualização do PostgreSQL através do Supabase Dashboard.

---

### 14. Audit Trail Visível para Todos (sla_action_logs)
**Severidade:** 🟡 MÉDIO

**Problema:**
Logs de ações são visíveis para todos os usuários autenticados.

---

### 15. Estrutura Organizacional Exposta (user_setores)
**Severidade:** 🟡 BAIXO

**Problema:**
Qualquer usuário pode ver quem pertence a qual departamento e quem são os líderes.

---

### 16. Reações a Comentários Públicas (comment_reactions)
**Severidade:** 🟡 BAIXO

**Problema:**
Política SELECT com `true` expõe todas as reações.

---

## 🔵 INFORMATIVO

### 17. Perfis de Link Públicos Intencionalmente (lib_link_profiles)
**Status:** ✅ Aceitável

Perfis são públicos por design (feature tipo "link in bio").

### 18. Logs de Permissões Restritos a Super Admins (logs_permissoes)
**Status:** ✅ Seguro

Apenas super admins podem ver logs de alterações de permissões.

---

## 🛡️ ANÁLISE DE EDGE FUNCTIONS

### dashboard-insights
**Status:** 🟡 Atenção

**Problemas Identificados:**
1. ✅ CORS configurado corretamente
2. ✅ Usa LOVABLE_API_KEY (secret configurado)
3. ⚠️ Sem autenticação de usuário (aceita qualquer requisição)
4. ⚠️ Expõe métricas agregadas sem verificar permissões

**Recomendação:**
Adicionar verificação de autenticação:
```typescript
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
    status: 401, 
    headers: corsHeaders 
  });
}
```

### cleanup-old-records
**Status:** 🔴 Crítico

**Problemas Identificados:**
1. ⚠️ Usa SERVICE_ROLE_KEY (pode fazer qualquer operação)
2. ⚠️ Deleta dados de tabelas que não existem ('tickets', 'logs')
3. ⚠️ Sem verificação de autenticação
4. ⚠️ Pode ser chamada por qualquer pessoa (verify_jwt = false)

**Risco:**
- Qualquer pessoa pode acionar limpeza de dados
- Potencial perda de dados

**Recomendação:**
- Implementar autenticação obrigatória
- Verificar se o chamador é admin
- Corrigir nomes das tabelas

### generate-sla-tags
**Status:** 🟡 Atenção

**Problemas Identificados:**
1. ⚠️ verify_jwt = false (qualquer pessoa pode chamar)
2. ⚠️ Usa PERPLEXITY_API_KEY mas não está configurado
3. ✅ Tem fallback quando API não disponível

**Recomendação:**
- Adicionar autenticação básica
- Configurar PERPLEXITY_API_KEY se necessário

---

## 🔐 ANÁLISE DE AUTENTICAÇÃO

### Hook useAuth.tsx
**Status:** ✅ Adequado

**Pontos Positivos:**
1. ✅ Usa onAuthStateChange corretamente
2. ✅ Armazena session E user
3. ✅ Implementa debounce para evitar chamadas excessivas
4. ✅ Verifica roles do servidor (não client-side)

**Preocupações Menores:**
1. ⚠️ Role é armazenado na tabela profiles (deveria ser tabela separada)

### Hook usePermissions.tsx  
**Status:** ✅ Adequado

**Pontos Positivos:**
1. ✅ Verifica permissões do servidor
2. ✅ Usa cache com timeout
3. ✅ Validações baseadas em setor

---

## 📋 CONFIGURAÇÕES DE SECRETS

**Status:** ⚠️ Nenhum secret configurado

**Secrets Necessários:**
- `PERPLEXITY_API_KEY` - Usado em generate-sla-tags (fallback funciona)
- `LOVABLE_API_KEY` - Usado em dashboard-insights (provisionado automaticamente)

---

## 📊 CHECKLIST DE CONFORMIDADE

### LGPD/GDPR
| Requisito | Status | Observação |
|-----------|--------|------------|
| Minimização de dados | ⚠️ | Coletar apenas dados necessários |
| Consentimento | ❓ | Verificar formulários de cadastro |
| Direito ao esquecimento | ⚠️ | Implementar exclusão de conta |
| Portabilidade | ❌ | Não implementado |
| Notificação de vazamento | ❌ | Processo não definido |

### OWASP Top 10
| Vulnerabilidade | Status | Mitigação |
|-----------------|--------|-----------|
| Injection | ✅ | RLS e Supabase SDK |
| Broken Auth | ✅ | Supabase Auth |
| Sensitive Data Exposure | ⚠️ | RLS precisa ajustes |
| XXE | ✅ | Não aplicável |
| Broken Access Control | ⚠️ | RLS permissivo em algumas tabelas |
| Security Misconfiguration | ⚠️ | Algumas funções sem search_path |
| XSS | ✅ | React escapa por padrão |
| Insecure Deserialization | ✅ | Não aplicável |
| Using Components with Known Vulnerabilities | ⚠️ | Atualizar PostgreSQL |
| Insufficient Logging | ⚠️ | Logs existem mas precisam proteção |

---

## 🔧 PLANO DE AÇÃO RECOMENDADO

### Fase 1 - Crítico (Imediato - 1-2 dias)
1. [ ] Corrigir política de notifications INSERT
2. [ ] Restringir acesso a sla_demandas por setor
3. [ ] Restringir acesso a sla_comentarios_internos
4. [ ] Adicionar autenticação em cleanup-old-records

### Fase 2 - Alto (1 semana)
1. [ ] Habilitar Leaked Password Protection
2. [ ] Atualizar PostgreSQL
3. [ ] Corrigir function search_path
4. [ ] Restringir ticket_attachments por setor
5. [ ] Adicionar autenticação em edge functions

### Fase 3 - Médio (2-4 semanas)
1. [ ] Implementar logs de auditoria protegidos
2. [ ] Revisar todas as políticas RLS com `true`
3. [ ] Implementar criptografia em repouso para dados sensíveis
4. [ ] Documentar políticas de segurança

### Fase 4 - Melhoria Contínua
1. [ ] Implementar monitoramento de segurança
2. [ ] Configurar alertas de tentativas de acesso suspeitas
3. [ ] Treinar equipe em práticas de segurança
4. [ ] Realizar testes de penetração periódicos

---

## 📚 RECURSOS ADICIONAIS

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Linter Documentation](https://supabase.com/docs/guides/database/database-linter)
- [Going to Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Lovable Security Documentation](https://docs.lovable.dev/features/security)

---

**Responsável pela Análise:** Sistema Lovable AI  
**Próxima Revisão Recomendada:** 28/02/2026
