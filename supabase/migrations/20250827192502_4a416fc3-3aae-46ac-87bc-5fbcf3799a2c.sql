-- Corrigir search_path das funções criadas anteriormente
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar token de 32 caracteres aleatórios
    token := encode(gen_random_bytes(24), 'base64');
    -- Remover caracteres problemáticos para URLs
    token := replace(replace(replace(token, '/', '_'), '+', '-'), '=', '');
    
    -- Verificar se o token já existe
    SELECT EXISTS(SELECT 1 FROM public.ticket_external_links WHERE token = token) INTO token_exists;
    
    -- Se não existe, usar este token
    IF NOT token_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN token;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_external_link(p_token TEXT)
RETURNS TABLE(
  ticket_id UUID,
  include_attachments BOOLEAN,
  has_password BOOLEAN,
  password_hash TEXT,
  view_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tel.ticket_id,
    tel.include_attachments,
    tel.has_password,
    tel.password_hash,
    tel.view_count
  FROM public.ticket_external_links tel
  WHERE tel.token = p_token
    AND tel.revoked_at IS NULL
    AND (tel.expires_at IS NULL OR tel.expires_at > now());
END;
$$;