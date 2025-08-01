-- Adicionar constraints de validação na tabela sla_demandas para prevenir tickets vazios
ALTER TABLE sla_demandas 
ADD CONSTRAINT titulo_nao_vazio CHECK (titulo IS NOT NULL AND TRIM(titulo) != ''),
ADD CONSTRAINT descricao_nao_vazia CHECK (descricao IS NOT NULL AND TRIM(descricao) != ''),
ADD CONSTRAINT status_obrigatorio CHECK (status IS NOT NULL AND TRIM(status) != ''),
ADD CONSTRAINT time_responsavel_obrigatorio CHECK (time_responsavel IS NOT NULL AND TRIM(time_responsavel) != ''),
ADD CONSTRAINT solicitante_obrigatorio CHECK (solicitante IS NOT NULL AND TRIM(solicitante) != '');

-- Adicionar função de validação mais robusta
CREATE OR REPLACE FUNCTION validate_ticket_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar título
  IF NEW.titulo IS NULL OR TRIM(NEW.titulo) = '' THEN
    RAISE EXCEPTION 'Título é obrigatório e não pode estar vazio';
  END IF;
  
  -- Validar descrição
  IF NEW.descricao IS NULL OR TRIM(NEW.descricao) = '' THEN
    RAISE EXCEPTION 'Descrição é obrigatória e não pode estar vazia';
  END IF;
  
  -- Validar status
  IF NEW.status IS NULL OR TRIM(NEW.status) = '' THEN
    NEW.status = 'aberto';
  END IF;
  
  -- Validar time responsável
  IF NEW.time_responsavel IS NULL OR TRIM(NEW.time_responsavel) = '' THEN
    RAISE EXCEPTION 'Time responsável é obrigatório e não pode estar vazio';
  END IF;
  
  -- Validar solicitante
  IF NEW.solicitante IS NULL OR TRIM(NEW.solicitante) = '' THEN
    RAISE EXCEPTION 'Solicitante é obrigatório e não pode estar vazio';
  END IF;
  
  -- Garantir que nivel_criticidade tenha valor padrão
  IF NEW.nivel_criticidade IS NULL OR TRIM(NEW.nivel_criticidade) = '' THEN
    NEW.nivel_criticidade = 'P3';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na criação e atualização
DROP TRIGGER IF EXISTS trigger_validate_ticket ON sla_demandas;
CREATE TRIGGER trigger_validate_ticket
  BEFORE INSERT OR UPDATE ON sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION validate_ticket_creation();