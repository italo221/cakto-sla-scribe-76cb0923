-- Corrigir a última função sem search_path
CREATE OR REPLACE FUNCTION public.log_external_link_access(
  p_token TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  link_id UUID;
BEGIN
  -- Buscar o link pelo token
  SELECT id INTO link_id
  FROM public.ticket_external_links
  WHERE token = p_token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());
  
  -- Se link não encontrado ou expirado, retornar false
  IF link_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Registrar o acesso
  INSERT INTO public.ticket_external_link_views (link_id, ip_address, user_agent, success)
  VALUES (link_id, p_ip_address, p_user_agent, p_success);
  
  -- Atualizar contador e última visualização
  UPDATE public.ticket_external_links
  SET 
    view_count = view_count + 1,
    last_viewed_at = now()
  WHERE id = link_id;
  
  RETURN true;
END;
$$;