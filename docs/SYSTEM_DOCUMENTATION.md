# Sistema de Gestão de Tickets - Manhattan

## Documentação Técnica e Funcional Completa

**Versão:** 2.1.0  
**Data:** Janeiro 2025  
**Última Atualização:** 30/01/2025

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Funcionalidades Principais](#2-funcionalidades-principais)
3. [Estrutura de Dados](#3-estrutura-de-dados)
4. [Interface e Experiência do Usuário (UI/UX)](#4-interface-e-experiência-do-usuário-uiux)
5. [Stack Técnico](#5-stack-técnico)
6. [Componentes Reutilizáveis](#6-componentes-reutilizáveis)
7. [Regras de Negócio Importantes](#7-regras-de-negócio-importantes)
8. [Pontos de Melhoria Conhecidos](#8-pontos-de-melhoria-conhecidos)
9. [Métricas e Analytics](#9-métricas-e-analytics)
10. [Configurações e Personalização](#10-configurações-e-personalização)
11. [Diagramas](#11-diagramas)

---

## 1. Visão Geral do Sistema

### 1.1 Propósito Principal e Objetivos

O **Sistema Manhattan** é uma plataforma moderna de gestão de tickets desenvolvida para:

- **Centralizar demandas**: Unificar todas as solicitações de diferentes setores em um único sistema
- **Priorização automática**: Calcular criticidade com base em pontuação multidimensional
- **Rastreamento de SLA**: Monitorar prazos e identificar atrasos automaticamente
- **Colaboração eficiente**: Permitir comunicação entre equipes através de comentários e menções
- **Visibilidade gerencial**: Fornecer dashboards e métricas para tomada de decisão

### 1.2 Usuários-Alvo e Papéis/Permissões

#### Tipos de Usuário (Roles)

| Role | Descrição | Permissões |
|------|-----------|------------|
| **Super Admin** | Administrador master com acesso total | Criar/Editar/Excluir tickets, gerenciar usuários, setores, permissões, personalização do sistema |
| **Operador** | Usuário colaborador que pode criar e editar | Criar tickets, editar tickets próprios ou do setor (se líder), comentar |
| **Viewer** | Usuário apenas visualização | Visualizar dashboard, sem acesso a criação/edição |
| **Líder de Setor** | Operador com permissões extras no seu setor | Editar/Excluir tickets do seu setor, gerenciar equipe |

#### Tipos de Usuário (User Types)

| User Type | Descrição |
|-----------|-----------|
| `administrador_master` | Administrador do sistema com poderes totais |
| `colaborador_setor` | Colaborador associado a um ou mais setores |

### 1.3 Fluxo Geral de Uso

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    ABERTO       │────▶│  EM ANDAMENTO   │────▶│    RESOLVIDO    │────▶│     FECHADO     │
│                 │     │                 │     │                 │     │                 │
│ • Ticket criado │     │ • Em trabalho   │     │ • Aguardando    │     │ • Finalizado    │
│ • Aguardando    │     │ • Atribuído     │     │   confirmação   │     │ • Arquivado     │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Fluxo Detalhado:**

1. **Criação**: Usuário cria ticket selecionando setor, definindo título, descrição, impacto e tipo
2. **Triagem**: Sistema calcula automaticamente criticidade (P0-P3) baseada no impacto
3. **Atribuição**: Ticket fica disponível para o setor responsável
4. **Trabalho**: Membro do setor inicia o trabalho (status: Em Andamento)
5. **Resolução**: Trabalho concluído (status: Resolvido)
6. **Fechamento**: Solicitante confirma resolução (status: Fechado)

---

## 2. Funcionalidades Principais

### 2.1 Criação de Tickets

#### Campos Disponíveis

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `setor` | Select | ✓ | Setor responsável pelo ticket |
| `titulo` | Text (max 100) | ✓ | Resumo conciso do ticket |
| `descricao` | Textarea | ✓ | Descrição detalhada (mín. 10 caracteres) |
| `impacto` | Select | ✓ | Nível de impacto (determina criticidade) |
| `tipo_ticket` | Select | ✓ | Tipo do ticket |
| `tags` | Multi-select | ✓ (1+) | Tags para categorização |
| `link_referencia` | URL | ✗ | Link relacionado (opcional) |
| `anexos` | Files | ✗ | Arquivos anexados |

#### Tipos de Ticket Disponíveis

- Solicitação de tarefa
- Reporte de problema (Bug)
- Dúvida técnica
- Feedback/sugestão
- Atualização de projeto

#### Níveis de Impacto e Pontuação

| Impacto | Pontos | Criticidade Gerada |
|---------|--------|-------------------|
| Risco grave (multas, prejuízo financeiro) | 25 | P0 - Crítico |
| Prejuízo médio (retrabalho, atrasos) | 15 | P1 - Alto |
| Impacto leve (importante, não urgente) | 10 | P2 - Médio |
| Sem impacto direto (informacional) | 5 | P3 - Baixo |
| Não sei avaliar | 8 | P2 - Médio |

#### Anexos Permitidos

- **Imagens**: PNG, JPG, JPEG, WebP
- **Documentos**: PDF
- **Vídeos**: MP4, WebM
- **Limite**: 10MB por arquivo, máximo 3 arquivos

### 2.2 Gestão de Tickets

#### Edição

- Super Admin pode editar qualquer ticket
- Líder do setor pode editar tickets do seu setor
- Operador pode editar apenas tickets que criou
- Campo `solicitante` não é editável (mantém criador original)

#### Atribuição (Assignee)

- Tickets podem ser atribuídos a um usuário específico do setor
- Exibido como avatar no card do ticket
- Seletor disponível no modal de detalhes

#### Priorização

Sistema de criticidade automático baseado em pontuação:

| Criticidade | Descrição | SLA Padrão |
|-------------|-----------|------------|
| P0 | Crítico | 4 horas |
| P1 | Alto | 24 horas |
| P2 | Médio | 3 dias |
| P3 | Baixo | 7 dias |

#### Categorização

- **Por Setor**: Ticket pertence ao setor responsável
- **Por Tags**: Tags customizáveis por setor ou globais
- **Por Tipo**: Categorização por natureza do ticket
- **Por Status**: Organização pelo estado atual

### 2.3 Workflow/Status

#### Estados Possíveis

| Status | Código | Descrição |
|--------|--------|-----------|
| Aberto | `aberto` | Ticket recém-criado, aguardando início |
| Em Andamento | `em_andamento` | Ticket sendo trabalhado |
| Resolvido | `resolvido` | Trabalho concluído, aguardando confirmação |
| Fechado | `fechado` | Ticket finalizado e arquivado |

#### Transições Permitidas

```
aberto ──────────▶ em_andamento
   │                    │
   │                    ▼
   │              resolvido
   │                    │
   └───────────────────▼
                   fechado
```

#### Validações de Transição

- Apenas membros do setor responsável podem iniciar/resolver tickets
- Apenas solicitante, membro do setor ou líder podem fechar tickets
- Super Admin pode realizar qualquer transição

### 2.4 Comentários/Comunicação

#### Sistema de Comentários

- Comentários associados ao ticket e setor do autor
- Suporte a **menções** com `@usuario`
- Editor rich-text com formatação
- Anexos por comentário (mesmo limite de uploads)

#### Menções (@)

- Autocomplete de usuários ao digitar `@`
- Notificação automática para usuário mencionado
- Destaque visual nas menções (highlight)

#### Reações

- Sistema de likes/reações em comentários
- Tipos: like, heart, etc.

### 2.5 Busca e Filtros

#### Critérios de Busca

- **Texto livre**: Busca em título, descrição, solicitante, time, ticket_number
- **Busca por palavras parciais**: Cada palavra é pesquisada independentemente
- **Busca em comentários**: Pesquisa também nos comentários do ticket

#### Filtros Disponíveis

| Filtro | Descrição |
|--------|-----------|
| Status | Filtrar por estado do ticket |
| Setor | Filtrar por setor responsável |
| Criticidade | Filtrar por nível P0-P3 |
| Usuário/Assignee | Filtrar por quem está atribuído |
| Tipo | Filtrar por tipo de ticket |
| Data | Filtrar por período |
| Tags | Filtrar por tags específicas |

#### Ordenação

- Por data de criação (mais recente/antigo)
- Por criticidade (mais crítico primeiro)
- Por pontuação total
- Por status (abertos primeiro)

### 2.6 Dashboard/Visualizações

#### Métricas Exibidas (KPIs)

| KPI | Descrição |
|-----|-----------|
| Total de Tickets | Contagem geral |
| Abertos | Tickets aguardando início |
| Em Andamento | Tickets em trabalho |
| Resolvidos | Tickets concluídos |
| Fechados | Tickets arquivados |
| Atrasados | Tickets que excederam SLA |
| Críticos (P0) | Tickets de alta prioridade |

#### Gráficos

- **Distribuição por Status**: Gráfico de pizza/barras
- **Distribuição por Prioridade**: Visualização de criticidade
- **Tags mais usadas**: Top tags por frequência
- **Tempo de resolução (SLA)**: Média de tempo por setor/prioridade
- **Tendência de criação**: Tickets criados ao longo do tempo

#### Relatórios

- Relatório de auditoria de ticket individual
- Exportação em PDF com histórico completo
- Logs de ações detalhados

### 2.7 Notificações

#### Tipos de Notificação

| Tipo | Trigger | Canal |
|------|---------|-------|
| Menção | Usuário mencionado em comentário | In-app, Bell icon |
| Atribuição | Ticket atribuído ao usuário | In-app |
| Status | Mudança de status em ticket relevante | In-app |
| Comentário | Novo comentário em ticket do usuário | In-app |

#### Canais

- **In-app**: Central de notificações (sino no header)
- Notificações marcáveis como lidas
- Badge contador de não lidas

### 2.8 Integrações

#### Supabase (Backend)

- **Autenticação**: Email/senha com Supabase Auth
- **Database**: PostgreSQL gerenciado
- **Storage**: Bucket para anexos (privado)
- **Edge Functions**: Funções serverless

#### Edge Functions Disponíveis

| Função | Descrição |
|--------|-----------|
| `cleanup-old-records` | Limpeza de registros antigos (30 dias) |
| `dashboard-insights` | Insights do dashboard via AI |
| `generate-sla-tags` | Geração automática de tags SLA |
| `reset-password` | Recuperação de senha |

### 2.9 Permissões

#### Matriz de Permissões

| Ação | Super Admin | Líder Setor | Operador | Viewer |
|------|:-----------:|:-----------:|:--------:|:------:|
| Criar ticket | ✓ | ✓ | ✓ | ✗ |
| Editar próprio ticket | ✓ | ✓ | ✓ | ✗ |
| Editar ticket do setor | ✓ | ✓ | ✗ | ✗ |
| Editar qualquer ticket | ✓ | ✗ | ✗ | ✗ |
| Excluir ticket do setor | ✓ | ✓ | ✗ | ✗ |
| Excluir qualquer ticket | ✓ | ✗ | ✗ | ✗ |
| Comentar | ✓ | ✓ | ✓ | ✗ |
| Iniciar/Resolver ticket | ✓ | ✓* | ✓* | ✗ |
| Fechar ticket | ✓ | ✓* | ✓** | ✗ |
| Ver Dashboard | ✓ | ✓ | ✓ | ✓ |
| Gerenciar usuários | ✓ | ✗ | ✗ | ✗ |
| Gerenciar setores | ✓ | ✗ | ✗ | ✗ |
| Personalizar sistema | ✓ | ✗ | ✗ | ✗ |

`*` Apenas para tickets do seu setor  
`**` Apenas para tickets que criou

---

## 3. Estrutura de Dados

### 3.1 Modelo de Dados do Ticket

```typescript
interface Ticket {
  // Identificação
  id: string;                        // UUID único
  ticket_number: string;             // Número sequencial legível
  
  // Conteúdo
  titulo: string;                    // Título do ticket
  descricao: string;                 // Descrição detalhada
  observacoes?: string;              // Observações adicionais
  
  // Classificação
  tipo_ticket: string;               // Tipo (bug, feature, etc.)
  nivel_criticidade: string;         // P0, P1, P2, P3
  status: string;                    // aberto, em_andamento, resolvido, fechado
  tags?: string[];                   // Array de tags
  
  // Pontuação
  pontuacao_total: number;           // Soma das pontuações
  pontuacao_financeiro: number;      // Impacto financeiro
  pontuacao_cliente: number;         // Impacto no cliente
  pontuacao_reputacao: number;       // Impacto na reputação
  pontuacao_urgencia: number;        // Nível de urgência
  pontuacao_operacional: number;     // Impacto operacional
  
  // Relacionamentos
  setor_id?: string;                 // FK para setores
  time_responsavel: string;          // Nome do setor (legacy)
  solicitante: string;               // Email do criador
  assignee_user_id?: string;         // Usuário atribuído
  
  // SLA
  prazo_interno?: string;            // Prazo customizado (ISO date)
  prioridade_operacional?: string;   // Prioridade manual
  
  // Anexos
  anexos?: JSON;                     // Array de anexos (legacy)
  arquivos?: JSON;                   // Arquivos estruturados
  link_referencia?: string;          // URL de referência
  
  // Timestamps
  data_criacao: string;              // Data de criação
  updated_at?: string;               // Última atualização
  resolved_at?: string;              // Data de resolução
  first_in_progress_at?: string;     // Primeira vez em andamento
}
```

### 3.2 Relacionamentos Entre Entidades

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     profiles    │──────▶│   user_setores  │◀──────│     setores     │
│                 │       │                 │       │                 │
│ • user_id       │       │ • user_id (FK)  │       │ • id            │
│ • nome_completo │       │ • setor_id (FK) │       │ • nome          │
│ • email         │       │ • is_leader     │       │ • descricao     │
│ • role          │       └─────────────────┘       │ • ativo         │
│ • cargo_id      │                                 └────────┬────────┘
└────────┬────────┘                                          │
         │                                                   │
         │                 ┌─────────────────┐               │
         └────────────────▶│   sla_demandas  │◀──────────────┘
                           │    (tickets)    │
                           │                 │
                           │ • id            │
                           │ • setor_id (FK) │
                           │ • solicitante   │
                           │ • assignee_id   │
                           └────────┬────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐    ┌─────────────────────────┐    ┌─────────────────┐
│   subtickets    │    │ sla_comentarios_internos│    │ sla_action_logs │
│                 │    │                         │    │                 │
│ • parent_id     │    │ • sla_id (FK)           │    │ • sla_id (FK)   │
│ • child_id      │    │ • autor_id              │    │ • autor_id      │
│ • sequence      │    │ • comentario            │    │ • acao          │
└─────────────────┘    │ • anexos                │    │ • timestamp     │
                       └─────────────────────────┘    └─────────────────┘
```

### 3.3 Campos Customizáveis vs Fixos

| Campos Fixos | Campos Customizáveis |
|--------------|---------------------|
| id, ticket_number | tags |
| titulo, descricao | observacoes |
| status | prazo_interno |
| nivel_criticidade | prioridade_operacional |
| data_criacao | link_referencia |
| solicitante | assignee_user_id |

### 3.4 Sistema de Tags

- **Tags Globais**: Disponíveis para todos os setores
- **Tags por Setor**: Específicas de cada setor
- **Tag Especial**: `info-incompleta` (highlight amarelo)
- **Tags Ocultas**: Configuráveis por admin

#### Estrutura de Tags (organized_tags)

```typescript
interface OrganizedTag {
  id: string;
  name: string;
  is_global: boolean;
  sector_id?: string;
  team_id?: string;
  created_by?: string;
}
```

---

## 4. Interface e Experiência do Usuário (UI/UX)

### 4.1 Layout Geral

#### Estrutura de Navegação

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌──────────┐                                                       │
│  │          │  ┌─────────────────────────────────────────────────┐  │
│  │  Sidebar │  │                                                 │  │
│  │  Lateral │  │              Área de Conteúdo                   │  │
│  │          │  │                                                 │  │
│  │  • Logo  │  │                                                 │  │
│  │  • Nav   │  │                                                 │  │
│  │  • User  │  │                                                 │  │
│  │          │  │                                                 │  │
│  └──────────┘  └─────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Menu Principal (Sidebar)

| Item | Ícone | Rota | Visibilidade |
|------|-------|------|--------------|
| Criar Ticket | Plus | `/` | Operador+ |
| Dashboard | BarChart3 | `/dashboard` | Todos |
| Time | Users | `/time` | Operador+ |
| Caixa de Entrada | Inbox | `/inbox` | Operador+ |
| Kanban | Columns3 | `/kanban` | Operador+ |
| Melhorias | Lightbulb | `/melhorias` | Operador+ |
| Integrações | Settings | `/integrations` | Super Admin |
| Personalização | Palette | `/customization` | Super Admin |
| Admin | Shield | `/admin` | Super Admin |
| Documentação | BookOpen | `/documentation` | Todos |

### 4.2 Tela de Lista de Tickets (Inbox)

#### Colunas Exibidas

- Número do ticket
- Título
- Status (badge colorido)
- Prioridade (badge P0-P3)
- Solicitante
- Time responsável
- Data de criação
- Tags (chips)

#### Ações em Massa

- Seleção múltipla de tickets
- Filtros combinados
- Ordenação por múltiplos critérios

#### Visualizações

- **Lista**: Tabela tradicional
- **Kanban**: Colunas por status
- **Cards**: Grid de cards

### 4.3 Tela de Detalhes do Ticket (Modal)

```
┌─────────────────────────────────────────────────────────────────────┐
│  [X Fechar]                                              [Editar]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  #TICKET-001                          [P0 Crítico] [Em Andamento]   │
│                                                                     │
│  TÍTULO DO TICKET                                                   │
│  ─────────────────────────────────────────────────────────────      │
│                                                                     │
│  Descrição completa do ticket...                                    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ Solicitante │  │    Setor    │  │  Prazo SLA  │                  │
│  │  user@mail  │  │   TI/Dev    │  │  2h restam  │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Comentários]  [Histórico]                                         │
│  ───────────────────────────────                                    │
│                                                                     │
│  💬 Comentário 1...                                                 │
│  💬 Comentário 2...                                                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Digite um comentário... @mencionar                      [📎]│    │
│  └─────────────────────────────────────────────────────────[▶]─┘    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  [Iniciar] [Resolver] [Fechar] [Transferir]           [Compartilhar]│
└─────────────────────────────────────────────────────────────────────┘
```

### 4.4 Formulários

#### Design dos Campos

- Labels sempre acima do campo
- Indicador `*` para campos obrigatórios
- Contador de caracteres em campos de texto
- Mensagens de erro inline (vermelho)

#### Validações Inline

```typescript
// Exemplo de validação
if (!formData.titulo || formData.titulo.trim() === '') {
  errors.titulo = 'Campo obrigatório';
} else if (formData.titulo.trim().length < 3) {
  errors.titulo = 'Título deve ter pelo menos 3 caracteres';
}
```

### 4.5 Responsividade

#### Breakpoints

| Tamanho | Largura | Comportamento |
|---------|---------|---------------|
| Mobile | < 768px | Sidebar colapsada, layout vertical |
| Tablet | 768px - 1024px | Sidebar toggle, grid adaptativo |
| Desktop | > 1024px | Layout completo, sidebar expandida |
| TV | 1366px+ | Modo dashboard especial |

### 4.6 Acessibilidade

- Contraste WCAG AA
- Navegação por teclado
- ARIA labels em elementos interativos
- Focus visible em elementos focáveis
- Suporte a screen readers

### 4.7 Tema Visual

#### Paleta de Cores (Modo Claro)

```css
--primary: 142 76% 42%;        /* Verde Cakto */
--background: 240 10% 98%;     /* Cinza claro */
--foreground: 240 10% 10%;     /* Texto escuro */
--destructive: 0 84% 60%;      /* Vermelho erro */
--success: 142 76% 36%;        /* Verde sucesso */
--warning: 45 93% 47%;         /* Amarelo alerta */
```

#### Paleta de Cores (Modo Escuro)

```css
--primary: 142 76% 42%;        /* Verde Cakto (mantido) */
--background: 0 0% 4%;         /* Preto profundo */
--foreground: 0 0% 98%;        /* Texto claro */
--destructive: 348 100% 46%;   /* Vermelho #ec003f */
--card: 0 0% 6%;               /* Cards sutis */
```

#### Tipografia

- **Font Family**: Sistema padrão (system-ui, sans-serif)
- **Headings**: Font-weight 600-700
- **Body**: Font-weight 400
- **Monospace**: Números de ticket

### 4.8 Estados Vazios

```tsx
{tickets.length === 0 && (
  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
    Nenhum ticket nesta coluna
  </div>
)}
```

- Mensagens contextuais
- Ícones ilustrativos
- CTAs para ação (ex: "Criar primeiro ticket")

### 4.9 Loading States

```tsx
// Skeleton loading
<Skeleton className="h-4 w-full" />

// Spinner
<Loader2 className="h-4 w-4 animate-spin" />

// Progress bar
<Progress value={uploadProgress} />
```

---

## 5. Stack Técnico

### 5.1 Linguagens e Frameworks

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.x | Tipagem estática |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Estilização |

### 5.2 Bibliotecas Principais

#### UI Components

| Biblioteca | Uso |
|------------|-----|
| Radix UI | Componentes primitivos (Dialog, Dropdown, etc.) |
| Lucide React | Ícones |
| shadcn/ui | Sistema de componentes |
| class-variance-authority | Variantes de componentes |

#### State Management

| Biblioteca | Uso |
|------------|-----|
| @tanstack/react-query | Cache e sincronização de dados |
| React Context | Estado global (Auth, Config) |

#### Drag & Drop

| Biblioteca | Uso |
|------------|-----|
| @dnd-kit/core | Core do drag & drop |
| @dnd-kit/sortable | Listas ordenáveis |
| @dnd-kit/utilities | Utilitários CSS |

#### Formulários e Validação

| Biblioteca | Uso |
|------------|-----|
| react-hook-form | Gerenciamento de formulários |
| zod | Validação de schemas |
| @hookform/resolvers | Integração zod + react-hook-form |

#### Utilitários

| Biblioteca | Uso |
|------------|-----|
| date-fns | Manipulação de datas |
| clsx | Concatenação de classes |
| tailwind-merge | Merge de classes Tailwind |

### 5.3 Backend/Database

#### Supabase

- **PostgreSQL**: Banco de dados relacional
- **Auth**: Autenticação (email/senha)
- **Storage**: Armazenamento de arquivos
- **Edge Functions**: Serverless (Deno)
- **Realtime**: Subscriptions (desabilitado por performance)

#### Estrutura de Buckets

| Bucket | Acesso | Uso |
|--------|--------|-----|
| `tickets` | Privado | Anexos de tickets |
| `avatars` | Público | Fotos de perfil |

### 5.4 Autenticação e Autorização

#### Fluxo de Autenticação

```
1. Login com email/senha via Supabase Auth
2. Session token armazenado no localStorage
3. Profile carregado da tabela profiles
4. Setores carregados da tabela user_setores
5. Role determinado pelo campo profile.role
```

#### Row Level Security (RLS)

Todas as tabelas possuem políticas RLS:

```sql
-- Exemplo: Apenas admins podem gerenciar cargos
CREATE POLICY "Super admins can manage cargos" 
ON cargos FOR ALL 
USING (is_super_admin());
```

### 5.5 Hospedagem/Deployment

- **Frontend**: Lovable (Vercel under the hood)
- **Backend**: Supabase Cloud
- **URLs**:
  - Preview: `https://id-preview--{id}.lovable.app`
  - Production: `https://{project-name}.lovable.app`

---

## 6. Componentes Reutilizáveis

### 6.1 Componentes UI Base (shadcn/ui)

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| Button | `ui/button.tsx` | Botões com variantes |
| Card | `ui/card.tsx` | Containers de conteúdo |
| Dialog | `ui/dialog.tsx` | Modais |
| Input | `ui/input.tsx` | Campos de texto |
| Select | `ui/select.tsx` | Dropdowns |
| Badge | `ui/badge.tsx` | Tags/Labels |
| Toast | `ui/toast.tsx` | Notificações |
| Avatar | `ui/avatar.tsx` | Fotos de perfil |
| Tabs | `ui/tabs.tsx` | Navegação em abas |
| ScrollArea | `ui/scroll-area.tsx` | Área rolável customizada |

### 6.2 Componentes de Domínio

| Componente | Descrição |
|------------|-----------|
| `TicketKanban` | Board Kanban com drag & drop |
| `TicketDetailModal` | Modal completo de detalhes |
| `TicketEditModal` | Formulário de edição |
| `ManualTicketCreator` | Formulário de criação |
| `TicketAttachments` | Gerenciador de anexos |
| `TicketChat` | Sistema de comentários |
| `SubTicketsPanel` | Gerenciamento de sub-tickets |
| `SLADeadlineChip` | Indicador de prazo SLA |
| `NotificationCenter` | Central de notificações |
| `LateralSidebar` | Navegação lateral |

### 6.3 Hooks Customizados

| Hook | Descrição |
|------|-----------|
| `useAuth` | Autenticação e perfil do usuário |
| `usePermissions` | Verificação de permissões |
| `useOptimizedTickets` | Carregamento otimizado de tickets |
| `useOptimizedEgressV2` | Cache agressivo para reduzir egress |
| `useSLAPolicies` | Políticas de SLA por setor |
| `useFileUpload` | Upload de arquivos para Storage |
| `useNotifications` | Gerenciamento de notificações |
| `useTheme` | Toggle de tema claro/escuro |
| `useTags` | Gerenciamento de tags |
| `useTicketCountdown` | Countdown de SLA |

### 6.4 Padrões de Design

#### Compound Components

```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descrição</CardDescription>
  </CardHeader>
  <CardContent>
    Conteúdo
  </CardContent>
</Card>
```

#### Render Props / Children as Function

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir</Button>
  </DialogTrigger>
  <DialogContent>
    Conteúdo do modal
  </DialogContent>
</Dialog>
```

#### Custom Hooks com Cache

```typescript
const useOptimizedTickets = (options) => {
  const [tickets, setTickets] = useState([]);
  
  // Cache local de 15 minutos
  const cacheRef = useRef(new Map());
  
  const fetchTickets = useCallback(async () => {
    // Verificar cache antes de fetch
    if (cacheRef.current.has(key)) {
      return cacheRef.current.get(key);
    }
    // ... fetch e atualizar cache
  }, []);
  
  return { tickets, loading, fetchTickets };
};
```

---

## 7. Regras de Negócio Importantes

### 7.1 SLAs Configurados

#### Prazos Padrão por Criticidade

| Criticidade | Prazo | Descrição |
|-------------|-------|-----------|
| P0 | 4 horas | Emergência, sistema fora do ar |
| P1 | 24 horas | Urgente, impacto significativo |
| P2 | 72 horas (3 dias) | Importante, pode aguardar |
| P3 | 168 horas (7 dias) | Normal, baixa prioridade |

#### Customização por Setor

Super admins podem definir SLAs específicos por setor através da tabela `sla_policies`:

```typescript
interface SLAPolicy {
  setor_id: string;
  mode: 'FIXO' | 'DINAMICO';
  p0_hours: number;
  p1_hours: number;
  p2_hours: number;
  p3_hours: number;
  allow_superadmin_override: boolean;
}
```

### 7.2 Regras de Escalonamento

#### Cálculo de Atraso

```typescript
const isExpired = (() => {
  if (ticket.status === 'resolvido' || ticket.status === 'fechado') return false;
  
  let deadline;
  if (ticket.prazo_interno) {
    deadline = new Date(ticket.prazo_interno).getTime();
  } else {
    const startTime = new Date(ticket.data_criacao).getTime();
    const timeLimit = timeConfig[ticket.nivel_criticidade];
    deadline = startTime + timeLimit;
  }
  
  return Date.now() > deadline;
})();
```

#### Indicadores Visuais

- **Verde**: Dentro do prazo
- **Amarelo**: < 25% do prazo restante
- **Vermelho**: Atrasado

### 7.3 Validações Críticas

#### Criação de Ticket

1. Usuário deve estar logado
2. Usuário deve pertencer a pelo menos um setor
3. Todos os campos obrigatórios preenchidos
4. Pelo menos uma tag selecionada
5. Título com mínimo 3 caracteres
6. Descrição com mínimo 10 caracteres

#### Mudança de Status

1. Apenas membros do setor responsável podem iniciar/resolver
2. Validação de permissões antes de cada ação
3. Log automático de todas as alterações

### 7.4 Automações Implementadas

| Automação | Trigger | Ação |
|-----------|---------|------|
| Cálculo de Criticidade | Seleção de impacto | Definir P0-P3 automaticamente |
| Número de Ticket | Criação | Gerar número sequencial |
| Timestamp | Mudança de status | Registrar data/hora |
| Notificação | Menção em comentário | Criar notificação para usuário |
| Limpeza | Cron diário | Remover registros > 30 dias |

### 7.5 Retenção de Dados

- **Tickets**: 30 dias após fechamento
- **Logs**: 30 dias
- **Notificações**: 30 dias após leitura
- **Edge Function**: `cleanup-old-records` executa diariamente

---

## 8. Pontos de Melhoria Conhecidos

### 8.1 Limitações Atuais

| Limitação | Descrição | Impacto |
|-----------|-----------|---------|
| Realtime desabilitado | Causa 100k+ queries desnecessárias | Usuários precisam refresh manual |
| Sem notificações push | Apenas in-app | Usuários podem perder alertas |
| Sem integração email | Notificações não vão por email | Dependência de acesso ao sistema |
| Upload síncrono | Bloqueante durante upload | UX degradada em conexões lentas |

### 8.2 Feedback Comum dos Usuários

- "Preciso clicar em 'Carregar mais' muitas vezes no Kanban" → **Mitigado** (batch aumentado para 500)
- "Página recarrega ao fechar ticket" → **Corrigido** (handler otimizado)
- "Não sei quando tenho novas notificações" → Badge implementado
- "Busca poderia ser mais inteligente" → Busca por palavras parciais implementada

### 8.3 Tech Debt Identificado

| Item | Arquivo | Descrição |
|------|---------|-----------|
| Arquivo muito grande | `TicketDetailModal.tsx` (2250 linhas) | Refatorar em componentes menores |
| Arquivo muito grande | `index.css` (1776 linhas) | Separar em módulos |
| Cache duplicado | `useOptimizedTickets` + `useOptimizedEgressV2` | Unificar estratégia |
| Tipagem incompleta | Vários hooks | Adicionar tipos mais específicos |

### 8.4 Features Planejadas (Não Implementadas)

- [ ] Notificações por email
- [ ] Integração com Slack/Discord
- [ ] Relatórios exportáveis em Excel
- [ ] Dashboard customizável por usuário
- [ ] Templates de ticket por setor
- [ ] Workflow customizável
- [ ] SLA por tipo de ticket (além de setor)
- [ ] Automação de atribuição (round-robin)

---

## 9. Métricas e Analytics

### 9.1 Dados Rastreados

| Métrica | Fonte | Descrição |
|---------|-------|-----------|
| Total de tickets | `sla_demandas` | Contagem geral |
| Tickets por status | `sla_demandas.status` | Distribuição |
| Tickets por prioridade | `sla_demandas.nivel_criticidade` | Distribuição |
| Tempo médio de resolução | Cálculo | `resolved_at - data_criacao` |
| Tickets atrasados | Cálculo | Comparação prazo vs atual |
| Tags mais usadas | `sla_demandas.tags` | Frequência |

### 9.2 Relatórios Disponíveis

| Relatório | Localização | Formato |
|-----------|-------------|---------|
| Auditoria de Ticket | Modal de detalhes | PDF |
| Dashboard geral | `/dashboard` | Visual |
| Dashboard TV | `/tv-dashboard` | Visual fullscreen |

### 9.3 KPIs Monitorados

- **Taxa de resolução**: % tickets resolvidos no prazo
- **Tempo médio de primeira resposta**: Tempo até `em_andamento`
- **Backlog**: Total de tickets abertos
- **Throughput**: Tickets fechados por período
- **Distribuição por setor**: Volume por equipe

---

## 10. Configurações e Personalização

### 10.1 Configurações por Admin

#### Identidade Visual

| Config | Localização | Descrição |
|--------|-------------|-----------|
| Nome do Sistema | `/customization` | Alterar "Manhattan" |
| Logo | `/customization` | Upload de imagem |
| Cores Primárias | `system_settings` | Paleta customizada |

#### Gestão de Setores

| Config | Localização | Descrição |
|--------|-------------|-----------|
| Criar Setor | `/admin` → Setores | Nome e descrição |
| Ativar/Desativar | `/admin` → Setores | Toggle de status |
| Definir Líder | `/admin` → Setores → Gerenciar | 1 líder por setor |
| SLA do Setor | `/admin` → SLA Policies | Prazos customizados |

#### Gestão de Usuários

| Config | Localização | Descrição |
|--------|-------------|-----------|
| Criar Usuário | `/admin` → Usuários | Email e senha |
| Atribuir Setor | `/admin` → Usuários → Admin | Associar a setores |
| Alterar Role | `/admin` → Usuários | super_admin/operador/viewer |
| Ativar/Desativar | `/admin` → Usuários | Toggle de status |

### 10.2 Configurações por Setor

| Config | Descrição |
|--------|-----------|
| Tags do Setor | Tags específicas para uso interno |
| Membros | Usuários associados |
| Líder | Usuário com permissões extras |
| SLA | Prazos específicos |

### 10.3 Configurações por Usuário

| Config | Localização | Descrição |
|--------|-------------|-----------|
| Nome | Configurações de perfil | Nome de exibição |
| Avatar | Configurações de perfil | Foto de perfil |
| Tema | Toggle no header | Claro/Escuro |
| Posição Navbar | Customização | Top/Lateral |
| Efeito Glass | Customização | Blur na navbar |

---

## 11. Diagramas

### 11.1 Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTE (Browser)                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     React Application                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│  │
│  │  │   Context   │  │   Hooks     │  │      Components         ││  │
│  │  │ • Auth      │  │ • useAuth   │  │ • Pages                 ││  │
│  │  │ • SLA       │  │ • useTickets│  │ • UI Components         ││  │
│  │  │ • Config    │  │ • usePerms  │  │ • Domain Components     ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘│  │
│  │                              │                                  │  │
│  │                              ▼                                  │  │
│  │  ┌───────────────────────────────────────────────────────────┐│  │
│  │  │              Supabase Client (@supabase/supabase-js)       ││  │
│  │  └───────────────────────────────────────────────────────────┘│  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          SUPABASE CLOUD                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Auth     │  │  Database   │  │   Storage   │  │   Edge Fn   │ │
│  │             │  │ PostgreSQL  │  │   Buckets   │  │    Deno     │ │
│  │ • Login     │  │ • Tables    │  │ • tickets   │  │ • cleanup   │ │
│  │ • Session   │  │ • RLS       │  │ • avatars   │  │ • insights  │ │
│  │ • JWT       │  │ • Functions │  │             │  │ • sla-tags  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 Fluxo de Autenticação

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Login   │────▶│ Supabase Auth│────▶│    JWT       │────▶│   Session    │
│  Form    │     │   signIn()   │     │   Token      │     │  localStorage│
└──────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                   │
                                                                   ▼
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   App    │◀────│  AuthContext │◀────│   Profile    │◀────│   Supabase   │
│  Ready   │     │    user      │     │   + Setores  │     │    Query     │
└──────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 11.3 Fluxo de Criação de Ticket

```
┌─────────────┐
│  Formulário │
│   Preenchido│
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Validação  │────▶│   Erro?     │───Yes──▶ Mostrar mensagem
│   Local     │     │             │
└──────┬──────┘     └─────────────┘
       │ No
       ▼
┌─────────────┐
│  Calcular   │
│ Criticidade │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Sanitize   │────▶│  Validate   │
│    Data     │     │   Audit     │
└──────┬──────┘     └──────┬──────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────────┐
│         INSERT Supabase          │
│        sla_demandas              │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│      Persistir Anexos           │
│   ticket_attachments + storage   │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│        Sucesso!                  │
│     Navegar para Inbox           │
└─────────────────────────────────┘
```

### 11.4 Modelo de Dados (ER Simplificado)

```
┌─────────────────┐       ┌─────────────────┐
│     profiles    │       │     setores     │
├─────────────────┤       ├─────────────────┤
│ PK user_id      │       │ PK id           │
│    email        │       │    nome         │
│    nome_completo│       │    descricao    │
│    role         │       │    ativo        │
│ FK cargo_id     │       └────────┬────────┘
└────────┬────────┘                │
         │                         │
         │    ┌────────────────────┴────────────────────┐
         │    │                                         │
         ▼    ▼                                         │
┌─────────────────┐                                     │
│  user_setores   │                                     │
├─────────────────┤                                     │
│ PK id           │                                     │
│ FK user_id      │                                     │
│ FK setor_id     │                                     │
│    is_leader    │                                     │
└─────────────────┘                                     │
                                                        │
                    ┌───────────────────────────────────┘
                    │
                    ▼
         ┌─────────────────┐
         │   sla_demandas  │
         ├─────────────────┤
         │ PK id           │
         │    ticket_number│
         │    titulo       │
         │    descricao    │
         │    status       │
         │    nivel_crit   │
         │ FK setor_id     │
         │    solicitante  │
         │ FK assignee_id  │
         │    prazo_interno│
         │    tags[]       │
         │    pontuacao_*  │
         │    timestamps   │
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┬─────────────────────┐
    │             │             │                     │
    ▼             ▼             ▼                     ▼
┌─────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────────┐
│subtickets│ │comentarios│ │action_logs│ │ticket_attachments│
├─────────┤ ├───────────┤ ├───────────┤ ├─────────────────┤
│PK id    │ │PK id      │ │PK id      │ │PK id            │
│FK parent│ │FK sla_id  │ │FK sla_id  │ │FK ticket_id     │
│FK child │ │FK autor_id│ │FK autor_id│ │FK comment_id    │
│sequence │ │comentario │ │acao       │ │file_name        │
└─────────┘ │anexos[]   │ │timestamp  │ │storage_path     │
            └───────────┘ │dados_*    │ │mime_type        │
                          └───────────┘ └─────────────────┘
```

---

## Apêndices

### A. Estrutura de Pastas do Projeto

```
src/
├── components/
│   ├── ui/                    # Componentes base (shadcn/ui)
│   ├── Navigation.tsx         # Navegação principal
│   ├── TicketKanban.tsx       # Kanban board
│   ├── TicketDetailModal.tsx  # Modal detalhado
│   ├── TicketEditModal.tsx    # Modal de edição
│   ├── ManualTicketCreator.tsx # Criação de tickets
│   ├── LateralSidebar.tsx     # Sidebar lateral
│   └── ...
├── pages/
│   ├── Index.tsx              # Dashboard principal
│   ├── Inbox.tsx              # Caixa de entrada
│   ├── Kanban.tsx             # Página do Kanban
│   ├── Admin.tsx              # Área administrativa
│   ├── Customization.tsx      # Personalização
│   ├── Auth.tsx               # Autenticação
│   └── ...
├── hooks/
│   ├── useAuth.tsx            # Autenticação
│   ├── usePermissions.tsx     # Permissões
│   ├── useOptimizedTickets.tsx # Tickets otimizados
│   └── ...
├── contexts/
│   ├── SLAPoliciesContext.tsx # Políticas SLA
│   └── SystemConfigContext.tsx # Configurações
├── lib/
│   ├── utils.ts               # Utilitários
│   ├── supabase-config.ts     # Configuração Supabase
│   └── performanceConfig.ts   # Configurações de performance
├── integrations/
│   └── supabase/
│       ├── client.ts          # Cliente Supabase
│       └── types.ts           # Tipos gerados
└── utils/
    ├── textFormatting.ts      # Formatação de texto
    ├── notificationService.ts # Serviço de notificações
    └── ticketAuditService.ts  # Auditoria de tickets

supabase/
├── config.toml                # Configuração local
├── functions/                 # Edge Functions
│   ├── cleanup-old-records/
│   ├── dashboard-insights/
│   ├── generate-sla-tags/
│   └── reset-password/
└── migrations/                # Migrações SQL
```

### B. Variáveis de Ambiente

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...

# Lovable AI Gateway (opcional)
LOVABLE_API_KEY=xxx
```

### C. Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Type check
npm run typecheck

# Supabase local
npx supabase start
npx supabase db reset

# Deploy Edge Functions
npx supabase functions deploy
```

---

*Documentação gerada automaticamente em 30/01/2025*  
*Sistema Manhattan v2.1.0*
