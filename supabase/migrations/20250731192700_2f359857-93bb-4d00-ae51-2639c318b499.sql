-- Garantir que a tabela sla_demandas está configurada para realtime
ALTER TABLE public.sla_demandas REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sla_demandas;