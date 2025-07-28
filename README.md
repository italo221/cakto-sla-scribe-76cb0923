# Sistema de Gestão de Tickets - Manhattan

## 📋 Visão Geral do Sistema

O Sistema Manhattan é uma plataforma moderna de gestão de tickets desenvolvida com React, TypeScript e Supabase. O sistema oferece uma interface intuitiva para criação, edição e acompanhamento de tickets, com funcionalidades avançadas de permissionamento e personalização.

### 🎯 Principais Funcionalidades
- **Gestão de Tickets**: Criação, edição, visualização e exclusão de tickets
- **Kanban Board**: Interface visual para acompanhamento do fluxo de trabalho
- **Sistema de Permissões**: Controle granular baseado em perfis e setores
- **Personalização**: Customização de cores, logo e nome do sistema
- **Dashboard Analytics**: Visão geral com métricas e indicadores
- **Modo Escuro**: Interface adaptável para diferentes preferências

---

## 🎫 Fluxo de Tickets

### Criação de Tickets

#### Processo Unificado
- **Botão único**: Existe apenas um botão "Criar Ticket" que unifica IA e criação manual
- **Campos obrigatórios**: Exibem aviso visual (vermelho) quando não preenchidos
- **Contador de caracteres**: Disponível em campos de texto longos
- **Interface limpa**: Removida duplicação de componentes e corrigido modo escuro

#### Campos Obrigatórios
1. **Título**: Descrição concisa do ticket
2. **Descrição**: Detalhamento do problema/solicitação
3. **Tipo de Ticket**: 
   - Bug
   - Feature 
   - Suporte
   - Melhoria
   - Solicitação
4. **Prioridade**: P0 (Crítico), P1 (Alto), P2 (Médio), P3 (Baixo)
5. **Time Responsável**: Setor que será responsável pelo ticket
6. **Solicitante**: Preenchido automaticamente com o usuário logado

#### Regras de Negócio
- O **setor selecionado** na criação é o responsável pelo ticket
- **Não existem mais** perguntas condicionais baseadas no setor
- Usuários **devem ter um setor atribuído** para criar tickets
- Sistema de pontuação automática baseada nos critérios selecionados

### Status dos Tickets

#### Fluxo de Status
1. **Aberto**: Status inicial de todos os tickets criados
2. **Em Andamento**: Ticket sendo trabalhado pela equipe responsável
3. **Resolvido**: Ticket concluído, aguardando confirmação
4. **Fechado**: Ticket finalizado e arquivado

#### Status Especiais
- **Atrasado**: Calculado automaticamente baseado no prazo da prioridade:
  - P0: 4 horas
  - P1: 24 horas  
  - P2: 3 dias
  - P3: 7 dias

**Nota**: A opção de "pausar" tickets foi removida do sistema.

### Edição de Tickets

#### Permissões de Edição
- **Super Admin**: Pode editar qualquer ticket
- **Líder do Setor**: Pode editar tickets do seu setor
- **Operador**: Pode editar apenas tickets que criou

#### Campos Editáveis
- Título, descrição, tipo, prioridade, time responsável, status, observações
- **Campo não editável**: Solicitante (mantém o criador original)
- **Tags removidas**: Simplificação da interface de edição

#### Validações
- Usuários sem setor atribuído não podem editar tickets
- Verificação de permissões em tempo real
- Log automático de todas as alterações

---

## 👥 Permissões e Perfis de Usuário

### Tipos de Usuário

#### Super Admin
- **Acesso total** ao sistema
- Pode editar/excluir qualquer ticket
- Gerencia setores, usuários e permissões
- Acesso ao painel de administração
- Personalização do sistema (cores, logo, nome)

#### Operador
- Pode **criar tickets**
- Pode **editar apenas tickets que criou**
- Visualiza dashboard e relatórios
- **Não pode se transformar em Super Admin** (correção de bug)

#### Viewer
- **Apenas visualização** do dashboard
- Não pode criar tickets
- Não vê histórico detalhado
- **Não tem acesso** ao menu "Admin"

#### Líder de Setor
- Além das permissões de Operador
- Pode **editar/excluir tickets do seu setor**
- Gerencia equipe do setor
- **Apenas 1 líder por setor** é permitido

### Validações de Setor

#### Regra Principal
Usuários **devem estar atribuídos a um setor** antes de:
- Criar tickets
- Editar tickets
- Acessar funcionalidades de gestão

Mensagem exibida: *"Você precisa ser atribuído a um setor/time antes de criar ou editar tickets. Contate um administrador."*

---

## 📊 Kanban e Caixa de Entrada

### Kanban Board

#### Design e Interface
- **Layout minimalista**: Seguindo commit "fix dark mode background"
- **Cores suaves**: Removidas cores pesadas acima das colunas
- **Scroll vertical** restaurado para melhor navegação
- **Responsivo**: Adaptável a diferentes tamanhos de tela

#### Funcionalidades de Drag & Drop
- **Modernizado**: Tickets não desaparecem ao serem movidos
- **Drop inteligente**: Funciona em qualquer área da coluna
- **Animações suaves**: Criação automática de espaço para o ticket
- **Feedback visual**: Sistema reativo e responsivo ao movimento

#### Interação com Tickets
- **Clique**: Abre detalhes do ticket imediatamente
- **Edição**: Botão "Editar" aparece no hover do card
- **Arrastar**: Funcionalidade completa de drag & drop para mudança de status

### Caixa de Entrada

#### Interface Limpa
- **Tags desnecessárias removidas**: Layout mais clean e focado
- **Opções essenciais**: Apenas Editar e Visualizar disponíveis
- **Filtros otimizados**: Sistema inteligente de filtragem

#### Sistema de Busca Inteligente
- **Autocomplete**: Sugere tickets conforme digitação
- **Busca Google-like**: Busca inteligente por palavras-chave
- **Filtros múltiplos**: Combinação de texto, status e setor

#### Correções de Filtros
- **Lógica corrigida**: Setor mostra apenas tickets corretos
- **Bug resolvido**: Cards não ficam mais "presos" ao selecionar críticos
- **Performance melhorada**: Filtros mais responsivos

---

## 🎨 Personalização do Sistema

### Customizações Disponíveis (Super Admin)

#### Identidade Visual
1. **Nome do Sistema**: Alterar "Manhattan" para qualquer nome desejado
2. **Logo do Sistema**: Upload e gerenciamento de logo personalizada
3. **Cores do Sistema**: Personalização completa da paleta de cores
4. **Tema**: Modo claro/escuro com persistência de preferência

#### Configurações Técnicas
- **Armazenamento**: Logo e configurações salvas no Supabase
- **Carregamento automático**: Aplicação das personalizações na inicialização
- **Cache otimizado**: Performance mantida mesmo com customizações

---

## ⚙️ Administração do Sistema

### Gestão de Permissões

#### Cargos e Funções
- **Criação de cargos**: Adicionar novos cargos ao sistema
- **Edição**: Modificar permissões existentes
- **Exclusão**: Remover cargos desnecessários
- **Interface otimizada**: Botões de ação ao lado do título do cargo

#### Permissões Granulares
Cada cargo pode ter permissões específicas para:
- Criar tickets
- Editar tickets próprios
- Editar tickets do setor
- Excluir tickets
- Comentar em tickets
- Resolver tickets

### Gestão de Setores

#### Funcionalidades
- **Criação/edição** de setores
- **Atribuição de usuários** a setores
- **Definição de líder** (1 por setor)
- **Listagem de membros** da equipe

#### Visualização
- **Lista completa** de usuários por setor
- **Identificação visual** do líder
- **Gestão centralizada** pelo Super Admin

### Limpeza de Interface

#### Elementos Removidos
- Tags irrelevantes como "Admin Master" e "Colaborador"
- Elementos visuais desnecessários
- Duplicações de componentes
- Ícones excessivos

---

## 🔗 Integração com Supabase

### Configurações de Segurança

#### Row Level Security (RLS)
- **Políticas otimizadas** para cada tabela
- **Acesso baseado em perfil** de usuário
- **Prevenção de escalação** de privilégios

#### Performance
- **Queries otimizadas** para carregamento rápido
- **Índices estratégicos** nas tabelas principais
- **Cache inteligente** para dados frequentes

### Estrutura do Banco

#### Tabelas Principais
- `sla_demandas`: Tickets do sistema
- `profiles`: Perfis de usuário
- `setores`: Departamentos/equipes
- `user_setores`: Relacionamento usuário-setor
- `permissoes_cargo`: Permissões por cargo

#### Logs e Auditoria
- `sla_action_logs`: Log de ações nos tickets
- `sla_logs`: Logs gerais do sistema
- `logs_permissoes`: Auditoria de alterações de permissão

---

## 🎨 UI/UX e Design System

### Filosofia de Design

#### Minimalismo Moderno
- **Estilo SaaS**: Interface clean e profissional
- **Elementos essenciais**: Remoção de componentes desnecessários
- **Hierarquia visual**: Clara e intuitiva

#### Acessibilidade
- **Contraste otimizado**: Cores adequadas para diferentes contextos
- **Responsividade**: Funciona em tablets, desktops e dispositivos móveis
- **Modo escuro**: Implementação completa com consistência visual

### Componentes

#### Sistema de Cores
- **Paleta consistente**: Cores harmoniosas e profissionais
- **Estados visuais**: Hover, focus e active bem definidos
- **Correções aplicadas**: Botões verdes sem halo ciano

#### Tipografia
- **Hierarquia clara**: Tamanhos e pesos bem definidos
- **Legibilidade**: Contraste adequado em todos os modos
- **Consistência**: Uso uniforme em todo o sistema

---

## 🚀 Instalação Rápida

### 1. Clone o Projeto
```bash
git clone <URL_DO_REPOSITORIO>
cd sistema-tickets
```

### 2. Configure o Supabase

#### 2.1. Criar Conta e Projeto
1. Acesse [https://supabase.com](https://supabase.com)
2. Crie uma conta gratuita
3. Clique em "New Project"
4. Escolha sua organização
5. Dê um nome para o projeto (ex: "sistema-tickets")
6. Defina uma senha segura para o banco
7. Escolha a região mais próxima
8. Clique em "Create new project"

#### 2.2. Obter Credenciais
1. No painel do Supabase, vá em **Settings** (Configurações)
2. Vá em **API**
3. Copie:
   - **URL**: Algo como `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: Uma string longa começando com `eyJ...`

#### 2.3. Configurar Projeto
1. No projeto Lovable, vá em **Project Settings** (ícone de engrenagem)
2. Vá em **Integrations**
3. Conecte com Supabase usando as credenciais copiadas

### 3. Primeiro Acesso

1. Acesse o projeto no navegador
2. Vá para a página `/auth`
3. Cadastre o primeiro usuário administrador:
   - **Email**: seu@email.com
   - **Senha**: sua_senha_segura
   - **Nome**: Seu Nome Completo
   - **Tipo**: Super Admin

### 4. Configuração Inicial

1. Faça login com o usuário criado
2. Vá para `/admin` para:
   - Gerenciar usuários e permissões
   - Configurar setores adicionais
   - Atribuir usuários aos setores

---

## 📱 Como Usar

### Dashboard Principal (`/`)
- Visão geral dos tickets
- Estatísticas em tempo real
- Acesso rápido às funcionalidades

### Caixa de Entrada (`/inbox`)
- Lista todos os tickets
- Filtros avançados
- Busca inteligente com autocomplete
- Clique em tickets para ver detalhes

### Kanban Board (`/kanban`)
- Visualização em colunas por status
- Drag & drop para mudança de status
- Edição rápida de tickets
- Interface responsiva

### Área Administrativa (`/admin`)
- Gestão de usuários
- Criação e edição de setores
- Configuração de permissões
- Personalização do sistema

---

## 🏗️ Estrutura do Projeto

```
src/
├── components/
│   ├── ui/                    # Componentes base (shadcn/ui)
│   ├── Navigation.tsx         # Navegação principal
│   ├── TicketKanban.tsx      # Kanban board
│   ├── TicketDetailModal.tsx  # Modal detalhado do ticket
│   ├── TicketEditModal.tsx    # Modal de edição
│   ├── ManualTicketCreator.tsx # Criação de tickets
│   └── ThemeToggle.tsx        # Alternador de tema
├── pages/
│   ├── Index.tsx             # Dashboard principal
│   ├── Inbox.tsx             # Caixa de entrada
│   ├── Kanban.tsx            # Página do Kanban
│   ├── Admin.tsx             # Área administrativa
│   ├── Customization.tsx     # Personalização
│   └── Auth.tsx              # Autenticação
├── hooks/
│   ├── useAuth.tsx           # Hook de autenticação
│   ├── usePermissions.tsx    # Hook de permissões
│   ├── useTheme.tsx          # Hook de tema
│   └── useTicketStatus.tsx   # Hook de status
├── lib/
│   └── supabase-config.ts    # Configuração do Supabase
└── integrations/
    └── supabase/             # Cliente e tipos do Supabase
```

---

## 📚 Changelog

### Versão Atual - 2.0.0

#### ✅ Funcionalidades Implementadas
- [x] Sistema unificado de criação de tickets
- [x] Kanban com drag & drop modernizado
- [x] Permissões granulares por setor
- [x] Personalização completa do sistema
- [x] Interface otimizada para modo escuro
- [x] Sistema de busca inteligente
- [x] Gestão de setores e líderes
- [x] Logs de auditoria completos

#### 🔧 Correções Aplicadas
- [x] Bug de escalação de privilégios
- [x] Filtros de setor corrigidos
- [x] Drag & drop do Kanban restaurado
- [x] Interface de criação duplicada removida
- [x] Cores e contrastes melhorados
- [x] Responsividade em todas as telas

#### 🗑️ Elementos Removidos
- [x] Perguntas condicionais por setor
- [x] Opção de pausar tickets
- [x] Tags desnecessárias da interface
- [x] Elementos visuais excessivos
- [x] Duplicações de componentes

#### 🎨 Melhorias de UI/UX
- [x] Design minimalista estilo SaaS
- [x] Interações mais fluidas
- [x] Animações suaves
- [x] Contraste otimizado
- [x] Modo escuro completo

---

## 🛠️ Guia de Desenvolvimento

### Tecnologias Utilizadas
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Build**: Vite
- **UI Components**: Radix UI, Lucide Icons
- **Drag & Drop**: @dnd-kit

### Comandos Principais
```bash
# Instalação
npm install

# Desenvolvimento
npm run dev

# Build
npm run build

# Typecheck
npm run typecheck
```

### Estrutura de Dados

#### Principais Entidades
- **Tickets**: Demandas principais do sistema
- **Usuários**: Perfis e autenticação
- **Setores**: Organização departamental
- **Permissões**: Controle de acesso granular

#### Relacionamentos
- Usuário ↔ Setor (muitos para muitos)
- Ticket → Setor (muitos para um)
- Ticket → Usuário (muitos para um - criador)

---

## 📞 Suporte

Para dúvidas técnicas ou sugestões de melhorias, entre em contato com a equipe de desenvolvimento.

### Recursos Úteis
- **Documentação do Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Guia do Tailwind CSS**: [tailwindcss.com/docs](https://tailwindcss.com/docs)
- **React Documentation**: [react.dev](https://react.dev)
- **Lovable Documentation**: [docs.lovable.dev](https://docs.lovable.dev)

---

*Documentação atualizada em: Janeiro 2025*  
*Versão do Sistema: 2.0.0*  
*Última revisão: Sistema de Gestão de Tickets Manhattan*