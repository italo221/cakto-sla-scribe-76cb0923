-- Permitir que usuários autenticados comentem em tickets de qualquer setor
-- Mantém segurança básica mas permite colaboração entre setores

DROP POLICY IF EXISTS "comentarios_insert_setor" ON public.sla_comentarios_internos;

CREATE POLICY "comentarios_insert_authenticated" 
ON public.sla_comentarios_internos 
FOR INSERT 
WITH CHECK (auth.uid() = autor_id AND auth.uid() IS NOT NULL);