CREATE OR REPLACE FUNCTION public.team_metrics(date_from date DEFAULT (CURRENT_DATE - '30 days'::interval), date_to date DEFAULT CURRENT_DATE, setor_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  total_tickets integer;
  tickets_abertos integer;
  tickets_em_andamento integer;
  tickets_resolvidos integer;
  avg_time_to_start interval;
  avg_resolution_time interval;
  sla_compliance_rate numeric;
  user_setores_filter uuid[];
  current_user_id uuid;
BEGIN
  -- Obter o ID do usuário atual
  current_user_id := auth.uid();
  
  -- Verificar se é super admin através de uma consulta direta
  IF current_user_id IS NOT NULL THEN
    -- Verificar se o usuário é super admin
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = current_user_id 
        AND role = 'super_admin' 
        AND ativo = true
    ) THEN
      -- Se não é super admin, filtrar pelos setores do usuário
      SELECT array_agg(us.setor_id) INTO user_setores_filter
      FROM user_setores us 
      WHERE us.user_id = current_user_id;
      
      -- Se setor_ids foi passado, fazer interseção com os setores do usuário
      IF setor_ids IS NOT NULL THEN
        SELECT array_agg(unnest) INTO setor_ids
        FROM unnest(setor_ids) 
        WHERE unnest = ANY(user_setores_filter);
      ELSE
        setor_ids := user_setores_filter;
      END IF;
    END IF;
  END IF;

  -- Se não há setores válidos, retornar métricas zeradas
  IF setor_ids IS NULL OR array_length(setor_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'total_tickets', 0,
      'tickets_abertos', 0,
      'tickets_em_andamento', 0,
      'tickets_resolvidos', 0,
      'avg_time_to_start_hours', 0,
      'avg_resolution_time_hours', 0,
      'sla_compliance_rate', 0
    );
  END IF;

  -- Total de tickets no período
  SELECT COUNT(*) INTO total_tickets
  FROM sla_demandas t
  WHERE t.data_criacao::date BETWEEN date_from AND date_to
    AND t.setor_id = ANY(setor_ids);

  -- Tickets por status
  SELECT 
    COUNT(*) FILTER (WHERE status = 'aberto'),
    COUNT(*) FILTER (WHERE status = 'em_andamento'),
    COUNT(*) FILTER (WHERE status = 'resolvido')
  INTO tickets_abertos, tickets_em_andamento, tickets_resolvidos
  FROM sla_demandas t
  WHERE t.data_criacao::date BETWEEN date_from AND date_to
    AND t.setor_id = ANY(setor_ids);

  -- Tempo médio para iniciar (estimativa baseada em updated_at)
  SELECT AVG(t.updated_at - t.data_criacao) INTO avg_time_to_start
  FROM sla_demandas t
  WHERE t.data_criacao::date BETWEEN date_from AND date_to
    AND t.setor_id = ANY(setor_ids)
    AND t.status != 'aberto'
    AND t.updated_at IS NOT NULL;

  -- Tempo médio de resolução
  SELECT AVG(t.updated_at - t.data_criacao) INTO avg_resolution_time
  FROM sla_demandas t
  WHERE t.data_criacao::date BETWEEN date_from AND date_to
    AND t.setor_id = ANY(setor_ids)
    AND t.status IN ('resolvido', 'fechado')
    AND t.updated_at IS NOT NULL;

  -- Taxa de conformidade com SLA (corrigida para usar prazos calculados)
  WITH sla_tickets AS (
    SELECT 
      t.*,
      sp.p0_hours,
      sp.p1_hours, 
      sp.p2_hours,
      sp.p3_hours,
      CASE 
        WHEN t.prazo_interno IS NOT NULL THEN t.prazo_interno
        ELSE 
          CASE t.nivel_criticidade
            WHEN 'P0' THEN t.data_criacao + (COALESCE(sp.p0_hours, 4) || ' hours')::interval
            WHEN 'P1' THEN t.data_criacao + (COALESCE(sp.p1_hours, 24) || ' hours')::interval
            WHEN 'P2' THEN t.data_criacao + (COALESCE(sp.p2_hours, 72) || ' hours')::interval
            WHEN 'P3' THEN t.data_criacao + (COALESCE(sp.p3_hours, 168) || ' hours')::interval
            ELSE t.data_criacao + INTERVAL '168 hours' -- Padrão P3
          END
      END as prazo_final,
      CASE 
        WHEN t.status IN ('resolvido', 'fechado') AND t.updated_at IS NOT NULL THEN
          CASE 
            WHEN t.prazo_interno IS NOT NULL THEN t.updated_at <= t.prazo_interno
            ELSE 
              CASE t.nivel_criticidade
                WHEN 'P0' THEN t.updated_at <= t.data_criacao + (COALESCE(sp.p0_hours, 4) || ' hours')::interval
                WHEN 'P1' THEN t.updated_at <= t.data_criacao + (COALESCE(sp.p1_hours, 24) || ' hours')::interval
                WHEN 'P2' THEN t.updated_at <= t.data_criacao + (COALESCE(sp.p2_hours, 72) || ' hours')::interval
                WHEN 'P3' THEN t.updated_at <= t.data_criacao + (COALESCE(sp.p3_hours, 168) || ' hours')::interval
                ELSE t.updated_at <= t.data_criacao + INTERVAL '168 hours'
              END
          END
        ELSE NULL
      END as within_sla
    FROM sla_demandas t
    LEFT JOIN sla_policies sp ON sp.setor_id = t.setor_id
    WHERE t.data_criacao::date BETWEEN date_from AND date_to
      AND t.setor_id = ANY(setor_ids)
      AND t.status IN ('resolvido', 'fechado')
  )
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE within_sla = true))::numeric / COUNT(*) * 100
      ELSE 0
    END
  INTO sla_compliance_rate
  FROM sla_tickets;

  -- Construir resultado
  result := jsonb_build_object(
    'total_tickets', COALESCE(total_tickets, 0),
    'tickets_abertos', COALESCE(tickets_abertos, 0),
    'tickets_em_andamento', COALESCE(tickets_em_andamento, 0),
    'tickets_resolvidos', COALESCE(tickets_resolvidos, 0),
    'avg_time_to_start_hours', COALESCE(EXTRACT(EPOCH FROM avg_time_to_start)/3600, 0),
    'avg_resolution_time_hours', COALESCE(EXTRACT(EPOCH FROM avg_resolution_time)/3600, 0),
    'sla_compliance_rate', COALESCE(sla_compliance_rate, 0)
  );

  RETURN result;
END;
$function$