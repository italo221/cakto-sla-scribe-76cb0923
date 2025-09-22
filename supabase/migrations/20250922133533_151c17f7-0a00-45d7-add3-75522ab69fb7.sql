-- Remover tabela ticket_links e triggers relacionados
DROP TRIGGER IF EXISTS create_bidirectional_ticket_link_trigger ON public.ticket_links;
DROP FUNCTION IF EXISTS public.create_bidirectional_ticket_link();
DROP TABLE IF EXISTS public.ticket_links;