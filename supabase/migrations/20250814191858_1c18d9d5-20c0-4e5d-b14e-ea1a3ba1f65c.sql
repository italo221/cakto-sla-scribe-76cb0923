-- Recreate the update_ticket_deadline function with correct enum usage
CREATE OR REPLACE FUNCTION public.update_ticket_deadline(
  p_ticket_id uuid, 
  p_deadline timestamp with time zone, 
  p_actor_id uuid DEFAULT auth.uid(), 
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  old_deadline timestamp with time zone;
  ticket_data jsonb;
  actor_name text;
BEGIN
  -- Get current deadline and actor name
  SELECT prazo_interno INTO old_deadline
  FROM public.sla_demandas
  WHERE id = p_ticket_id;
  
  SELECT nome_completo INTO actor_name
  FROM public.profiles
  WHERE user_id = p_actor_id;
  
  -- Update ticket deadline
  UPDATE public.sla_demandas
  SET 
    prazo_interno = p_deadline,
    updated_at = now()
  WHERE id = p_ticket_id;
  
  -- Log SLA event using string values that will be cast to enum
  INSERT INTO public.ticket_sla_events (
    ticket_id,
    action,
    old_deadline,
    new_deadline,
    actor_id,
    note
  ) VALUES (
    p_ticket_id,
    CASE 
      WHEN old_deadline IS NULL THEN 'SET_CUSTOM'::sla_event_action
      ELSE 'OVERRIDE'::sla_event_action
    END,
    old_deadline,
    p_deadline,
    p_actor_id,
    p_note
  );
  
  -- Add to ticket history
  INSERT INTO public.sla_action_logs (
    sla_id,
    acao,
    autor_id,
    autor_email,
    justificativa,
    dados_anteriores,
    dados_novos
  ) VALUES (
    p_ticket_id,
    CASE 
      WHEN old_deadline IS NULL THEN 'definir_prazo'
      ELSE 'alterar_prazo'
    END,
    p_actor_id,
    COALESCE((SELECT email FROM public.profiles WHERE user_id = p_actor_id), 'usuario@desconhecido'),
    COALESCE(
      'Prazo ' || 
      CASE WHEN old_deadline IS NULL THEN 'definido' ELSE 'alterado' END ||
      ' por ' || COALESCE(actor_name, 'Usuário') ||
      ' para ' || to_char(p_deadline, 'DD/MM/YYYY HH24:MI'),
      'Prazo atualizado'
    ),
    CASE WHEN old_deadline IS NOT NULL THEN jsonb_build_object('prazo_anterior', old_deadline) ELSE NULL END,
    jsonb_build_object('prazo_novo', p_deadline)
  );
  
  -- Return updated ticket data
  SELECT to_jsonb(t.*) INTO ticket_data
  FROM public.sla_demandas t
  WHERE id = p_ticket_id;
  
  RETURN ticket_data;
END;
$$;