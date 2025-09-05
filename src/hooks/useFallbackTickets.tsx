import { useMemo } from 'react';

// Hook para simular dados de tickets quando Supabase está sobrecarregado
export const useFallbackTickets = () => {
  const fallbackTickets = useMemo(() => [
    {
      id: 'fallback-1',
      ticket_number: 'TICKET-2025-0001',
      titulo: 'Sistema temporariamente em manutenção',
      time_responsavel: 'Equipe Técnica',
      solicitante: 'Sistema',
      descricao: 'Aguarde enquanto otimizamos o sistema',
      tipo_ticket: 'Manutenção',
      status: 'em_andamento',
      nivel_criticidade: 'P2',
      pontuacao_total: 0,
      pontuacao_financeiro: 0,
      pontuacao_cliente: 0,
      pontuacao_reputacao: 0,
      pontuacao_urgencia: 0,
      pontuacao_operacional: 0,
      data_criacao: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      observacoes: 'Sistema sendo otimizado para melhor performance',
      tags: ['sistema', 'otimização'],
      setor_id: '',
      responsavel_interno: '',
      prazo_interno: null,
      prioridade_operacional: 'alta',
      assignee_user_id: null,
      assignee: null,
      sla_comentarios_internos: []
    }
  ], []);

  return {
    tickets: fallbackTickets,
    loading: false,
    error: null,
    stats: {
      total: 1,
      abertos: 0,
      em_andamento: 1,
      resolvidos: 0,
      fechados: 0,
      atrasados: 0,
      criticos: 0
    }
  };
};