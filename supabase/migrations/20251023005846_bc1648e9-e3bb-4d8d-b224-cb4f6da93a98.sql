-- Remover constraint antiga de tipo_ticket
ALTER TABLE public.sla_demandas 
DROP CONSTRAINT IF EXISTS sla_demandas_tipo_ticket_check;

-- Adicionar nova constraint com todos os tipos incluindo melhorias
ALTER TABLE public.sla_demandas 
ADD CONSTRAINT sla_demandas_tipo_ticket_check 
CHECK (tipo_ticket IN (
  'bug', 
  'sugestao_melhoria', 
  'feedback_sugestao', 
  'atualizacao_projeto',
  'duvida_tecnica',
  'solicitacao_tarefa'
));

-- Atualizar default para manter compatibilidade
ALTER TABLE public.sla_demandas 
ALTER COLUMN tipo_ticket SET DEFAULT 'bug';
