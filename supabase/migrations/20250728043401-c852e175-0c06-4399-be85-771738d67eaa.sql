-- Corrigir função para ter search_path fixo (resolver security warning)
CREATE OR REPLACE FUNCTION public.delete_ticket_cascade(ticket_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Deletar comentários primeiro
  DELETE FROM public.sla_comentarios_internos WHERE sla_id = ticket_id;
  
  -- Deletar logs de ação
  DELETE FROM public.sla_action_logs WHERE sla_id = ticket_id;
  
  -- Deletar logs gerais (esta função tem SECURITY DEFINER então pode deletar)
  DELETE FROM public.sla_logs WHERE id_demanda = ticket_id;
  
  -- Deletar o ticket
  DELETE FROM public.sla_demandas WHERE id = ticket_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;