-- Add comment_id to ticket_attachments and policies
BEGIN;

-- Add nullable comment_id column
ALTER TABLE public.ticket_attachments
ADD COLUMN IF NOT EXISTS comment_id uuid;

-- Add foreign key to comments table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sla_comentarios_internos'
  ) THEN
    -- Drop existing FK if present to avoid duplicates
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public' 
        AND table_name = 'ticket_attachments' 
        AND constraint_name = 'ticket_attachments_comment_id_fkey'
    ) THEN
      ALTER TABLE public.ticket_attachments 
      DROP CONSTRAINT ticket_attachments_comment_id_fkey;
    END IF;

    ALTER TABLE public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_comment_id_fkey
    FOREIGN KEY (comment_id)
    REFERENCES public.sla_comentarios_internos(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_comment_id 
  ON public.ticket_attachments(comment_id);

-- Ensure RLS is enabled
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Allow users to update their own attachments (e.g., set comment_id)
DROP POLICY IF EXISTS "Users can update their own attachments" ON public.ticket_attachments;
CREATE POLICY "Users can update their own attachments"
ON public.ticket_attachments
FOR UPDATE
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

COMMIT;