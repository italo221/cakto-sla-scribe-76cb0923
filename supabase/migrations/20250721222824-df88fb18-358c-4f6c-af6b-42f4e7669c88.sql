-- Adicionar campo tipo para categorizar tickets
ALTER TABLE public.sla_demandas 
ADD COLUMN tipo_ticket text NOT NULL DEFAULT 'bug' CHECK (tipo_ticket IN ('bug', 'sugestao_melhoria'));

-- Atualizar tickets existentes para ter o tipo 'bug' como padrão
UPDATE public.sla_demandas 
SET tipo_ticket = 'bug' 
WHERE tipo_ticket IS NULL;