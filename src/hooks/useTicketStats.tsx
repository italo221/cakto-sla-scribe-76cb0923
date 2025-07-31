import { useMemo } from 'react';
import { useOptimizedTickets } from './useOptimizedTickets';

export interface TicketStats {
  total: number;
  abertos: number;
  em_andamento: number;
  resolvidos: number;
  fechados: number;
  atrasados: number;
  criticos: number;
}

export const useTicketStats = () => {
  const { ticketsWithStatus, loading, error, reloadTickets } = useOptimizedTickets({
    enableRealtime: true,
    batchSize: 100
  });

  // Calcular estatísticas usando a MESMA lógica para ambas as telas
  const stats = useMemo((): TicketStats => {
    const counts = {
      total: ticketsWithStatus.length,
      abertos: 0,
      em_andamento: 0,
      resolvidos: 0,
      fechados: 0,
      atrasados: 0,
      criticos: 0
    };

    // Um loop único para calcular todas as estatísticas de forma consistente
    ticketsWithStatus.forEach(ticket => {
      // Contagem de atrasados (primeira prioridade)
      if (ticket.isExpired) {
        counts.atrasados++;
      }
      
      // Contagem de críticos
      if (ticket.nivel_criticidade === 'P0') {
        counts.criticos++;
      }
      
      // Contagem por status - excluir atrasados da contagem normal de status
      if (!ticket.isExpired) {
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
      }
    });

    return counts;
  }, [ticketsWithStatus]);

  return {
    stats,
    loading,
    error,
    reloadTickets,
    ticketsWithStatus
  };
};