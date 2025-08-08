-- Create private storage bucket 'tickets' if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'tickets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('tickets', 'tickets', false);
  END IF;
END $$;

-- Create table for ticket attachments if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.sla_demandas(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful index for queries
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_created_at ON public.ticket_attachments(created_at);

-- Enable RLS
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "ta_select" ON public.ticket_attachments;
CREATE POLICY "ta_select"
ON public.ticket_attachments
FOR SELECT
TO authenticated
USING (
  -- Users who can access the related ticket can view its attachments
  is_admin() OR can_edit() OR EXISTS (
    SELECT 1 FROM public.sla_demandas s
    WHERE s.id = ticket_id
      AND (user_has_setor_access(s.setor_id) OR can_edit())
  )
);

DROP POLICY IF EXISTS "ta_insert" ON public.ticket_attachments;
CREATE POLICY "ta_insert"
ON public.ticket_attachments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

-- Storage policies for 'tickets' bucket
-- Allow authenticated users to upload into 'tickets' bucket
DROP POLICY IF EXISTS "Tickets bucket insert" ON storage.objects;
CREATE POLICY "Tickets bucket insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tickets' AND auth.uid() IS NOT NULL
);

-- Allow SELECT for users who can access the related ticket, by matching storage_path to object name
DROP POLICY IF EXISTS "Tickets bucket select" ON storage.objects;
CREATE POLICY "Tickets bucket select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tickets'
  AND EXISTS (
    SELECT 1
    FROM public.ticket_attachments ta
    JOIN public.sla_demandas s ON s.id = ta.ticket_id
    WHERE ta.storage_path = name
      AND (is_admin() OR can_edit() OR user_has_setor_access(s.setor_id))
  )
);
