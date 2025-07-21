-- =============================================
-- SCRIPT COMPLETO - SISTEMA SLA CAKTO
-- =============================================

-- Criar tipos enumerados (verificar se existem)
DO $$ BEGIN
    CREATE TYPE user_type AS ENUM ('administrador_master', 'colaborador_setor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE prioridade_operacional AS ENUM ('baixa', 'media', 'alta', 'critica');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABELA: setores
-- =============================================
CREATE TABLE IF NOT EXISTS public.setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- TABELA: profiles (usuarios)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  nome_completo TEXT NOT NULL,
  user_type user_type NOT NULL DEFAULT 'colaborador_setor',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- TABELA: user_setores (relacionamento N:N)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  setor_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, setor_id)
);

-- Adicionar FK para user_setores se não existir
DO $$ BEGIN
    ALTER TABLE public.user_setores 
    ADD CONSTRAINT user_setores_setor_id_fkey 
    FOREIGN KEY (setor_id) REFERENCES public.setores(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABELA: sla_demandas
-- =============================================
CREATE TABLE IF NOT EXISTS public.sla_demandas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT,
  titulo TEXT NOT NULL,
  time_responsavel TEXT NOT NULL,
  solicitante TEXT NOT NULL,
  descricao TEXT NOT NULL,
  pontuacao_financeiro INTEGER NOT NULL CHECK (pontuacao_financeiro >= 0 AND pontuacao_financeiro <= 10),
  pontuacao_cliente INTEGER NOT NULL CHECK (pontuacao_cliente >= 0 AND pontuacao_cliente <= 10),
  pontuacao_reputacao INTEGER NOT NULL CHECK (pontuacao_reputacao >= 0 AND pontuacao_reputacao <= 10),
  pontuacao_urgencia INTEGER NOT NULL CHECK (pontuacao_urgencia >= 0 AND pontuacao_urgencia <= 10),
  pontuacao_operacional INTEGER NOT NULL CHECK (pontuacao_operacional >= 0 AND pontuacao_operacional <= 10),
  pontuacao_total INTEGER NOT NULL,
  nivel_criticidade TEXT NOT NULL CHECK (nivel_criticidade IN ('P0', 'P1', 'P2', 'P3')),
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'resolvido', 'fechado', 'transferido')),
  tags TEXT[],
  setor_id UUID,
  prioridade_operacional prioridade_operacional DEFAULT 'media',
  prazo_interno TIMESTAMP WITH TIME ZONE,
  responsavel_interno TEXT,
  arquivos JSONB,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar FK para sla_demandas se não existir
DO $$ BEGIN
    ALTER TABLE public.sla_demandas 
    ADD CONSTRAINT sla_demandas_setor_id_fkey 
    FOREIGN KEY (setor_id) REFERENCES public.setores(id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABELA: sla_action_logs (sla_logs modernizado)
-- =============================================
CREATE TABLE IF NOT EXISTS public.sla_action_logs (
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

-- Adicionar FKs para sla_action_logs se não existirem
DO $$ BEGIN
    ALTER TABLE public.sla_action_logs 
    ADD CONSTRAINT sla_action_logs_sla_id_fkey 
    FOREIGN KEY (sla_id) REFERENCES public.sla_demandas(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.sla_action_logs 
    ADD CONSTRAINT sla_action_logs_setor_origem_fkey 
    FOREIGN KEY (setor_origem_id) REFERENCES public.setores(id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.sla_action_logs 
    ADD CONSTRAINT sla_action_logs_setor_destino_fkey 
    FOREIGN KEY (setor_destino_id) REFERENCES public.setores(id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABELA: sla_comentarios_internos
-- =============================================
CREATE TABLE IF NOT EXISTS public.sla_comentarios_internos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sla_id UUID NOT NULL,
  setor_id UUID NOT NULL,
  autor_id UUID NOT NULL,
  autor_nome TEXT NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar FKs para sla_comentarios_internos se não existirem
DO $$ BEGIN
    ALTER TABLE public.sla_comentarios_internos 
    ADD CONSTRAINT sla_comentarios_sla_id_fkey 
    FOREIGN KEY (sla_id) REFERENCES public.sla_demandas(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.sla_comentarios_internos 
    ADD CONSTRAINT sla_comentarios_setor_id_fkey 
    FOREIGN KEY (setor_id) REFERENCES public.setores(id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABELA: sla_logs (compatibilidade)
-- =============================================
CREATE TABLE IF NOT EXISTS public.sla_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_demanda UUID,
  tipo_acao TEXT NOT NULL,
  usuario_responsavel TEXT,
  dados_criados JSONB,
  origem TEXT NOT NULL DEFAULT 'chat_lovable',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar FK para sla_logs se não existir
DO $$ BEGIN
    ALTER TABLE public.sla_logs 
    ADD CONSTRAINT sla_logs_id_demanda_fkey 
    FOREIGN KEY (id_demanda) REFERENCES public.sla_demandas(id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- INSERIR SETORES PADRÃO (apenas se não existirem)
-- =============================================
INSERT INTO public.setores (nome, descricao) 
SELECT 'TI', 'Tecnologia da Informação'
WHERE NOT EXISTS (SELECT 1 FROM public.setores WHERE nome = 'TI');

INSERT INTO public.setores (nome, descricao) 
SELECT 'Financeiro', 'Departamento Financeiro'
WHERE NOT EXISTS (SELECT 1 FROM public.setores WHERE nome = 'Financeiro');

INSERT INTO public.setores (nome, descricao) 
SELECT 'Suporte', 'Suporte ao Cliente'
WHERE NOT EXISTS (SELECT 1 FROM public.setores WHERE nome = 'Suporte');

INSERT INTO public.setores (nome, descricao) 
SELECT 'Produto', 'Desenvolvimento de Produto'
WHERE NOT EXISTS (SELECT 1 FROM public.setores WHERE nome = 'Produto');

INSERT INTO public.setores (nome, descricao) 
SELECT 'Compliance', 'Conformidade e Regulamentação'
WHERE NOT EXISTS (SELECT 1 FROM public.setores WHERE nome = 'Compliance');

INSERT INTO public.setores (nome, descricao) 
SELECT 'RH', 'Recursos Humanos'
WHERE NOT EXISTS (SELECT 1 FROM public.setores WHERE nome = 'RH');

INSERT INTO public.setores (nome, descricao) 
SELECT 'Comercial', 'Equipe de Vendas'
WHERE NOT EXISTS (SELECT 1 FROM public.setores WHERE nome = 'Comercial');

INSERT INTO public.setores (nome, descricao) 
SELECT 'Marketing', 'Marketing e Comunicação'
WHERE NOT EXISTS (SELECT 1 FROM public.setores WHERE nome = 'Marketing');

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
DO $$ BEGIN
    CREATE INDEX idx_sla_demandas_status ON public.sla_demandas(status);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_sla_demandas_criticidade ON public.sla_demandas(nivel_criticidade);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_sla_demandas_setor ON public.sla_demandas(setor_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_sla_demandas_data_criacao ON public.sla_demandas(data_criacao);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_sla_demandas_status_setor ON public.sla_demandas(status, setor_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_sla_logs_timestamp ON public.sla_action_logs(timestamp);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_sla_logs_sla_id ON public.sla_action_logs(sla_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_sla_logs_autor ON public.sla_action_logs(autor_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_sla_comentarios_sla_id ON public.sla_comentarios_internos(sla_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_user_setores_user_id ON public.user_setores(user_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;