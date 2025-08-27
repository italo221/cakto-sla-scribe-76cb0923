-- Criar tabela para gerenciar links externos de tickets
CREATE TABLE public.ticket_external_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  has_password BOOLEAN NOT NULL DEFAULT false,
  password_hash TEXT,
  include_attachments BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  config JSONB DEFAULT '{}'::jsonb
);

-- Criar tabela para log de acessos aos links externos
CREATE TABLE public.ticket_external_link_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.ticket_external_links(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true
);

-- Habilitar RLS
ALTER TABLE public.ticket_external_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_external_link_views ENABLE ROW LEVEL SECURITY;

-- Políticas para ticket_external_links
CREATE POLICY "Users can view links for tickets they can access" 
ON public.ticket_external_links 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create external links" 
ON public.ticket_external_links 
FOR INSERT 
WITH CHECK (auth.uid() = created_by AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own links or admins can update any" 
ON public.ticket_external_links 
FOR UPDATE 
USING (auth.uid() = created_by OR is_admin());

CREATE POLICY "Super admins can delete any link" 
ON public.ticket_external_links 
FOR DELETE 
USING (is_super_admin());

-- Políticas para ticket_external_link_views
CREATE POLICY "Anyone can insert view logs" 
ON public.ticket_external_link_views 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view logs for their links" 
ON public.ticket_external_link_views 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.ticket_external_links tel 
    WHERE tel.id = link_id 
    AND (tel.created_by = auth.uid() OR is_admin())
  )
);

-- Função para gerar token único
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Função para registrar acesso ao link externo
CREATE OR REPLACE FUNCTION public.log_external_link_access(
  p_token TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

-- Função para validar link externo
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
SET search_path TO ''
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