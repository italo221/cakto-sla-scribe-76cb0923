-- Limpar sistema: remover status "pausado" e otimizar fluxo de tickets
-- Atualizar tickets pausados para "em_andamento" para manter continuidade
UPDATE sla_demandas 
SET status = 'em_andamento', 
    updated_at = now()
WHERE status = 'pausado';

-- Atualizar logs antigos que referenciam status pausado
UPDATE sla_action_logs 
SET dados_novos = jsonb_set(dados_novos, '{status}', '"em_andamento"', true)
WHERE dados_novos->>'status' = 'pausado';

UPDATE sla_action_logs 
SET dados_anteriores = jsonb_set(dados_anteriores, '{status}', '"em_andamento"', true)
WHERE dados_anteriores->>'status' = 'pausado';

-- Confirmar limpeza
SELECT 'Sistema de filtros otimizado - status pausado removido' as status;