import { useMemo } from 'react';
import { useOptimizedTickets, TicketWithStatus } from './useOptimizedTickets';

export interface TicketStats {
  total: number;
  abertos: number;
  em_andamento: number;
  resolvidos: number;
  fechados: number;
  atrasados: number;
  criticos: number;
}

// Permite reutilizar tickets já carregados para evitar consultas duplicadas
export const useTicketStats = (externalTickets?: TicketWithStatus[]) => {
  const { ticketsWithStatus, loading, error, reloadTickets } = useOptimizedTickets({
    enableRealtime: true,
    batchSize: 100,
    autoFetch: !externalTickets
  });

  const sourceTickets = externalTickets ?? ticketsWithStatus;

  // Calcular estatísticas usando a MESMA lógica para ambas as telas
  const stats = useMemo((): TicketStats => {
    const counts = {
      total: sourceTickets.length,
      abertos: 0,
      em_andamento: 0,
      resolvidos: 0,
      fechados: 0,
      atrasados: 0,
      criticos: 0
    };

    // Um loop único para calcular todas as estatísticas de forma consistente
    sourceTickets.forEach(ticket => {
      // Recalcular se está atrasado considerando prazo_interno
      const isExpired = (() => {
        if (ticket.status === 'resolvido' || ticket.status === 'fechado') return false;
        
        const timeConfig = {
          'P0': 4 * 60 * 60 * 1000,
          'P1': 24 * 60 * 60 * 1000,
          'P2': 3 * 24 * 60 * 60 * 1000,
          'P3': 7 * 24 * 60 * 60 * 1000,
        };
        
        let deadline;
        if (ticket.prazo_interno) {
          deadline = new Date(ticket.prazo_interno).getTime();
        } else {
          const startTime = new Date(ticket.data_criacao).getTime();
          const timeLimit = timeConfig[ticket.nivel_criticidade as keyof typeof timeConfig] || timeConfig['P3'];
          deadline = startTime + timeLimit;
        }
        
        return Date.now() > deadline;
      })();
      
      // Contagem de atrasados (primeira prioridade)
      if (isExpired) {
        counts.atrasados++;
      }
      
      // Contagem de críticos (apenas abertos ou em andamento)
      if (ticket.nivel_criticidade === 'P0') {
        const status = ticket.status?.toString()?.trim()?.toLowerCase();
        if (['aberto', 'em_andamento'].includes(status)) {
          counts.criticos++;
        }
      }
      
      // Contagem por status - INCLUIR todos os tickets (mesmo atrasados)
      const status = ticket.status?.toString()?.trim()?.toLowerCase();
      switch (status) {
        case 'aberto':
          counts.abertos++;
          break;
        case 'em_andamento':
          counts.em_andamento++;
          break;
        case 'resolvido':
          counts.resolvidos++;
          break;
        case 'fechado':
          counts.fechados++;
          break;
      }
    });

    return counts;
  }, [sourceTickets]);

  return {
    stats,
    loading: externalTickets ? false : loading,
    error: externalTickets ? null : error,
    reloadTickets,
    ticketsWithStatus: sourceTickets
  };
};