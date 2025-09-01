-- Inserir tags legadas manualmente na tabela organized_tags como globais
INSERT INTO public.organized_tags (name, is_global, created_by)
SELECT DISTINCT 
  lower(trim(unnest(tags))) as name,
  true as is_global,
  null as created_by
FROM public.sla_demandas 
WHERE tags IS NOT NULL 
  AND array_length(tags, 1) > 0
  AND trim(unnest(tags)) != ''
ON CONFLICT (name, team_id) DO NOTHING;