-- Criar tabela para vínculos entre tickets
CREATE TABLE IF NOT EXISTS public.ticket_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_ticket_id UUID NOT NULL,
  target_ticket_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT ticket_links_source_fkey FOREIGN KEY (source_ticket_id) REFERENCES public.sla_demandas(id) ON DELETE CASCADE,
  CONSTRAINT ticket_links_target_fkey FOREIGN KEY (target_ticket_id) REFERENCES public.sla_demandas(id) ON DELETE CASCADE,
  CONSTRAINT ticket_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT ticket_links_no_self_link CHECK (source_ticket_id != target_ticket_id),
  CONSTRAINT ticket_links_unique_link UNIQUE (source_ticket_id, target_ticket_id)
);

-- Habilitar RLS
ALTER TABLE public.ticket_links ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view ticket links" 
ON public.ticket_links 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create ticket links" 
ON public.ticket_links 
FOR INSERT 
WITH CHECK (auth.uid() = created_by AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own ticket links" 
ON public.ticket_links 
FOR DELETE 
USING (auth.uid() = created_by OR is_admin());

-- Trigger para automaticamente criar vínculo bidirecional
CREATE OR REPLACE FUNCTION public.create_bidirectional_ticket_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar o vínculo reverso se não existir
  INSERT INTO public.ticket_links (source_ticket_id, target_ticket_id, created_by)
  VALUES (NEW.target_ticket_id, NEW.source_ticket_id, NEW.created_by)
  ON CONFLICT (source_ticket_id, target_ticket_id) DO NOTHING;
  
  -- Registrar no histórico do ticket de origem
  PERFORM public.log_sla_action(
    NEW.source_ticket_id,
    'ticket_vinculado',
    NULL,
    NULL,
    'Ticket vinculado a ' || (SELECT ticket_number FROM public.sla_demandas WHERE id = NEW.target_ticket_id),
    NULL,
    jsonb_build_object('ticket_vinculado_id', NEW.target_ticket_id)
  );
  
  -- Registrar no histórico do ticket de destino
  PERFORM public.log_sla_action(
    NEW.target_ticket_id,
    'ticket_vinculado',
    NULL,
    NULL,
    'Ticket vinculado a ' || (SELECT ticket_number FROM public.sla_demandas WHERE id = NEW.source_ticket_id),
    NULL,
    jsonb_build_object('ticket_vinculado_id', NEW.source_ticket_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;