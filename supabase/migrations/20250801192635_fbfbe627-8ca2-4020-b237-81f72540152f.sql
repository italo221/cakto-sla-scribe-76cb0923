-- Verificar e recriar triggers para notificações automáticas

-- Primeiro, dropar triggers existentes se houver
DROP TRIGGER IF EXISTS trigger_notify_ticket_status_change ON public.sla_demandas;
DROP TRIGGER IF EXISTS trigger_notify_ticket_setor_change ON public.sla_demandas;

-- Recriar triggers com sintaxe correta
CREATE TRIGGER trigger_notify_ticket_status_change
  AFTER UPDATE ON public.sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_status_change();

CREATE TRIGGER trigger_notify_ticket_setor_change
  AFTER UPDATE ON public.sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_setor_change();