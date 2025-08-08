-- Add comment_id to ticket_attachments and RLS policies to support updating and deleting own attachments
BEGIN;

-- 1) Add nullable comment_id column
ALTER TABLE public.ticket_attachments
ADD COLUMN IF NOT EXISTS comment_id UUID NULL;

-- 2) Index to speed up lookups by comment
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_comment_id
ON public.ticket_attachments (comment_id);

-- 3) Allow users to update their own attachments (e.g., to set comment_id)
DROP POLICY IF EXISTS ta_update_own ON public.ticket_attachments;
CREATE POLICY ta_update_own
ON public.ticket_attachments
FOR UPDATE
USING (auth.uid() = uploaded_by)
WITH CHECK (auth.uid() = uploaded_by);

-- 4) Allow users to delete their own attachments (e.g., if they remove before sending)
DROP POLICY IF EXISTS ta_delete_own ON public.ticket_attachments;
CREATE POLICY ta_delete_own
ON public.ticket_attachments
FOR DELETE
USING (auth.uid() = uploaded_by);

COMMIT;