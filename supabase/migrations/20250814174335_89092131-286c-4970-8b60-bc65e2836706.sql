-- Criar tabela para tickets fixados por time
CREATE TABLE public.team_ticket_pins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  ticket_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  pinned_by UUID NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint para garantir que um ticket só pode ser fixado uma vez por time
  UNIQUE(team_id, ticket_id)
);

-- Habilitar RLS
ALTER TABLE public.team_ticket_pins ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Membros do time podem ver pins do seu time
CREATE POLICY "team_members_can_view_pins" 
ON public.team_ticket_pins 
FOR SELECT 
USING (
  user_has_setor_access(team_id) OR is_admin()
);

-- Membros do time podem fixar tickets do seu time
CREATE POLICY "team_members_can_pin_tickets" 
ON public.team_ticket_pins 
FOR INSERT 
WITH CHECK (
  (user_has_setor_access(team_id) OR is_admin()) AND auth.uid() = pinned_by
);

-- Membros do time podem atualizar posição dos pins do seu time
CREATE POLICY "team_members_can_update_pins" 
ON public.team_ticket_pins 
FOR UPDATE 
USING (
  user_has_setor_access(team_id) OR is_admin()
)
WITH CHECK (
  user_has_setor_access(team_id) OR is_admin()
);

-- Membros do time podem desafixar tickets do seu time
CREATE POLICY "team_members_can_unpin_tickets" 
ON public.team_ticket_pins 
FOR DELETE 
USING (
  user_has_setor_access(team_id) OR is_admin()
);

-- Função para fixar ticket com verificação de limite
CREATE OR REPLACE FUNCTION public.pin_ticket(p_team_id UUID, p_ticket_id UUID)
RETURNS BOOLEAN
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
  IF NOT (user_has_setor_access(p_team_id) OR is_admin()) THEN
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

-- Função para desafixar ticket
CREATE OR REPLACE FUNCTION public.unpin_ticket(p_team_id UUID, p_ticket_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Verificar se usuário tem permissão
  IF NOT (user_has_setor_access(p_team_id) OR is_admin()) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para desafixar tickets neste time';
  END IF;
  
  -- Deletar pin
  DELETE FROM public.team_ticket_pins
  WHERE team_id = p_team_id AND ticket_id = p_ticket_id;
END;
$function$;

-- Função para reordenar pins
CREATE OR REPLACE FUNCTION public.reorder_pins(p_team_id UUID, p_ticket_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  ticket_id UUID;
  pos INTEGER := 0;
BEGIN
  -- Verificar se usuário tem permissão
  IF NOT (user_has_setor_access(p_team_id) OR is_admin()) THEN
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