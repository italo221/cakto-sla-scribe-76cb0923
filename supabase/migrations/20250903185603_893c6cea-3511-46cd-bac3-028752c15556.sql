-- Simplificar a política para permitir qualquer usuário autenticado criar tags globais
DROP POLICY "Users can create tags in their teams or global tags" ON public.organized_tags;

CREATE POLICY "Authenticated users can create tags" 
ON public.organized_tags 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);