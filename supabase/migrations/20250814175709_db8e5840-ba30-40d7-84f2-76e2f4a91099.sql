-- Fix search path issue by adding public. prefix to function calls
CREATE OR REPLACE FUNCTION public.pin_ticket(p_team_id uuid, p_ticket_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  pin_count INTEGER;
  max_position INTEGER;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Verificar se usuário tem permissão
  IF NOT (public.user_has_setor_access(p_team_id, current_user_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para fixar tickets neste time';
  END IF;
  
  -- Contar pins atuais do time
  SELECT COUNT(*) INTO pin_count
  FROM public.team_ticket_pins
  WHERE team_id = p_team_id;
  
  -- Verificar limite de 5 pins por time
  IF pin_count >= 5 THEN
    RETURN FALSE; -- Retorna false quando limite é atingido
  END IF;
  
  -- Obter próxima posição
  SELECT COALESCE(MAX(position), -1) + 1 INTO max_position
  FROM public.team_ticket_pins
  WHERE team_id = p_team_id;
  
  -- Inserir pin
  INSERT INTO public.team_ticket_pins (team_id, ticket_id, position, pinned_by)
  VALUES (p_team_id, p_ticket_id, max_position, current_user_id)
  ON CONFLICT (team_id, ticket_id) DO NOTHING;
  
  RETURN TRUE;
END;
$function$;

-- Also fix the unpin_ticket function
CREATE OR REPLACE FUNCTION public.unpin_ticket(p_team_id uuid, p_ticket_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Verificar se usuário tem permissão
  IF NOT (public.user_has_setor_access(p_team_id, auth.uid()) OR public.is_admin()) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para desafixar tickets neste time';
  END IF;
  
  -- Deletar pin
  DELETE FROM public.team_ticket_pins
  WHERE team_id = p_team_id AND ticket_id = p_ticket_id;
END;
$function$;

-- Also fix the reorder_pins function
CREATE OR REPLACE FUNCTION public.reorder_pins(p_team_id uuid, p_ticket_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  ticket_id UUID;
  pos INTEGER := 0;
BEGIN
  -- Verificar se usuário tem permissão
  IF NOT (public.user_has_setor_access(p_team_id, auth.uid()) OR public.is_admin()) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para reordenar pins neste time';
  END IF;
  
  -- Atualizar posições
  FOREACH ticket_id IN ARRAY p_ticket_ids
  LOOP
    UPDATE public.team_ticket_pins
    SET position = pos
    WHERE team_id = p_team_id AND ticket_id = ticket_id;
    
    pos := pos + 1;
  END LOOP;
END;
$function$;