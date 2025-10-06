-- Função para fazer backfill de subtickets legados (baseado em padrão "#NN" no título)
CREATE OR REPLACE FUNCTION backfill_legacy_subtickets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ticket_record RECORD;
  base_title TEXT;
  parent_id UUID;
  parent_ticket RECORD;
  sequence_num INTEGER;
BEGIN
  -- Loop por todos os tickets com padrão "#NN" no final do título
  FOR ticket_record IN 
    SELECT id, titulo, ticket_number, data_criacao
    FROM sla_demandas
    WHERE titulo ~ ' #[0-9]{2,}$'
    ORDER BY data_criacao ASC
  LOOP
    -- Extrair o título base (sem o " #NN")
    base_title := regexp_replace(ticket_record.titulo, ' #[0-9]{2,}$', '');
    
    -- Extrair o número da sequência do título
    sequence_num := NULLIF(regexp_replace(ticket_record.titulo, '^.* #([0-9]{2,})$', '\1'), '')::INTEGER;
    
    -- Procurar por um ticket pai com o título base
    SELECT id INTO parent_id
    FROM sla_demandas
    WHERE titulo = base_title
    LIMIT 1;
    
    -- Se não existe um ticket pai, criar um baseado no primeiro da série
    IF parent_id IS NULL THEN
      -- Verificar se este é o primeiro (#01)
      IF sequence_num = 1 THEN
        -- Atualizar o título deste ticket para ser o pai
        UPDATE sla_demandas
        SET titulo = base_title
        WHERE id = ticket_record.id;
        
        parent_id := ticket_record.id;
      ELSE
        -- Buscar o ticket #01 para ser o pai
        SELECT id INTO parent_id
        FROM sla_demandas
        WHERE titulo = base_title || ' #01'
        LIMIT 1;
        
        -- Se encontrou, atualizar o título dele para ser o pai
        IF parent_id IS NOT NULL THEN
          UPDATE sla_demandas
          SET titulo = base_title
          WHERE id = parent_id;
        END IF;
      END IF;
    END IF;
    
    -- Se temos um pai válido e este ticket não é o próprio pai, vincular
    IF parent_id IS NOT NULL AND parent_id != ticket_record.id THEN
      -- Verificar se já não está vinculado
      IF NOT EXISTS (
        SELECT 1 FROM subtickets 
        WHERE child_ticket_id = ticket_record.id
      ) THEN
        -- Inserir vínculo na tabela subtickets
        INSERT INTO subtickets (
          parent_ticket_id,
          child_ticket_id,
          sequence_number,
          created_by
        )
        VALUES (
          parent_id,
          ticket_record.id,
          COALESCE(sequence_num, 0),
          -- Buscar um admin como fallback para created_by
          COALESCE(
            (SELECT user_id FROM profiles WHERE role = 'super_admin' AND ativo = true LIMIT 1),
            (SELECT user_id FROM profiles WHERE ativo = true LIMIT 1)
          )
        )
        ON CONFLICT (parent_ticket_id, child_ticket_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Backfill de subtickets legados concluído com sucesso';
END;
$$;

-- Executar o backfill
SELECT backfill_legacy_subtickets();