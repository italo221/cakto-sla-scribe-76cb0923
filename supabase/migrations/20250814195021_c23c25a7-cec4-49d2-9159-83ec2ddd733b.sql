-- Adicionar campo resolved_at para tracking preciso de tempo de resolução
ALTER TABLE public.sla_demandas 
ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_sla_demandas_resolved_at ON public.sla_demandas(resolved_at);

-- Backfill: popular resolved_at para tickets já resolvidos/fechados
-- Usar dados do histórico (sla_action_logs) se disponível, senão updated_at
UPDATE public.sla_demandas 
SET resolved_at = (
  SELECT MIN(sal.timestamp)
  FROM public.sla_action_logs sal
  WHERE sal.sla_id = sla_demandas.id
    AND sal.acao IN ('resolucao', 'fechamento', 'marcar_resolvido', 'fechar_ticket')
)
WHERE status IN ('resolvido', 'fechado') 
  AND resolved_at IS NULL;

-- Para tickets sem histórico específico, usar updated_at como fallback
UPDATE public.sla_demandas 
SET resolved_at = updated_at
WHERE status IN ('resolvido', 'fechado') 
  AND resolved_at IS NULL
  AND updated_at IS NOT NULL;

-- Criar função para atualizar resolved_at automaticamente
CREATE OR REPLACE FUNCTION public.update_resolved_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Se status mudou para resolvido ou fechado e resolved_at ainda não está preenchido
  IF NEW.status IN ('resolvido', 'fechado') 
     AND OLD.status NOT IN ('resolvido', 'fechado') 
     AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at = now();
  END IF;
  
  -- Se ticket foi reaberto, NÃO limpar resolved_at (manter primeiro tempo de resolução)
  
  RETURN NEW;
END;
$function$;

-- Criar trigger para atualizar resolved_at automaticamente
DROP TRIGGER IF EXISTS update_resolved_at_trigger ON public.sla_demandas;
CREATE TRIGGER update_resolved_at_trigger
  BEFORE UPDATE ON public.sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_resolved_at();