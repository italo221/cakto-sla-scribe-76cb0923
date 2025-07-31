-- Criar tabela para likes em comentários
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'dislike', 'thumbs_up', 'thumbs_down', 'heart', 'check')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para comment_reactions
CREATE POLICY "Users can view comment reactions" 
ON public.comment_reactions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own reactions" 
ON public.comment_reactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" 
ON public.comment_reactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_comment_reactions_updated_at
BEFORE UPDATE ON public.comment_reactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();