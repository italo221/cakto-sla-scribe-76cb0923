-- Primeira parte: Criação dos tipos base e tabelas principais

-- 1. Verificar e criar enum para tipos de usuário
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
        CREATE TYPE public.user_type AS ENUM ('administrador_master', 'colaborador_setor');
    END IF;
END $$;

-- 2. Verificar e criar enum para prioridade operacional
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prioridade_operacional') THEN
        CREATE TYPE public.prioridade_operacional AS ENUM ('alta', 'media', 'baixa');
    END IF;
END $$;

-- 3. Atualizar status dos SLAs existentes se necessário
DO $$
BEGIN
    -- Verificar se existe enum status para sla_demandas
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'sla_demandas' 
               AND column_name = 'status' 
               AND data_type = 'text') THEN
        -- Se status é text, vamos manter assim por enquanto
        NULL;
    END IF;
END $$;

-- 4. Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome_completo TEXT NOT NULL,
  user_type public.user_type NOT NULL DEFAULT 'colaborador_setor',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar constraints únicos se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE(email);
    END IF;
END $$;

-- 5. Tabela de setores
CREATE TABLE IF NOT EXISTS public.setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabela de relacionamento usuários-setores (many-to-many)
CREATE TABLE IF NOT EXISTS public.user_setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar constraint único se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_setores_user_id_setor_id_key') THEN
        ALTER TABLE public.user_setores ADD CONSTRAINT user_setores_user_id_setor_id_key UNIQUE(user_id, setor_id);
    END IF;
END $$;

-- 7. Adicionar campos operacionais à tabela sla_demandas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sla_demandas' AND column_name = 'setor_id') THEN
        ALTER TABLE public.sla_demandas ADD COLUMN setor_id UUID REFERENCES public.setores(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sla_demandas' AND column_name = 'prioridade_operacional') THEN
        ALTER TABLE public.sla_demandas ADD COLUMN prioridade_operacional public.prioridade_operacional DEFAULT 'media';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sla_demandas' AND column_name = 'prazo_interno') THEN
        ALTER TABLE public.sla_demandas ADD COLUMN prazo_interno TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sla_demandas' AND column_name = 'responsavel_interno') THEN
        ALTER TABLE public.sla_demandas ADD COLUMN responsavel_interno TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sla_demandas' AND column_name = 'updated_at') THEN
        ALTER TABLE public.sla_demandas ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- 8. Criar setores padrão se não existirem
INSERT INTO public.setores (nome, descricao) 
SELECT nome, descricao FROM (VALUES 
  ('TI', 'Tecnologia da Informação'),
  ('Suporte', 'Suporte ao Cliente'),
  ('Financeiro', 'Departamento Financeiro'),
  ('Produto', 'Desenvolvimento de Produto'),
  ('Compliance', 'Conformidade e Regulamentação')
) AS v(nome, descricao)
WHERE NOT EXISTS (SELECT 1 FROM public.setores WHERE setores.nome = v.nome);

-- 9. Habilitar RLS nas tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_setores ENABLE ROW LEVEL SECURITY;