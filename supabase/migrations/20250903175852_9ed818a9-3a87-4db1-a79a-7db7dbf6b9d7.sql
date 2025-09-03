-- Criar uma função para gerenciar atribuição de times às tags
CREATE OR REPLACE FUNCTION public.set_tag_team_assignment(
  p_tag_name text,
  p_team_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  current_assignments jsonb;
  tag_assignments jsonb;
BEGIN
  -- Buscar configurações atuais de tag-team
  SELECT setting_value INTO current_assignments
  FROM public.system_settings
  WHERE setting_key = 'tag_team_assignments'
  LIMIT 1;
  
  -- Se não existir, criar objeto vazio
  IF current_assignments IS NULL THEN
    current_assignments := '{}'::jsonb;
  END IF;
  
  -- Atualizar a atribuição para a tag específica
  IF p_team_id IS NULL THEN
    -- Remover atribuição
    current_assignments := current_assignments - p_tag_name;
  ELSE
    -- Adicionar/atualizar atribuição
    current_assignments := current_assignments || jsonb_build_object(p_tag_name, p_team_id);
  END IF;
  
  -- Salvar de volta na configuração
  INSERT INTO public.system_settings (setting_key, setting_value, created_by, updated_by)
  VALUES ('tag_team_assignments', current_assignments, auth.uid(), auth.uid())
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_by = auth.uid(),
    updated_at = now();
  
  -- Retornar resultado
  result := jsonb_build_object(
    'success', true,
    'tag_name', p_tag_name,
    'team_id', p_team_id,
    'assignments', current_assignments
  );
  
  RETURN result;
END;
$$;

-- Criar função para obter atribuições de tags
CREATE OR REPLACE FUNCTION public.get_tag_team_assignments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assignments jsonb;
BEGIN
  SELECT setting_value INTO assignments
  FROM public.system_settings
  WHERE setting_key = 'tag_team_assignments'
  LIMIT 1;
  
  RETURN COALESCE(assignments, '{}'::jsonb);
END;
$$;