-- Adicionar campo para anexos nos comentários
ALTER TABLE public.sla_comentarios_internos 
ADD COLUMN anexos jsonb DEFAULT '[]'::jsonb;

-- Criar bucket para anexos de comentários SLA
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sla-anexos', 'sla-anexos', false);

-- Política para usuários autenticados visualizarem seus próprios anexos
CREATE POLICY "Usuários podem ver anexos de SLAs que têm acesso" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'sla-anexos' 
  AND (
    -- Admins podem ver tudo
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'administrador_master')
    OR
    -- Usuários podem ver anexos de SLAs do seu setor
    EXISTS (
      SELECT 1 FROM public.sla_demandas s
      JOIN public.user_setores us ON s.setor_id = us.setor_id
      WHERE us.user_id = auth.uid()
      AND (storage.foldername(name))[1] = s.id::text
    )
  )
);

-- Política para upload de anexos
CREATE POLICY "Usuários podem fazer upload de anexos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'sla-anexos' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Admins podem fazer upload
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'administrador_master')
    OR
    -- Usuários podem fazer upload em SLAs do seu setor
    EXISTS (
      SELECT 1 FROM public.sla_demandas s
      JOIN public.user_setores us ON s.setor_id = us.setor_id
      WHERE us.user_id = auth.uid()
      AND (storage.foldername(name))[1] = s.id::text
    )
  )
);

-- Política para deletar anexos (apenas o autor do comentário ou admin)
CREATE POLICY "Autor ou admin podem deletar anexos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'sla-anexos' 
  AND (
    -- Admin pode deletar tudo
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'administrador_master')
    OR
    -- Autor do comentário pode deletar seus anexos
    EXISTS (
      SELECT 1 FROM public.sla_comentarios_internos c
      WHERE c.autor_id = auth.uid()
      AND (storage.foldername(name))[1] || '/' || (storage.foldername(name))[2] = c.sla_id::text || '/' || c.id::text
    )
  )
);