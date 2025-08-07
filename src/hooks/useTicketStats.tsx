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
  }, [ticketsWithStatus]);

  return {
    stats,
    loading,
    error,
    reloadTickets,
    ticketsWithStatus
  };
};