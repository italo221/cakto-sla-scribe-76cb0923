-- Verificar funções existentes e recriar triggers
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('notify_ticket_status_change', 'notify_ticket_setor_change');

-- Criar triggers novamente usando PROCEDURE ao invés de FUNCTION
CREATE OR REPLACE TRIGGER trigger_notify_ticket_status_change
  AFTER UPDATE ON public.sla_demandas
  FOR EACH ROW
  EXECUTE PROCEDURE notify_ticket_status_change();

CREATE OR REPLACE TRIGGER trigger_notify_ticket_setor_change
  AFTER UPDATE ON public.sla_demandas
  FOR EACH ROW
  EXECUTE PROCEDURE notify_ticket_setor_change();