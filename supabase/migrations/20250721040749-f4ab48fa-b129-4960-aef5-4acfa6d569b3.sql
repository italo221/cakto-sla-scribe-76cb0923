-- Criação do sistema de controle de acesso e setores

-- 1. Enum para tipos de usuário
CREATE TYPE public.user_type AS ENUM ('administrador_master', 'colaborador_setor');

-- 2. Enum para status dos SLAs
ALTER TYPE public.sla_status ADD VALUE IF NOT EXISTS 'em_andamento';
ALTER TYPE public.sla_status ADD VALUE IF NOT EXISTS 'transferido';

-- 3. Enum para prioridade operacional
CREATE TYPE public.prioridade_operacional AS ENUM ('alta', 'media', 'baixa');

-- 4. Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome_completo TEXT NOT NULL,
  user_type public.user_type NOT NULL DEFAULT 'colaborador_setor',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- 5. Tabela de setores
CREATE TABLE public.setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabela de relacionamento usuários-setores (many-to-many)
CREATE TABLE public.user_setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, setor_id)
);

-- 7. Adicionar campos operacionais à tabela sla_demandas
ALTER TABLE public.sla_demandas 
ADD COLUMN setor_id UUID REFERENCES public.setores(id),
ADD COLUMN prioridade_operacional public.prioridade_operacional DEFAULT 'media',
ADD COLUMN prazo_interno TIMESTAMP WITH TIME ZONE,
ADD COLUMN responsavel_interno TEXT,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 8. Tabela de logs de ações
CREATE TABLE public.sla_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sla_id UUID NOT NULL REFERENCES public.sla_demandas(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  autor_id UUID NOT NULL REFERENCES public.profiles(user_id),
  autor_email TEXT NOT NULL,
  setor_origem_id UUID REFERENCES public.setores(id),
  setor_destino_id UUID REFERENCES public.setores(id),
  justificativa TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Tabela de comentários internos por setor
CREATE TABLE public.sla_comentarios_internos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sla_id UUID NOT NULL REFERENCES public.sla_demandas(id) ON DELETE CASCADE,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.profiles(user_id),
  autor_nome TEXT NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Criar setores padrão
INSERT INTO public.setores (nome, descricao) VALUES 
  ('TI', 'Tecnologia da Informação'),
  ('Suporte', 'Suporte ao Cliente'),
  ('Financeiro', 'Departamento Financeiro'),
  ('Produto', 'Desenvolvimento de Produto'),
  ('Compliance', 'Conformidade e Regulamentação');

-- 11. Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_comentarios_internos ENABLE ROW LEVEL SECURITY;

-- 12. Políticas RLS para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Administradores podem ver todos os perfis"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'administrador_master'
    )
  );

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Administradores podem inserir perfis"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'administrador_master'
    )
  );

-- 13. Políticas RLS para setores
CREATE POLICY "Usuários autenticados podem ver setores"
  ON public.setores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas administradores podem gerenciar setores"
  ON public.setores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'administrador_master'
    )
  );

-- 14. Políticas RLS para user_setores
CREATE POLICY "Usuários podem ver seus próprios setores"
  ON public.user_setores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Administradores podem ver todos os relacionamentos"
  ON public.user_setores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'administrador_master'
    )
  );

CREATE POLICY "Administradores podem gerenciar relacionamentos"
  ON public.user_setores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'administrador_master'
    )
  );

-- 15. Atualizar políticas RLS para sla_demandas
DROP POLICY IF EXISTS "Permitir leitura de SLA" ON public.sla_demandas;
DROP POLICY IF EXISTS "Permitir inserção de SLA" ON public.sla_demandas;
DROP POLICY IF EXISTS "Permitir atualização de SLA" ON public.sla_demandas;

CREATE POLICY "Administradores podem ver todos os SLAs"
  ON public.sla_demandas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'administrador_master'
    )
  );

CREATE POLICY "Colaboradores podem ver SLAs do seu setor"
  ON public.sla_demandas FOR SELECT
  USING (
    setor_id IN (
      SELECT us.setor_id 
      FROM public.user_setores us 
      WHERE us.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários autenticados podem criar SLAs"
  ON public.sla_demandas FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores podem atualizar todos os SLAs"
  ON public.sla_demandas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'administrador_master'
    )
  );

CREATE POLICY "Colaboradores podem atualizar SLAs do seu setor"
  ON public.sla_demandas FOR UPDATE
  USING (
    setor_id IN (
      SELECT us.setor_id 
      FROM public.user_setores us 
      WHERE us.user_id = auth.uid()
    )
  );

-- 16. Políticas RLS para logs de ações
CREATE POLICY "Usuários podem ver logs dos SLAs que têm acesso"
  ON public.sla_action_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'administrador_master'
    )
    OR 
    sla_id IN (
      SELECT s.id 
      FROM public.sla_demandas s
      JOIN public.user_setores us ON s.setor_id = us.setor_id
      WHERE us.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários autenticados podem inserir logs"
  ON public.sla_action_logs FOR INSERT
  WITH CHECK (auth.uid() = autor_id);

-- 17. Políticas RLS para comentários internos
CREATE POLICY "Usuários podem ver comentários do próprio setor"
  ON public.sla_comentarios_internos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'administrador_master'
    )
    OR
    setor_id IN (
      SELECT us.setor_id 
      FROM public.user_setores us 
      WHERE us.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir comentários em setores que pertencem"
  ON public.sla_comentarios_internos FOR INSERT
  WITH CHECK (
    setor_id IN (
      SELECT us.setor_id 
      FROM public.user_setores us 
      WHERE us.user_id = auth.uid()
    )
  );

-- 18. Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- 19. Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 20. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 21. Triggers para updated_at
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