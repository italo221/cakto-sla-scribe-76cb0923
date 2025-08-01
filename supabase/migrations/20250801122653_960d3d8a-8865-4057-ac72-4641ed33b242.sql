-- Corrigir o warning de search_path na função de validação
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';