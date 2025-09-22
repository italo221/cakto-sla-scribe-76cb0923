-- Criar tabela para subtickets
CREATE TABLE public.subtickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_ticket_id UUID NOT NULL,
  child_ticket_id UUID NOT NULL,
  sequence_number INTEGER NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT subtickets_parent_ticket_fk FOREIGN KEY (parent_ticket_id) REFERENCES public.sla_demandas(id) ON DELETE CASCADE,
  CONSTRAINT subtickets_child_ticket_fk FOREIGN KEY (child_ticket_id) REFERENCES public.sla_demandas(id) ON DELETE CASCADE,
  CONSTRAINT subtickets_unique_child UNIQUE (child_ticket_id),
  CONSTRAINT subtickets_unique_parent_sequence UNIQUE (parent_ticket_id, sequence_number)
);

-- Enable RLS
ALTER TABLE public.subtickets ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view subtickets" 
ON public.subtickets 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create subtickets" 
ON public.subtickets 
FOR INSERT 
WITH CHECK (auth.uid() = created_by AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete subtickets" 
ON public.subtickets 
FOR DELETE 
USING (is_admin());

-- Função para obter próximo número sequencial de subticket
CREATE OR REPLACE FUNCTION public.get_next_subticket_sequence(p_parent_ticket_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  next_sequence INTEGER;
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1 
  INTO next_sequence
  FROM public.subtickets 
  WHERE parent_ticket_id = p_parent_ticket_id;
  
  RETURN next_sequence;
END;
$function$;

-- Função para prevenir exclusão de ticket pai com subtickets ativos
CREATE OR REPLACE FUNCTION public.prevent_parent_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  active_subtickets_count INTEGER;
BEGIN
  -- Verificar se o ticket tem subtickets ativos
  SELECT COUNT(*) INTO active_subtickets_count
  FROM public.subtickets s
  JOIN public.sla_demandas child ON s.child_ticket_id = child.id
  WHERE s.parent_ticket_id = OLD.id
    AND child.status NOT IN ('fechado', 'cancelado');
  
  IF active_subtickets_count > 0 THEN
    RAISE EXCEPTION 'Não é possível excluir ticket que possui % subticket(s) ativo(s)', active_subtickets_count;
  END IF;
  
  RETURN OLD;
END;
$function$;

-- Trigger para prevenir exclusão de pai com subtickets ativos
CREATE TRIGGER prevent_parent_ticket_deletion
  BEFORE DELETE ON public.sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_parent_deletion();

-- Função para registrar criação de subticket no histórico do pai
CREATE OR REPLACE FUNCTION public.log_subticket_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  parent_ticket RECORD;
  child_ticket RECORD;
  author_name TEXT;
BEGIN
  -- Buscar dados do ticket pai
  SELECT ticket_number, titulo INTO parent_ticket
  FROM public.sla_demandas
  WHERE id = NEW.parent_ticket_id;
  
  -- Buscar dados do subticket
  SELECT ticket_number, titulo INTO child_ticket
  FROM public.sla_demandas
  WHERE id = NEW.child_ticket_id;
  
  -- Buscar nome do autor
  SELECT nome_completo INTO author_name
  FROM public.profiles
  WHERE user_id = NEW.created_by;
  
  -- Registrar no histórico do ticket pai
  PERFORM public.log_sla_action(
    NEW.parent_ticket_id,
    'subticket_criado',
    NULL,
    NULL,
    'Subticket #' || NEW.sequence_number::text || ' (' || child_ticket.ticket_number || ') criado por ' || COALESCE(author_name, 'Usuário'),
    NULL,
    jsonb_build_object(
      'subticket_id', NEW.child_ticket_id,
      'subticket_number', child_ticket.ticket_number,
      'sequence_number', NEW.sequence_number
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Trigger para registrar criação de subticket
CREATE TRIGGER log_subticket_creation_trigger
  AFTER INSERT ON public.subtickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_subticket_creation();