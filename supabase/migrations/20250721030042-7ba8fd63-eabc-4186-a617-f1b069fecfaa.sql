-- Criar tabela sla_demandas conforme especificação da V2
CREATE TABLE public.sla_demandas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
  nivel_criticidade TEXT NOT NULL CHECK (nivel_criticidade IN ('P0', 'P1', 'P2', 'P3')),
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'aberto',
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  arquivos JSONB
);

-- Habilitar RLS
ALTER TABLE public.sla_demandas ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de qualquer usuário (sistema público)
CREATE POLICY "Permitir inserção de SLA" 
ON public.sla_demandas 
FOR INSERT 
WITH CHECK (true);

-- Política para permitir leitura de qualquer usuário
CREATE POLICY "Permitir leitura de SLA" 
ON public.sla_demandas 
FOR SELECT 
USING (true);

-- Criar tabela de logs para auditoria
CREATE TABLE public.sla_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_acao TEXT NOT NULL,
  id_demanda UUID,
  usuario_responsavel TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dados_criados JSONB,
  origem TEXT NOT NULL DEFAULT 'chat_lovable'
);

-- Habilitar RLS para logs
ALTER TABLE public.sla_logs ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção nos logs
CREATE POLICY "Permitir inserção de logs" 
ON public.sla_logs 
FOR INSERT 
WITH CHECK (true);

-- Política para permitir leitura dos logs
CREATE POLICY "Permitir leitura de logs" 
ON public.sla_logs 
FOR SELECT 
USING (true);