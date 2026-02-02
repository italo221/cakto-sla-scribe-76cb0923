# Mapeamento de Rotas do Sistema

> **DOCUMENTO INTERNO** - Contém informações sobre a estrutura do sistema.
> Atualizado em: 02/02/2026

## Visão Geral

O sistema utiliza React Router v6 para gerenciamento de rotas. As rotas são divididas em três categorias:
- **Públicas**: Acessíveis sem autenticação
- **Protegidas**: Requerem autenticação
- **Admin**: Requerem autenticação + permissão de Super Admin

---

## Rotas Públicas

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/auth` | `Auth` | Página de login/cadastro. Permite autenticação via email/senha. Redireciona usuários já logados. |
| `/reset-password` | `ResetPassword` | Página para redefinição de senha. Acessada via link enviado por email ou token gerado por admin. |
| `/share/:token` | `SharedTicket` | Visualização pública de ticket compartilhado. Aceita token único e opcionalmente senha. |

---

## Rotas Protegidas (Requerem Login)

### Página Inicial

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/` | `Index` | Landing page / página inicial do sistema. Exibe visão geral e acesso rápido às funcionalidades. |

### Gestão de Tickets

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/inbox` | `Inbox` | **Caixa de Entrada** - Lista principal de tickets com filtros por status (Abertos, Em Andamento, Resolvidos, Fechados, Atrasados, Críticos, Info Incompleta, Excluídos). Suporta busca, ordenação por criticidade/data e paginação. |
| `/kanban` | `Kanban` | **Visualização Kanban** - Tickets organizados em colunas por status. Permite drag-and-drop para mudança de status. |
| `/ticket/:ticketNumber` | `TicketPage` | **Detalhes do Ticket** - Visualização completa de um ticket específico pelo número (ex: `/ticket/SLA-0001`). |
| `/melhorias` | `Melhorias` | **Gestão de Melhorias** - Kanban específico para tickets do tipo "feedback/sugestão" e "atualização de projeto". Separado da caixa de entrada principal. |

### Dashboards e Métricas

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/dashboard` | `Dashboard` | **Dashboard Principal** - Métricas SLA, gráficos de desempenho, configuração de políticas SLA. Contém abas: Visão Geral, Métricas SLA, Políticas SLA. |
| `/dashboard/tv` | `TvDashboard` | **Dashboard TV** - Versão otimizada para exibição em televisores/monitores. Atualização automática, sem navegação lateral. |

### Gestão de Equipe

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/time` | `Time` | **Gestão de Equipe** - Visualização e gerenciamento de membros da equipe, setores e cargos. |

### Outros

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/integrations` | `Integrations` | **Integrações** - Configuração de integrações externas (webhooks, APIs, etc). |
| `/documentation` | `Documentation` | **Documentação** - Guias de uso do sistema, FAQ e tutoriais. |

---

## Rotas Administrativas (Requerem Super Admin)

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/admin` | `Admin` | **Painel Administrativo** - Gerenciamento completo do sistema incluindo: <br>• Usuários e permissões<br>• Setores e cargos<br>• Logs de atividades<br>• Email Allowlist<br>• Recuperação de senha de usuários |
| `/customization` | `Customization` | **Personalização** - Configurações visuais do sistema: cores, temas, navbar, logo. |

---

## Rota de Erro

| Rota | Componente | Descrição |
|------|------------|-----------|
| `*` (catch-all) | `NotFound` | Página 404 - Exibida quando uma rota não existe. |

---

## Arquitetura de Proteção

### ProtectedRoute
Componente wrapper que verifica:
1. Se o usuário está autenticado
2. Se tem permissão necessária (quando `requireSuperAdmin` está ativo)

```jsx
<ProtectedRoute>           // Apenas autenticação
<ProtectedRoute requireSuperAdmin>  // Autenticação + Super Admin
```

### AppLayout
Componente que envolve rotas protegidas e fornece:
- Navegação lateral (sidebar)
- Header com notificações
- Sistema de temas
- Contexto de configurações do sistema

---

## Parâmetros de URL Suportados

### `/inbox`
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `page` | number | Página atual da paginação |
| `pageSize` | number | Itens por página |
| `ticket` | uuid | ID do ticket para abrir modal automaticamente |

### `/share/:token`
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `:token` | string | Token único do link compartilhado |

### `/ticket/:ticketNumber`
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `:ticketNumber` | string | Número do ticket (ex: SLA-0001) |

---

## Fluxo de Navegação

```
                    ┌─────────────────────────────────────────────┐
                    │                   /auth                      │
                    │              (Login/Cadastro)                │
                    └─────────────────┬───────────────────────────┘
                                      │ Autenticado
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ROTAS PROTEGIDAS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌───────────┐   ┌───────────┐   │
│  │    /    │   │ /inbox  │   │ /kanban │   │ /melhorias│   │/dashboard │   │
│  │  Index  │──▶│  Lista  │──▶│  Board  │   │   Board   │   │  Métricas │   │
│  └─────────┘   └────┬────┘   └─────────┘   └───────────┘   └───────────┘   │
│                     │                                                        │
│                     ▼                                                        │
│              ┌─────────────┐                                                │
│              │/ticket/:num │                                                │
│              │  Detalhes   │                                                │
│              └─────────────┘                                                │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         ROTAS SUPER ADMIN                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐   ┌───────────────┐                                            │
│  │ /admin  │   │/customization │                                            │
│  │ Painel  │   │ Personalização│                                            │
│  └─────────┘   └───────────────┘                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Changelog

| Data | Alteração |
|------|-----------|
| 02/02/2026 | Documento criado com mapeamento completo de rotas |
