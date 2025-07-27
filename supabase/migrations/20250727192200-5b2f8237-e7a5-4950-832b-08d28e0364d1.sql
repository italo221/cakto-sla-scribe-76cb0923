-- Fix missing RLS policies for comments
-- Add UPDATE policy for comments
CREATE POLICY "comentarios_update_admin_or_own" 
ON public.sla_comentarios_internos 
FOR UPDATE 
USING (is_admin() OR (auth.uid() = autor_id))
WITH CHECK (is_admin() OR (auth.uid() = autor_id));

-- Add DELETE policy for comments  
CREATE POLICY "comentarios_delete_admin_or_own"
ON public.sla_comentarios_internos
FOR DELETE 
USING (is_admin() OR (auth.uid() = autor_id));

-- Add updated_at column to comments for better tracking
ALTER TABLE public.sla_comentarios_internos 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to update the updated_at column automatically
CREATE TRIGGER update_sla_comentarios_updated_at
BEFORE UPDATE ON public.sla_comentarios_internos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();