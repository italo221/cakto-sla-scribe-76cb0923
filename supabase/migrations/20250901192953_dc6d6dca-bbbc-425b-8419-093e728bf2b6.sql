-- Criar tabela de tags organizadas (opcional, para quem quiser usar a nova funcionalidade)
CREATE TABLE IF NOT EXISTS public.organized_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  team_id UUID REFERENCES public.setores(id) ON DELETE CASCADE,  -- team_id pode ser null (tags globais)
  sector_id UUID REFERENCES public.setores(id) ON DELETE SET NULL, -- setor pode ser null
  is_global BOOLEAN NOT NULL DEFAULT false, -- tag global (visível para todos)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Índices para performance
  CONSTRAINT organized_tags_name_team_unique UNIQUE(name, team_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_organized_tags_team_id ON public.organized_tags(team_id);
CREATE INDEX IF NOT EXISTS idx_organized_tags_sector_id ON public.organized_tags(sector_id);
CREATE INDEX IF NOT EXISTS idx_organized_tags_global ON public.organized_tags(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_organized_tags_name ON public.organized_tags(name);

-- Enable RLS
ALTER TABLE public.organized_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies para organized_tags
-- Usuários podem ver tags de seus setores + tags globais
CREATE POLICY "Users can view their team tags and global tags" 
ON public.organized_tags 
FOR SELECT 
USING (
  is_global = true OR 
  team_id IS NULL OR 
  team_id IN (
    SELECT us.setor_id 
    FROM public.user_setores us 
    WHERE us.user_id = auth.uid()
  ) OR
  public.is_admin()
);

-- Usuários podem criar tags nos seus setores
CREATE POLICY "Users can create tags in their teams" 
ON public.organized_tags 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND (
    team_id IS NULL OR 
    team_id IN (
      SELECT us.setor_id 
      FROM public.user_setores us 
      WHERE us.user_id = auth.uid()
    ) OR
    public.is_admin()
  )
);

-- Usuários podem atualizar tags que criaram ou admins podem atualizar qualquer uma
CREATE POLICY "Users can update their own tags or admins can update any" 
ON public.organized_tags 
FOR UPDATE 
USING (
  auth.uid() = created_by OR public.is_admin()
);

-- Apenas admins podem deletar tags
CREATE POLICY "Only admins can delete tags" 
ON public.organized_tags 
FOR DELETE 
USING (public.is_admin());

-- Função para migrar tags existentes (opcional, não quebra nada)
CREATE OR REPLACE FUNCTION public.migrate_existing_tags_to_organized()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  tag_name TEXT;
  existing_tags TEXT[];
BEGIN
  -- Extrair todas as tags únicas dos tickets existentes
  SELECT array_agg(DISTINCT unnest_tag) INTO existing_tags
  FROM (
    SELECT unnest(tags) as unnest_tag
    FROM public.sla_demandas 
    WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
  ) t
  WHERE unnest_tag IS NOT NULL AND trim(unnest_tag) != '';

  -- Inserir como tags globais (não quebra nada)
  IF existing_tags IS NOT NULL THEN
    FOREACH tag_name IN ARRAY existing_tags LOOP
      INSERT INTO public.organized_tags (name, is_global, created_by)
      VALUES (lower(trim(tag_name)), true, null)
      ON CONFLICT (name, team_id) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

-- Função para buscar tags organizadas com filtros
CREATE OR REPLACE FUNCTION public.get_organized_tags(
  p_team_id UUID DEFAULT NULL,
  p_sector_id UUID DEFAULT NULL,
  p_include_global BOOLEAN DEFAULT true
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  team_id UUID,
  sector_id UUID,
  team_name TEXT,
  sector_name TEXT,
  is_global BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ot.id,
    ot.name,
    ot.team_id,
    ot.sector_id,
    t.nome as team_name,
    s.nome as sector_name,
    ot.is_global,
    ot.created_at
  FROM public.organized_tags ot
  LEFT JOIN public.setores t ON ot.team_id = t.id
  LEFT JOIN public.setores s ON ot.sector_id = s.id
  WHERE (
    -- Filtro por team
    (p_team_id IS NULL) OR 
    (ot.team_id = p_team_id) OR
    (p_include_global = true AND ot.is_global = true)
  )
  AND (
    -- Filtro por setor
    (p_sector_id IS NULL) OR 
    (ot.sector_id = p_sector_id)
  )
  AND (
    -- Verificar permissões
    ot.is_global = true OR 
    ot.team_id IS NULL OR 
    ot.team_id IN (
      SELECT us.setor_id 
      FROM public.user_setores us 
      WHERE us.user_id = auth.uid()
    ) OR
    public.is_admin()
  )
  ORDER BY ot.name;
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_organized_tags_updated_at
BEFORE UPDATE ON public.organized_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();