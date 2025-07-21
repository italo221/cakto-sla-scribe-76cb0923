-- Adicionar campo ticket_number na tabela sla_demandas
ALTER TABLE public.sla_demandas 
ADD COLUMN ticket_number text;

-- Criar função para gerar número de ticket automaticamente
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  current_year text;
  sequence_number text;
  ticket_number text;
BEGIN
  -- Pegar o ano atual
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Contar quantos tickets já existem neste ano e adicionar 1
  SELECT LPAD((COUNT(*) + 1)::text, 4, '0') 
  INTO sequence_number
  FROM public.sla_demandas 
  WHERE EXTRACT(YEAR FROM data_criacao) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Formato: TICKET-YYYY-NNNN (ex: TICKET-2025-0001)
  ticket_number := 'TICKET-' || current_year || '-' || sequence_number;
  
  RETURN ticket_number;
END;
$$;

-- Criar trigger para gerar ticket automaticamente na criação
CREATE OR REPLACE FUNCTION public.auto_generate_ticket()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se ticket_number não foi fornecido, gerar automaticamente
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que executa antes do INSERT
CREATE TRIGGER trigger_auto_generate_ticket
  BEFORE INSERT ON public.sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_ticket();

-- Atualizar SLAs existentes que não têm ticket_number
UPDATE public.sla_demandas 
SET ticket_number = 'TICKET-' || EXTRACT(YEAR FROM data_criacao)::text || '-' || 
    LPAD(ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM data_criacao) ORDER BY data_criacao)::text, 4, '0')
WHERE ticket_number IS NULL;