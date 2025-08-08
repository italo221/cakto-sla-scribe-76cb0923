-- Update storage.objects select policy for 'tickets' to allow owners to read their own uploads
DROP POLICY IF EXISTS "Tickets bucket select" ON storage.objects;
CREATE POLICY "Tickets bucket select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tickets' AND (
    owner = auth.uid()::text OR EXISTS (
      SELECT 1
      FROM public.ticket_attachments ta
      JOIN public.sla_demandas s ON s.id = ta.ticket_id
      WHERE ta.storage_path = name
        AND (is_admin() OR can_edit() OR user_has_setor_access(s.setor_id))
    )
  )
);
