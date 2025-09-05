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
    criticos: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGlobalStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar contagem por status usando agregação SQL
      const { data: statusCounts, error: statusError } = await supabase
        .from('sla_demandas')
        .select('status')
        .then(async ({ data, error }) => {
          if (error) throw error;
          
          // Contar manualmente para garantir compatibilidade
          const counts = {
            total: data?.length || 0,
            abertos: data?.filter(t => t.status === 'aberto').length || 0,
            em_andamento: data?.filter(t => t.status === 'em_andamento').length || 0,
            resolvidos: data?.filter(t => t.status === 'resolvido').length || 0,
            fechados: data?.filter(t => t.status === 'fechado').length || 0,
          };
          
          return { data: counts, error: null };
        });

      if (statusError) throw statusError;

      // Buscar tickets críticos P0 que estão abertos ou em andamento
      const { data: criticosData, error: criticosError } = await supabase
        .from('sla_demandas')
        .select('id')
        .eq('nivel_criticidade', 'P0')
        .in('status', ['aberto', 'em_andamento']);

      if (criticosError) throw criticosError;

      // Buscar tickets atrasados (precisa calcular com dados de data_criacao e prazo_interno)
      const { data: atrasadosData, error: atrasadosError } = await supabase
        .from('sla_demandas')
        .select('id, status, nivel_criticidade, data_criacao, prazo_interno')
        .not('status', 'in', '(resolvido,fechado)');

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
        total: statusCounts?.total || 0,
        abertos: statusCounts?.abertos || 0,
        em_andamento: statusCounts?.em_andamento || 0,
        resolvidos: statusCounts?.resolvidos || 0,
        fechados: statusCounts?.fechados || 0,
        atrasados: atrasadosCount,
        criticos: criticosData?.length || 0
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