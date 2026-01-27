import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GlobalTicketStats {
  total: number;
  abertos: number;
  em_andamento: number;
  resolvidos: number;
  fechados: number;
  atrasados: number;
  criticos: number;
  infoIncompleta: number;
}

// Hook especializado para estatísticas globais usando agregações SQL eficientes
export const useGlobalTicketStats = () => {
  const [stats, setStats] = useState<GlobalTicketStats>({
    total: 0,
    abertos: 0,
    em_andamento: 0,
    resolvidos: 0,
    fechados: 0,
    atrasados: 0,
    criticos: 0,
    infoIncompleta: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGlobalStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar contagem por status usando consultas count separadas para evitar limite de 1000
      const [
        { count: totalCount },
        { count: abertosCount },
        { count: emAndamentoCount },
        { count: resolvidosCount },
        { count: fechadosCount },
        { count: criticosCount },
        { count: infoIncompletaCount }
      ] = await Promise.all([
        // Total de tickets
        supabase.from('sla_demandas').select('*', { count: 'exact', head: true }),
        // Abertos
        supabase.from('sla_demandas').select('*', { count: 'exact', head: true }).eq('status', 'aberto'),
        // Em andamento
        supabase.from('sla_demandas').select('*', { count: 'exact', head: true }).eq('status', 'em_andamento'),
        // Resolvidos
        supabase.from('sla_demandas').select('*', { count: 'exact', head: true }).eq('status', 'resolvido'),
        // Fechados
        supabase.from('sla_demandas').select('*', { count: 'exact', head: true }).eq('status', 'fechado'),
        // Críticos (P0 abertos ou em andamento)
        supabase.from('sla_demandas').select('*', { count: 'exact', head: true })
          .eq('nivel_criticidade', 'P0')
          .in('status', ['aberto', 'em_andamento']),
        // Info incompleta (tag específica)
        supabase.from('sla_demandas').select('*', { count: 'exact', head: true })
          .contains('tags', ['info-incompleta'])
      ]);

      // Buscar tickets atrasados - precisa calcular com dados de data_criacao e prazo_interno
      // Buscar apenas tickets não resolvidos/fechados (limitando a 3000 para performance)
      const { data: atrasadosData, error: atrasadosError } = await supabase
        .from('sla_demandas')
        .select('id, status, nivel_criticidade, data_criacao, prazo_interno')
        .not('status', 'in', '(resolvido,fechado)')
        .limit(3000);

      if (atrasadosError) throw atrasadosError;

      // Calcular tickets atrasados
      const now = Date.now();
      const timeConfig = {
        'P0': 4 * 60 * 60 * 1000,   // 4 horas
        'P1': 24 * 60 * 60 * 1000,  // 24 horas
        'P2': 3 * 24 * 60 * 60 * 1000,  // 3 dias
        'P3': 7 * 24 * 60 * 60 * 1000   // 7 dias
      };

      const atrasadosCount = atrasadosData?.filter(ticket => {
        let deadline;
        if (ticket.prazo_interno) {
          deadline = new Date(ticket.prazo_interno).getTime();
        } else {
          const startTime = new Date(ticket.data_criacao).getTime();
          const timeLimit = timeConfig[ticket.nivel_criticidade as keyof typeof timeConfig] || timeConfig['P3'];
          deadline = startTime + timeLimit;
        }
        return now > deadline;
      }).length || 0;

      setStats({
        total: totalCount || 0,
        abertos: abertosCount || 0,
        em_andamento: emAndamentoCount || 0,
        resolvidos: resolvidosCount || 0,
        fechados: fechadosCount || 0,
        atrasados: atrasadosCount,
        criticos: criticosCount || 0,
        infoIncompleta: infoIncompletaCount || 0
      });

    } catch (err: any) {
      console.error('Erro ao buscar estatísticas globais:', err);
      setError(err.message || 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const reloadStats = () => {
    fetchGlobalStats();
  };

  return {
    stats,
    loading,
    error,
    reloadStats
  };
};
