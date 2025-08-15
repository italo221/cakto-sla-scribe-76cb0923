-- Permitir comentários em tickets de qualquer setor
-- O setor_id do comentário deve ser o setor do usuário, não necessariamente o setor do ticket

DROP POLICY IF EXISTS "sla_comentarios_select_consolidated" ON public.sla_comentarios_internos;

-- Política de SELECT mais permissiva para colaboração entre setores
CREATE POLICY "sla_comentarios_select_cross_sector" 
ON public.sla_comentarios_internos 
FOR SELECT 
USING (
  is_admin() OR 
  user_has_setor_access(setor_id) OR 
  -- Permitir ver comentários de tickets que o usuário tem acesso
  EXISTS (
    SELECT 1 FROM sla_demandas sd 
    WHERE sd.id = sla_comentarios_internos.sla_id 
    AND (user_has_setor_access(sd.setor_id) OR is_admin())
  )
);