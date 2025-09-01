-- Corrigir warning de search_path nas funções criadas
DROP FUNCTION IF EXISTS public.migrate_existing_tags_to_organized();
DROP FUNCTION IF EXISTS public.get_organized_tags(UUID, UUID, BOOLEAN);

-- Recriar função para migrar tags existentes com search_path seguro
CREATE OR REPLACE FUNCTION public.migrate_existing_tags_to_organized()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  tag_name TEXT;
  existing_tags TEXT[];
BEGIN
  -- Extrair todas as tags únicas dos tickets existentes
  SELECT array_agg(DISTINCT unnest_tag) INTO existing_tags
  FROM (
    SELECT unnest(tags) as unnest_tag
    FROM sla_demandas 
    WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
  ) t
  WHERE unnest_tag IS NOT NULL AND trim(unnest_tag) != '';

  -- Inserir como tags globais (não quebra nada)
  IF existing_tags IS NOT NULL THEN
    FOREACH tag_name IN ARRAY existing_tags LOOP
      INSERT INTO organized_tags (name, is_global, created_by)
      VALUES (lower(trim(tag_name)), true, null)
      ON CONFLICT (name, team_id) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

-- Recriar função para buscar tags organizadas com search_path seguro
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
SET search_path = 'public'
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
  FROM organized_tags ot
  LEFT JOIN setores t ON ot.team_id = t.id
  LEFT JOIN setores s ON ot.sector_id = s.id
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
      FROM user_setores us 
      WHERE us.user_id = auth.uid()
    ) OR
    is_admin()
  )
  ORDER BY ot.name;
END;
$$;