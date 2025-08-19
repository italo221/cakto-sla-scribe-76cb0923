-- Adicionar campo first_in_progress_at na tabela sla_demandas
ALTER TABLE public.sla_demandas 
ADD COLUMN first_in_progress_at TIMESTAMP WITH TIME ZONE;

-- Criar índices para performance
CREATE INDEX idx_sla_demandas_first_in_progress_resolved ON public.sla_demandas(setor_id, resolved_at);
CREATE INDEX idx_sla_demandas_first_in_progress ON public.sla_demandas(first_in_progress_at);

-- Backfill do campo first_in_progress_at usando os logs de ação
UPDATE public.sla_demandas 
SET first_in_progress_at = (
  SELECT MIN(sal.timestamp)
  FROM public.sla_action_logs sal
  WHERE sal.sla_id = sla_demandas.id
    AND (
      sal.acao LIKE '%em_andamento%' 
      OR (sal.dados_novos->>'status' = 'em_andamento')
      OR sal.acao = 'status_change'
    )
)
WHERE first_in_progress_at IS NULL;

-- Criar função para atualizar first_in_progress_at automaticamente
CREATE OR REPLACE FUNCTION public.update_first_in_progress_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status mudou para em_andamento e ainda não há data registrada
  IF NEW.status = 'em_andamento' 
     AND OLD.status != 'em_andamento' 
     AND NEW.first_in_progress_at IS NULL THEN
    NEW.first_in_progress_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar automaticamente
CREATE TRIGGER trigger_update_first_in_progress_at
  BEFORE UPDATE ON public.sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_first_in_progress_at();