-- Corrigir a função get_inbox_tickets_ordered com tipos consistentes no ORDER BY
CREATE OR REPLACE FUNCTION public.get_inbox_tickets_ordered(
  p_status_filter text[] DEFAULT NULL,
  p_criticality_filter text[] DEFAULT NULL,
  p_setor_id uuid DEFAULT NULL,
  p_search_term text DEFAULT NULL,
  p_date_sort text DEFAULT 'none',
  p_criticality_sort text DEFAULT 'highest',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  ticket_number text,
  titulo text,
  solicitante text,
  time_responsavel text,
  descricao text,
  tipo_ticket text,
  status text,
  nivel_criticidade text,
  data_criacao timestamp with time zone,
  updated_at timestamp with time zone,
  resolved_at timestamp with time zone,
  setor_id uuid,
  tags text[],
  assignee_user_id uuid,
  pontuacao_total integer,
  prazo_interno timestamp with time zone,
  observacoes text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total bigint;
BEGIN
  -- Calcular total para paginação
  SELECT COUNT(*) INTO total
  FROM sla_demandas t
  WHERE 
    -- Filtro de status
    (p_status_filter IS NULL OR t.status = ANY(p_status_filter))
    -- Filtro de criticidade
    AND (p_criticality_filter IS NULL OR t.nivel_criticidade = ANY(p_criticality_filter))
    -- Filtro de setor
    AND (p_setor_id IS NULL OR t.setor_id = p_setor_id)
    -- Filtro de busca
    AND (
      p_search_term IS NULL 
      OR p_search_term = '' 
      OR t.titulo ILIKE '%' || p_search_term || '%'
      OR t.ticket_number ILIKE '%' || p_search_term || '%'
      OR t.solicitante ILIKE '%' || p_search_term || '%'
      OR t.descricao ILIKE '%' || p_search_term || '%'
    );

  -- Retornar tickets ordenados com base nos parâmetros
  IF p_date_sort = 'newest' THEN
    RETURN QUERY
    SELECT 
      t.id, t.ticket_number, t.titulo, t.solicitante, t.time_responsavel,
      t.descricao, t.tipo_ticket, t.status, t.nivel_criticidade, t.data_criacao,
      t.updated_at, t.resolved_at, t.setor_id, t.tags, t.assignee_user_id,
      t.pontuacao_total, t.prazo_interno, t.observacoes, total as total_count
    FROM sla_demandas t
    WHERE 
      (p_status_filter IS NULL OR t.status = ANY(p_status_filter))
      AND (p_criticality_filter IS NULL OR t.nivel_criticidade = ANY(p_criticality_filter))
      AND (p_setor_id IS NULL OR t.setor_id = p_setor_id)
      AND (p_search_term IS NULL OR p_search_term = '' 
           OR t.titulo ILIKE '%' || p_search_term || '%'
           OR t.ticket_number ILIKE '%' || p_search_term || '%'
           OR t.solicitante ILIKE '%' || p_search_term || '%'
           OR t.descricao ILIKE '%' || p_search_term || '%')
    ORDER BY
      CASE t.status
        WHEN 'aberto' THEN 0
        WHEN 'em_andamento' THEN 1
        WHEN 'resolvido' THEN 2
        WHEN 'fechado' THEN 3
        ELSE 4
      END ASC,
      t.data_criacao DESC
    LIMIT p_limit OFFSET p_offset;
    
  ELSIF p_date_sort = 'oldest' THEN
    RETURN QUERY
    SELECT 
      t.id, t.ticket_number, t.titulo, t.solicitante, t.time_responsavel,
      t.descricao, t.tipo_ticket, t.status, t.nivel_criticidade, t.data_criacao,
      t.updated_at, t.resolved_at, t.setor_id, t.tags, t.assignee_user_id,
      t.pontuacao_total, t.prazo_interno, t.observacoes, total as total_count
    FROM sla_demandas t
    WHERE 
      (p_status_filter IS NULL OR t.status = ANY(p_status_filter))
      AND (p_criticality_filter IS NULL OR t.nivel_criticidade = ANY(p_criticality_filter))
      AND (p_setor_id IS NULL OR t.setor_id = p_setor_id)
      AND (p_search_term IS NULL OR p_search_term = '' 
           OR t.titulo ILIKE '%' || p_search_term || '%'
           OR t.ticket_number ILIKE '%' || p_search_term || '%'
           OR t.solicitante ILIKE '%' || p_search_term || '%'
           OR t.descricao ILIKE '%' || p_search_term || '%')
    ORDER BY
      CASE t.status
        WHEN 'aberto' THEN 0
        WHEN 'em_andamento' THEN 1
        WHEN 'resolvido' THEN 2
        WHEN 'fechado' THEN 3
        ELSE 4
      END ASC,
      t.data_criacao ASC
    LIMIT p_limit OFFSET p_offset;
    
  ELSIF p_criticality_sort = 'lowest' THEN
    RETURN QUERY
    SELECT 
      t.id, t.ticket_number, t.titulo, t.solicitante, t.time_responsavel,
      t.descricao, t.tipo_ticket, t.status, t.nivel_criticidade, t.data_criacao,
      t.updated_at, t.resolved_at, t.setor_id, t.tags, t.assignee_user_id,
      t.pontuacao_total, t.prazo_interno, t.observacoes, total as total_count
    FROM sla_demandas t
    WHERE 
      (p_status_filter IS NULL OR t.status = ANY(p_status_filter))
      AND (p_criticality_filter IS NULL OR t.nivel_criticidade = ANY(p_criticality_filter))
      AND (p_setor_id IS NULL OR t.setor_id = p_setor_id)
      AND (p_search_term IS NULL OR p_search_term = '' 
           OR t.titulo ILIKE '%' || p_search_term || '%'
           OR t.ticket_number ILIKE '%' || p_search_term || '%'
           OR t.solicitante ILIKE '%' || p_search_term || '%'
           OR t.descricao ILIKE '%' || p_search_term || '%')
    ORDER BY
      CASE t.status
        WHEN 'aberto' THEN 0
        WHEN 'em_andamento' THEN 1
        WHEN 'resolvido' THEN 2
        WHEN 'fechado' THEN 3
        ELSE 4
      END ASC,
      CASE t.nivel_criticidade
        WHEN 'P3' THEN 0
        WHEN 'P2' THEN 1
        WHEN 'P1' THEN 2
        WHEN 'P0' THEN 3
        ELSE 4
      END ASC,
      t.data_criacao ASC
    LIMIT p_limit OFFSET p_offset;
    
  ELSE
    -- Padrão: criticidade mais alta primeiro (highest)
    RETURN QUERY
    SELECT 
      t.id, t.ticket_number, t.titulo, t.solicitante, t.time_responsavel,
      t.descricao, t.tipo_ticket, t.status, t.nivel_criticidade, t.data_criacao,
      t.updated_at, t.resolved_at, t.setor_id, t.tags, t.assignee_user_id,
      t.pontuacao_total, t.prazo_interno, t.observacoes, total as total_count
    FROM sla_demandas t
    WHERE 
      (p_status_filter IS NULL OR t.status = ANY(p_status_filter))
      AND (p_criticality_filter IS NULL OR t.nivel_criticidade = ANY(p_criticality_filter))
      AND (p_setor_id IS NULL OR t.setor_id = p_setor_id)
      AND (p_search_term IS NULL OR p_search_term = '' 
           OR t.titulo ILIKE '%' || p_search_term || '%'
           OR t.ticket_number ILIKE '%' || p_search_term || '%'
           OR t.solicitante ILIKE '%' || p_search_term || '%'
           OR t.descricao ILIKE '%' || p_search_term || '%')
    ORDER BY
      CASE t.status
        WHEN 'aberto' THEN 0
        WHEN 'em_andamento' THEN 1
        WHEN 'resolvido' THEN 2
        WHEN 'fechado' THEN 3
        ELSE 4
      END ASC,
      CASE t.nivel_criticidade
        WHEN 'P0' THEN 0
        WHEN 'P1' THEN 1
        WHEN 'P2' THEN 2
        WHEN 'P3' THEN 3
        ELSE 4
      END ASC,
      t.data_criacao ASC
    LIMIT p_limit OFFSET p_offset;
  END IF;
END;
$$;