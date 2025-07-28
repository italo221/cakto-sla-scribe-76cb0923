-- Verificar a constraint existente na tabela sla_demandas
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = connamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'sla_demandas'
  AND con.contype = 'c'
  AND con.conname LIKE '%tipo_ticket%';

-- Vamos corrigir a constraint para permitir os valores corretos
ALTER TABLE public.sla_demandas 
DROP CONSTRAINT IF EXISTS sla_demandas_tipo_ticket_check;

-- Criar nova constraint com os valores corretos
ALTER TABLE public.sla_demandas 
ADD CONSTRAINT sla_demandas_tipo_ticket_check 
CHECK (tipo_ticket IN (
  'solicitacao_tarefa',
  'bug', 
  'duvida_tecnica',
  'feedback_sugestao',
  'atualizacao_projeto',
  'sugestao_melhoria'
));