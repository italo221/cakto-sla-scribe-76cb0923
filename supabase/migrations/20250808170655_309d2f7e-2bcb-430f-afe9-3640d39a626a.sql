-- Create helper functions for managing hidden tags using system_settings
-- This does NOT remove tags from existing tickets; it only hides them from suggestions.

-- Function: get_hidden_tags() -> text[]
CREATE OR REPLACE FUNCTION public.get_hidden_tags()
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  hidden jsonb;
  tags text[] := ARRAY[]::text[];
BEGIN
  SELECT setting_value INTO hidden
  FROM public.system_settings
  WHERE setting_key = 'hidden_tags'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF hidden IS NOT NULL THEN
    -- Expecting a JSON array of strings
    SELECT array_agg(value::text)
    INTO tags
    FROM jsonb_array_elements_text(hidden);
  END IF;

  RETURN COALESCE(tags, ARRAY[]::text[]);
END;
$$;

-- Function: add_hidden_tag(p_tag text) -> boolean
-- Only super admins can add; normalize to lowercase; create or update the setting.
CREATE OR REPLACE FUNCTION public.add_hidden_tag(p_tag text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  normalized text := lower(btrim(p_tag));
  existing jsonb;
  new_value jsonb;
BEGIN
  -- Permission check
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Apenas Super Administradores podem excluir tags do catálogo';
  END IF;

  IF normalized IS NULL OR normalized = '' THEN
    RETURN FALSE;
  END IF;

  SELECT setting_value INTO existing
  FROM public.system_settings
  WHERE setting_key = 'hidden_tags'
  LIMIT 1;

  IF existing IS NULL THEN
    -- create new record
    INSERT INTO public.system_settings(setting_key, setting_value)
    VALUES('hidden_tags', to_jsonb(ARRAY[normalized]))
    ON CONFLICT (id) DO NOTHING; -- id is PK; no conflict expected here
    RETURN TRUE;
  ELSE
    -- ensure normalized not already present
    IF NOT (EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(existing) AS e(val) WHERE lower(e.val) = normalized
    )) THEN
      new_value := (
        SELECT jsonb_agg(val)
        FROM (
          SELECT e.val
          FROM jsonb_array_elements_text(existing) AS e(val)
          UNION
          SELECT normalized
        ) s(val)
      );

      UPDATE public.system_settings
      SET setting_value = new_value,
          updated_at = now()
      WHERE setting_key = 'hidden_tags';
    END IF;
    RETURN TRUE;
  END IF;
END;
$$;