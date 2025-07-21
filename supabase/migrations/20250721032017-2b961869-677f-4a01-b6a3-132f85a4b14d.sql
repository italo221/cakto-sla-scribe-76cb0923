-- Permitir atualizações na tabela sla_demandas
CREATE POLICY "Permitir atualização de SLA"
ON public.sla_demandas
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Adicionar campo tags se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sla_demandas' 
                   AND column_name = 'tags') THEN
        ALTER TABLE public.sla_demandas 
        ADD COLUMN tags text[];
    END IF;
END $$;