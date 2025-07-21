-- =============================================
-- SCRIPT COMPLETO - SISTEMA SLA CAKTO
-- =============================================

-- Criar tipos enumerados
CREATE TYPE user_type AS ENUM ('administrador_master', 'colaborador_setor');
CREATE TYPE prioridade_operacional AS ENUM ('baixa', 'media', 'alta', 'critica');

-- =============================================
-- TABELA: setores
-- =============================================
CREATE TABLE public.setores (
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
CREATE TABLE public.profiles (
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
CREATE TABLE public.user_setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, setor_id)
);

-- =============================================
-- TABELA: sla_demandas
-- =============================================
CREATE TABLE public.sla_demandas (
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
  setor_id UUID REFERENCES public.setores(id),
  prioridade_operacional prioridade_operacional DEFAULT 'media',
  prazo_interno TIMESTAMP WITH TIME ZONE,
  responsavel_interno TEXT,
  arquivos JSONB,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- TABELA: sla_action_logs (sla_logs modernizado)
-- =============================================
CREATE TABLE public.sla_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sla_id UUID NOT NULL REFERENCES public.sla_demandas(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  autor_id UUID NOT NULL,
  autor_email TEXT NOT NULL,
  setor_origem_id UUID REFERENCES public.setores(id),
  setor_destino_id UUID REFERENCES public.setores(id),
  justificativa TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- TABELA: sla_comentarios_internos
-- =============================================
CREATE TABLE public.sla_comentarios_internos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sla_id UUID NOT NULL REFERENCES public.sla_demandas(id) ON DELETE CASCADE,
  setor_id UUID NOT NULL REFERENCES public.setores(id),
  autor_id UUID NOT NULL,
  autor_nome TEXT NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- TABELA: sla_logs (compatibilidade)
-- =============================================
CREATE TABLE public.sla_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_demanda UUID REFERENCES public.sla_demandas(id),
  tipo_acao TEXT NOT NULL,
  usuario_responsavel TEXT,
  dados_criados JSONB,
  origem TEXT NOT NULL DEFAULT 'chat_lovable',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- INSERIR SETORES PADRÃO
-- =============================================
INSERT INTO public.setores (nome, descricao) VALUES
('TI', 'Tecnologia da Informação'),
('Financeiro', 'Departamento Financeiro'),
('Suporte', 'Suporte ao Cliente'),
('Produto', 'Desenvolvimento de Produto'),
('Compliance', 'Conformidade e Regulamentação'),
('RH', 'Recursos Humanos'),
('Comercial', 'Equipe de Vendas'),
('Marketing', 'Marketing e Comunicação');

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX idx_sla_demandas_status ON public.sla_demandas(status);
CREATE INDEX idx_sla_demandas_criticidade ON public.sla_demandas(nivel_criticidade);
CREATE INDEX idx_sla_demandas_setor ON public.sla_demandas(setor_id);
CREATE INDEX idx_sla_demandas_data_criacao ON public.sla_demandas(data_criacao);
CREATE INDEX idx_sla_demandas_status_setor ON public.sla_demandas(status, setor_id);

CREATE INDEX idx_sla_logs_timestamp ON public.sla_action_logs(timestamp);
CREATE INDEX idx_sla_logs_sla_id ON public.sla_action_logs(sla_id);
CREATE INDEX idx_sla_logs_autor ON public.sla_action_logs(autor_id);

CREATE INDEX idx_sla_comentarios_sla_id ON public.sla_comentarios_internos(sla_id);
CREATE INDEX idx_user_setores_user_id ON public.user_setores(user_id);

-- =============================================
-- FUNÇÕES AUXILIARES
-- =============================================

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid 
    AND user_type = 'administrador_master'
    AND ativo = true
  );
$$;

-- Função para verificar acesso ao setor
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

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

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

-- Trigger para gerar ticket automaticamente
CREATE TRIGGER auto_generate_ticket_trigger
  BEFORE INSERT ON public.sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_ticket();

-- =============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_comentarios_internos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS - PROFILES
-- =============================================
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (is_admin());

-- =============================================
-- POLÍTICAS RLS - SETORES
-- =============================================
CREATE POLICY "setores_select_authenticated" ON public.setores
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "setores_all_admin" ON public.setores
  FOR ALL USING (is_admin());

-- =============================================
-- POLÍTICAS RLS - USER_SETORES
-- =============================================
CREATE POLICY "user_setores_select_own" ON public.user_setores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_setores_select_admin" ON public.user_setores
  FOR SELECT USING (is_admin());

CREATE POLICY "user_setores_all_admin" ON public.user_setores
  FOR ALL USING (is_admin());

-- =============================================
-- POLÍTICAS RLS - SLA_DEMANDAS
-- =============================================
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

-- =============================================
-- POLÍTICAS RLS - COMENTÁRIOS
-- =============================================
CREATE POLICY "comentarios_select_admin" ON public.sla_comentarios_internos
  FOR SELECT USING (is_admin());

CREATE POLICY "comentarios_select_setor" ON public.sla_comentarios_internos
  FOR SELECT USING (user_has_setor_access(setor_id));

CREATE POLICY "comentarios_insert_setor" ON public.sla_comentarios_internos
  FOR INSERT WITH CHECK (user_has_setor_access(setor_id));

-- =============================================
-- POLÍTICAS RLS - ACTION LOGS
-- =============================================
CREATE POLICY "sla_logs_select_admin" ON public.sla_action_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "sla_logs_select_setor_access" ON public.sla_action_logs
  FOR SELECT USING (sla_id IN (
    SELECT s.id FROM sla_demandas s WHERE user_has_setor_access(s.setor_id)
  ));

CREATE POLICY "sla_logs_insert_authenticated" ON public.sla_action_logs
  FOR INSERT WITH CHECK (auth.uid() = autor_id);

-- =============================================
-- POLÍTICAS RLS - SLA_LOGS (COMPATIBILIDADE)
-- =============================================
CREATE POLICY "Permitir leitura de logs" ON public.sla_logs
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de logs" ON public.sla_logs
  FOR INSERT WITH CHECK (true);