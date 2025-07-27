-- Criar tabelas para sistema de permissões por cargo
CREATE TABLE public.cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

-- Política para super admins
CREATE POLICY "Super admins can manage cargos"
ON public.cargos
FOR ALL
TO authenticated
USING (is_super_admin());

-- Criar tabela de permissões por cargo
CREATE TABLE public.permissoes_cargo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  pode_criar_ticket BOOLEAN NOT NULL DEFAULT false,
  pode_editar_ticket BOOLEAN NOT NULL DEFAULT false,
  pode_excluir_ticket BOOLEAN NOT NULL DEFAULT false,
  pode_comentar BOOLEAN NOT NULL DEFAULT false,
  pode_editar_comentario BOOLEAN NOT NULL DEFAULT false,
  pode_excluir_comentario BOOLEAN NOT NULL DEFAULT false,
  pode_editar_comentario_proprio BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cargo_id)
);

-- Habilitar RLS
ALTER TABLE public.permissoes_cargo ENABLE ROW LEVEL SECURITY;

-- Política para super admins
CREATE POLICY "Super admins can manage permissoes_cargo"
ON public.permissoes_cargo
FOR ALL
TO authenticated
USING (is_super_admin());

-- Criar tabela de logs de permissões
CREATE TABLE public.logs_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  usuario_nome TEXT NOT NULL,
  cargo_alterado_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  cargo_alterado_nome TEXT NOT NULL,
  acao TEXT NOT NULL, -- 'criou_cargo', 'editou_cargo', 'deletou_cargo', 'alterou_permissoes', 'clonou_permissoes'
  alteracoes JSONB,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.logs_permissoes ENABLE ROW LEVEL SECURITY;

-- Política para super admins
CREATE POLICY "Super admins can view logs_permissoes"
ON public.logs_permissoes
FOR SELECT
TO authenticated
USING (is_super_admin());

-- Política para inserir logs
CREATE POLICY "Authenticated users can insert logs"
ON public.logs_permissoes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_id);

-- Adicionar campo cargo_id na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN cargo_id UUID REFERENCES public.cargos(id);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_cargos_updated_at
  BEFORE UPDATE ON public.cargos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permissoes_cargo_updated_at
  BEFORE UPDATE ON public.permissoes_cargo
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir cargos padrão
INSERT INTO public.cargos (nome, descricao) VALUES
  ('Super Admin', 'Acesso total ao sistema'),
  ('Operador', 'Pode criar e editar tickets'),
  ('Visualizador', 'Apenas visualização');

-- Inserir permissões padrão
INSERT INTO public.permissoes_cargo (cargo_id, pode_criar_ticket, pode_editar_ticket, pode_excluir_ticket, pode_comentar, pode_editar_comentario, pode_excluir_comentario, pode_editar_comentario_proprio)
SELECT 
  c.id,
  CASE 
    WHEN c.nome = 'Super Admin' THEN true
    WHEN c.nome = 'Operador' THEN true
    ELSE false
  END,
  CASE 
    WHEN c.nome = 'Super Admin' THEN true
    WHEN c.nome = 'Operador' THEN true
    ELSE false
  END,
  CASE 
    WHEN c.nome = 'Super Admin' THEN true
    ELSE false
  END,
  CASE 
    WHEN c.nome IN ('Super Admin', 'Operador') THEN true
    ELSE false
  END,
  CASE 
    WHEN c.nome = 'Super Admin' THEN true
    ELSE false
  END,
  CASE 
    WHEN c.nome = 'Super Admin' THEN true
    ELSE false
  END,
  true
FROM public.cargos c;