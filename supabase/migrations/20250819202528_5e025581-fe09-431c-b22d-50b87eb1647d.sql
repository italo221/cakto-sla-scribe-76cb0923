-- Corrigir função com search_path seguro
CREATE OR REPLACE FUNCTION public.update_first_in_progress_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Se o status mudou para em_andamento e ainda não há data registrada
  IF NEW.status = 'em_andamento' 
     AND OLD.status != 'em_andamento' 
     AND NEW.first_in_progress_at IS NULL THEN
    NEW.first_in_progress_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;