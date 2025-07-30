-- Adicionar campos para link de referência e anexos na tabela sla_demandas
ALTER TABLE public.sla_demandas 
ADD COLUMN IF NOT EXISTS link_referencia TEXT,
ADD COLUMN IF NOT EXISTS anexos JSONB DEFAULT '[]'::jsonb;

-- Comentários dos novos campos
COMMENT ON COLUMN public.sla_demandas.link_referencia IS 'Link de referência opcional (URL)';
COMMENT ON COLUMN public.sla_demandas.anexos IS 'Array JSON com informações dos anexos (imagens e vídeos)';

-- Configurar bucket de anexos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ticket-anexos', 'ticket-anexos', true, 26214400, ARRAY['image/png', 'image/jpg', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['image/png', 'image/jpg', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm'];

-- Políticas para o bucket de anexos
CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-anexos' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can view ticket attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ticket-anexos' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own ticket attachments"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'ticket-anexos' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own ticket attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ticket-anexos' AND
  auth.uid() IS NOT NULL
);