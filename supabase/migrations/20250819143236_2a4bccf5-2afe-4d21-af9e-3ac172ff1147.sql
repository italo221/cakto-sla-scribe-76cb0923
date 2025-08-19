-- Atualizar política de SELECT para comentários internos para ser mais permissiva
DROP POLICY IF EXISTS "sla_comentarios_select_cross_sector" ON sla_comentarios_internos;
CREATE POLICY "sla_comentarios_select_all_authenticated" 
ON sla_comentarios_internos 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Atualizar política de SELECT para anexos de tickets
DROP POLICY IF EXISTS "ta_select" ON ticket_attachments;
CREATE POLICY "ta_select_all_authenticated" 
ON ticket_attachments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Atualizar política de SELECT para eventos SLA
DROP POLICY IF EXISTS "ticket_sla_events_select_access" ON ticket_sla_events;
CREATE POLICY "ticket_sla_events_select_all_authenticated" 
ON ticket_sla_events 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Atualizar política de SELECT para logs de ação SLA
DROP POLICY IF EXISTS "sla_action_logs_select_consolidated" ON sla_action_logs;
CREATE POLICY "sla_action_logs_select_all_authenticated" 
ON sla_action_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);