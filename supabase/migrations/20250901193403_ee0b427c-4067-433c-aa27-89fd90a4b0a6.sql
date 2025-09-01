-- Inserir tags legadas usando subconsulta correta
WITH tag_extraction AS (
  SELECT DISTINCT unnest(tags) as tag_name
  FROM public.sla_demandas 
  WHERE tags IS NOT NULL 
    AND array_length(tags, 1) > 0
),
clean_tags AS (
  SELECT lower(trim(tag_name)) as clean_name
  FROM tag_extraction
  WHERE trim(tag_name) != ''
)
INSERT INTO public.organized_tags (name, is_global, created_by)
SELECT clean_name, true, null
FROM clean_tags
ON CONFLICT (name, team_id) DO NOTHING;