-- Criar trigger para registrar vínculos bidirecionais
CREATE TRIGGER create_bidirectional_link_trigger
  AFTER INSERT ON public.ticket_links
  FOR EACH ROW
  EXECUTE FUNCTION public.create_bidirectional_ticket_link();