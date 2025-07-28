-- Criar tabela de permissões por setor
CREATE TABLE IF NOT EXISTS public.setor_permissoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  pode_criar_ticket BOOLEAN NOT NULL DEFAULT false,
  pode_editar_ticket BOOLEAN NOT NULL DEFAULT false,
  pode_excluir_ticket BOOLEAN NOT NULL DEFAULT false,
  pode_comentar BOOLEAN NOT NULL DEFAULT false,
  pode_resolver_ticket BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(setor_id)
);

-- Adicionar campo de liderança na tabela user_setores
ALTER TABLE public.user_setores 
ADD COLUMN IF NOT EXISTS is_leader BOOLEAN NOT NULL DEFAULT false;

-- Habilitar RLS na nova tabela
ALTER TABLE public.setor_permissoes ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para setor_permissoes
CREATE POLICY "Super admins can manage setor permissions" 
ON public.setor_permissoes 
FOR ALL 
TO authenticated 
USING (is_super_admin());

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_setor_permissoes_updated_at
  BEFORE UPDATE ON public.setor_permissoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();