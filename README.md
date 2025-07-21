# 🎯 Sistema de Gestão de SLA

Um sistema completo de gestão de SLA (Service Level Agreement) construído com React, TypeScript, Tailwind CSS e Supabase.

## ✨ Funcionalidades

- 📋 **Gestão de SLAs**: Criação, edição e acompanhamento de demandas
- 💬 **Sistema de Comentários**: Interface moderna estilo redes sociais
- 📊 **Dashboard Analítico**: Métricas e pontuações detalhadas
- 🔄 **Transferência de Setores**: Movimentação fluida entre departamentos
- 📈 **Histórico Completo**: Log de todas as ações realizadas
- 👥 **Gestão de Usuários**: Controle de acesso e permissões
- 🏢 **Gestão de Setores**: Organização departamental
- 🔐 **Autenticação**: Sistema seguro com Supabase Auth

## 🚀 Instalação Rápida

### 1. Clone o Projeto
```bash
git clone <URL_DO_REPOSITORIO>
cd sistema-sla
```

### 2. Configure o Supabase

#### 2.1. Criar Conta e Projeto
1. Acesse [https://supabase.com](https://supabase.com)
2. Crie uma conta gratuita
3. Clique em "New Project"
4. Escolha sua organização
5. Dê um nome para o projeto (ex: "sistema-sla")
6. Defina uma senha segura para o banco
7. Escolha a região mais próxima
8. Clique em "Create new project"

#### 2.2. Configurar Banco de Dados
1. Aguarde o projeto ser criado (1-2 minutos)
2. No painel do Supabase, vá em **SQL Editor**
3. Clique em **"New query"**
4. Copie e cole o script SQL abaixo:

```sql
-- =============================================
-- SCRIPT DE INSTALAÇÃO - SISTEMA SLA
-- =============================================

-- Criar tipos enumerados
CREATE TYPE user_type AS ENUM ('administrador_master', 'colaborador_setor');
CREATE TYPE prioridade_operacional AS ENUM ('baixa', 'media', 'alta', 'critica');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  nome_completo TEXT NOT NULL,
  user_type user_type NOT NULL DEFAULT 'colaborador_setor',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de setores
CREATE TABLE public.setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de relacionamento usuário-setor
CREATE TABLE public.user_setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  setor_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, setor_id)
);

-- Tabela de demandas SLA
CREATE TABLE public.sla_demandas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT,
  titulo TEXT NOT NULL,
  time_responsavel TEXT NOT NULL,
  solicitante TEXT NOT NULL,
  descricao TEXT NOT NULL,
  pontuacao_financeiro INTEGER NOT NULL,
  pontuacao_cliente INTEGER NOT NULL,
  pontuacao_reputacao INTEGER NOT NULL,
  pontuacao_urgencia INTEGER NOT NULL,
  pontuacao_operacional INTEGER NOT NULL,
  pontuacao_total INTEGER NOT NULL,
  nivel_criticidade TEXT NOT NULL,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'aberto',
  tags TEXT[],
  setor_id UUID,
  prioridade_operacional prioridade_operacional DEFAULT 'media',
  prazo_interno TIMESTAMP WITH TIME ZONE,
  responsavel_interno TEXT,
  arquivos JSONB,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de comentários internos
CREATE TABLE public.sla_comentarios_internos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sla_id UUID NOT NULL,
  setor_id UUID NOT NULL,
  autor_id UUID NOT NULL,
  autor_nome TEXT NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de logs de ação
CREATE TABLE public.sla_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sla_id UUID NOT NULL,
  acao TEXT NOT NULL,
  autor_id UUID NOT NULL,
  autor_email TEXT NOT NULL,
  setor_origem_id UUID,
  setor_destino_id UUID,
  justificativa TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de logs gerais
CREATE TABLE public.sla_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_demanda UUID,
  tipo_acao TEXT NOT NULL,
  usuario_responsavel TEXT,
  dados_criados JSONB,
  origem TEXT NOT NULL DEFAULT 'chat_lovable',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir setores padrão
INSERT INTO public.setores (nome, descricao) VALUES
('TI', 'Tecnologia da Informação'),
('Financeiro', 'Departamento Financeiro'),
('Suporte', 'Suporte ao Cliente'),
('Produto', 'Desenvolvimento de Produto'),
('Compliance', 'Conformidade e Regulamentação');

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_comentarios_internos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_logs ENABLE ROW LEVEL SECURITY;

-- Funções auxiliares
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid 
    AND user_type = 'administrador_master'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_setor_access(setor_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_setores 
    WHERE user_id = user_uuid 
    AND setor_id = setor_uuid
  );
$$;

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nome_completo, user_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nome_completo', new.email),
    COALESCE((new.raw_user_meta_data->>'user_type')::public.user_type, 'colaborador_setor')
  );
  RETURN new;
END;
$$;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_setores_updated_at
  BEFORE UPDATE ON public.setores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sla_demandas_updated_at
  BEFORE UPDATE ON public.sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar número de ticket
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE PLPGSQL
AS $$
DECLARE
  current_year TEXT;
  sequence_number TEXT;
  ticket_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  SELECT LPAD((COUNT(*) + 1)::text, 4, '0') 
  INTO sequence_number
  FROM public.sla_demandas 
  WHERE EXTRACT(YEAR FROM data_criacao) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  ticket_number := 'TICKET-' || current_year || '-' || sequence_number;
  
  RETURN ticket_number;
END;
$$;

-- Trigger para gerar ticket automaticamente
CREATE OR REPLACE FUNCTION public.auto_generate_ticket()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_generate_ticket_trigger
  BEFORE INSERT ON public.sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_ticket();

-- Função para log de ações
CREATE OR REPLACE FUNCTION public.log_sla_action(
  p_sla_id UUID, 
  p_acao TEXT, 
  p_setor_origem_id UUID DEFAULT NULL::UUID, 
  p_setor_destino_id UUID DEFAULT NULL::UUID, 
  p_justificativa TEXT DEFAULT NULL::TEXT, 
  p_dados_anteriores JSONB DEFAULT NULL::JSONB, 
  p_dados_novos JSONB DEFAULT NULL::JSONB
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
  user_profile RECORD;
BEGIN
  SELECT email, nome_completo INTO user_profile
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  INSERT INTO public.sla_action_logs (
    sla_id, acao, autor_id, autor_email,
    setor_origem_id, setor_destino_id, justificativa,
    dados_anteriores, dados_novos
  ) VALUES (
    p_sla_id, p_acao, auth.uid(), user_profile.email,
    p_setor_origem_id, p_setor_destino_id, p_justificativa,
    p_dados_anteriores, p_dados_novos
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Função para adicionar comentários
CREATE OR REPLACE FUNCTION public.add_sla_comment(
  p_sla_id UUID, 
  p_setor_id UUID, 
  p_comentario TEXT
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  comment_id UUID;
  user_profile RECORD;
BEGIN
  IF NOT public.user_has_setor_access(p_setor_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado ao setor';
  END IF;
  
  SELECT nome_completo INTO user_profile
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  INSERT INTO public.sla_comentarios_internos (
    sla_id, setor_id, autor_id, autor_nome, comentario
  ) VALUES (
    p_sla_id, p_setor_id, auth.uid(), user_profile.nome_completo, p_comentario
  ) RETURNING id INTO comment_id;
  
  RETURN comment_id;
END;
$$;

-- Políticas RLS para profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (is_admin());

-- Políticas RLS para setores
CREATE POLICY "setores_select_authenticated" ON public.setores
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "setores_all_admin" ON public.setores
  FOR ALL USING (is_admin());

-- Políticas RLS para user_setores
CREATE POLICY "user_setores_select_own" ON public.user_setores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_setores_select_admin" ON public.user_setores
  FOR SELECT USING (is_admin());

CREATE POLICY "user_setores_all_admin" ON public.user_setores
  FOR ALL USING (is_admin());

-- Políticas RLS para sla_demandas
CREATE POLICY "sla_select_admin" ON public.sla_demandas
  FOR SELECT USING (is_admin());

CREATE POLICY "sla_select_setor" ON public.sla_demandas
  FOR SELECT USING (user_has_setor_access(setor_id));

CREATE POLICY "sla_insert_authenticated" ON public.sla_demandas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sla_update_admin" ON public.sla_demandas
  FOR UPDATE USING (is_admin());

CREATE POLICY "sla_update_setor" ON public.sla_demandas
  FOR UPDATE USING (user_has_setor_access(setor_id));

-- Políticas para comentários
CREATE POLICY "comentarios_select_admin" ON public.sla_comentarios_internos
  FOR SELECT USING (is_admin());

CREATE POLICY "comentarios_select_setor" ON public.sla_comentarios_internos
  FOR SELECT USING (user_has_setor_access(setor_id));

CREATE POLICY "comentarios_insert_setor" ON public.sla_comentarios_internos
  FOR INSERT WITH CHECK (user_has_setor_access(setor_id));

-- Políticas para logs
CREATE POLICY "sla_logs_select_admin" ON public.sla_action_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "sla_logs_select_setor_access" ON public.sla_action_logs
  FOR SELECT USING (sla_id IN (
    SELECT s.id FROM sla_demandas s WHERE user_has_setor_access(s.setor_id)
  ));

CREATE POLICY "sla_logs_insert_authenticated" ON public.sla_action_logs
  FOR INSERT WITH CHECK (auth.uid() = autor_id);

-- Políticas para sla_logs
CREATE POLICY "Permitir leitura de logs" ON public.sla_logs
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de logs" ON public.sla_logs
  FOR INSERT WITH CHECK (true);

-- Configurar autenticação automática
UPDATE auth.config SET enable_signup = true;
```

5. Clique em **"Run"** para executar o script
6. Aguarde a confirmação de sucesso

#### 2.3. Obter Credenciais
1. No painel do Supabase, vá em **Settings** (Configurações)
2. Vá em **API**
3. Copie:
   - **URL**: Algo como `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: Uma string longa começando com `eyJ...`

#### 2.4. Configurar Projeto
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
   - **Tipo**: Administrador Master

### 4. Configuração Inicial

1. Faça login com o usuário criado
2. Vá para `/admin` para:
   - Gerenciar usuários e permissões
   - Configurar setores adicionais
   - Atribuir usuários aos setores

## 📱 Como Usar

### Dashboard Principal (`/`)
- Visão geral dos SLAs
- Estatísticas em tempo real
- Acesso rápido às funcionalidades

### Caixa de Entrada (`/inbox`)
- Lista todos os SLAs
- Filtros avançados
- Clique em "Ver Detalhes" para:
  - Gerenciar status (Aberto → Em Andamento → Resolvido → Fechado)
  - Adicionar comentários
  - Transferir entre setores
  - Ver histórico completo

### Área Administrativa (`/admin`)
- Gestão de usuários
- Criação e edição de setores
- Atribuição de permissões

## 🏗️ Estrutura do Projeto

```
src/
├── components/
│   ├── ui/                 # Componentes base (shadcn/ui)
│   ├── Navigation.tsx      # Navegação principal
│   ├── SLAChat.tsx        # Interface de criação de SLA
│   ├── SLADashboard.tsx   # Dashboard de SLAs
│   ├── SLADetailModal.tsx # Modal detalhado do SLA
│   └── SupabaseStatus.tsx # Verificação de conectividade
├── pages/
│   ├── Index.tsx          # Página inicial
│   ├── Inbox.tsx          # Caixa de entrada
│   ├── Admin.tsx          # Área administrativa
│   └── Auth.tsx           # Autenticação
├── hooks/
│   └── useAuth.tsx        # Hook de autenticação
├── lib/
│   └── supabase-config.ts # Configuração flexível do Supabase
└── integrations/supabase/ # Configuração do Supabase
```

## 🔧 Tecnologias

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **UI**: shadcn/ui, Lucide Icons
- **Deployment**: Lovable Platform

## 🆘 Solução de Problemas

### ⚠️ "Supabase não configurado"
Se ver esta mensagem, siga os passos de instalação acima.

### 🔐 Problemas de Autenticação
1. Verifique se o Supabase foi configurado corretamente
2. Confirme que as URLs de redirecionamento estão corretas em **Authentication > URL Configuration**

### 📊 Dados não aparecem
1. Verifique se executou o script SQL completo
2. Confirme que o usuário tem permissões adequadas
3. Verifique se foi atribuído aos setores corretos

### 💬 Comentários não funcionam
Certifique-se de que o usuário está atribuído ao setor do SLA em `/admin`.

## 🚀 Deploy

### Lovable Platform
1. No projeto Lovable, clique em **Publish**
2. Configure domínio personalizado se necessário
3. Seu sistema estará online!

### Outros Ambientes
Para deploy em outras plataformas:
1. Configure as variáveis de ambiente:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
2. Build: `npm run build`
3. Deploy a pasta `dist/`

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Faça commit das mudanças
4. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

---

**🎉 Pronto! Seu sistema de gestão de SLA está funcionando!**

Para dúvidas ou suporte, abra uma issue no repositório.