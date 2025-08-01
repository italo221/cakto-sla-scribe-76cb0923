import { supabase } from "@/integrations/supabase/client";

export interface TicketAuditResult {
  total: number;
  problematic: number;
  tickets: Array<{
    id: string;
    titulo: string;
    descricao: string;
    time_responsavel: string;
    solicitante: string;
    status: string;
    data_criacao: string;
    issues: string[];
  }>;
}

/**
 * Audita todos os tickets no sistema para identificar dados incompletos
 */
export const auditTickets = async (): Promise<TicketAuditResult> => {
  try {
    const { data: tickets, error } = await supabase
      .from('sla_demandas')
      .select('id, titulo, descricao, time_responsavel, solicitante, status, data_criacao')
      .order('data_criacao', { ascending: false });

    if (error) throw error;

    const result: TicketAuditResult = {
      total: tickets?.length || 0,
      problematic: 0,
      tickets: []
    };

    if (!tickets) return result;

    for (const ticket of tickets) {
      const issues: string[] = [];

      // Verificar campos obrigatórios
      if (!ticket.titulo || ticket.titulo.trim() === '') {
        issues.push('Título vazio ou ausente');
      }

      if (!ticket.descricao || ticket.descricao.trim() === '') {
        issues.push('Descrição vazia ou ausente');
      }

      if (!ticket.time_responsavel || ticket.time_responsavel.trim() === '') {
        issues.push('Time responsável vazio ou ausente');
      }

      if (!ticket.solicitante || ticket.solicitante.trim() === '') {
        issues.push('Solicitante vazio ou ausente');
      }

      if (!ticket.status || ticket.status.trim() === '') {
        issues.push('Status vazio ou ausente');
      }

      // Se há problemas, adicionar à lista
      if (issues.length > 0) {
        result.problematic++;
        result.tickets.push({
          ...ticket,
          issues
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Erro na auditoria de tickets:', error);
    throw error;
  }
};

/**
 * Valida os dados de um ticket antes da criação
 */
export const validateTicketData = (ticketData: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validações rigorosas
  if (!ticketData.titulo || ticketData.titulo.trim() === '') {
    errors.push('Título é obrigatório e não pode estar vazio');
  } else if (ticketData.titulo.trim().length < 3) {
    errors.push('Título deve ter pelo menos 3 caracteres');
  }

  if (!ticketData.descricao || ticketData.descricao.trim() === '') {
    errors.push('Descrição é obrigatória e não pode estar vazia');
  } else if (ticketData.descricao.trim().length < 10) {
    errors.push('Descrição deve ter pelo menos 10 caracteres');
  }

  if (!ticketData.time_responsavel || ticketData.time_responsavel.trim() === '') {
    errors.push('Time responsável é obrigatório');
  }

  if (!ticketData.solicitante || ticketData.solicitante.trim() === '') {
    errors.push('Solicitante é obrigatório');
  }

  if (!ticketData.status || ticketData.status.trim() === '') {
    errors.push('Status é obrigatório');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitiza os dados do ticket para garantir que não há espaços vazios
 */
export const sanitizeTicketData = (ticketData: any) => {
  return {
    ...ticketData,
    titulo: ticketData.titulo?.trim() || '',
    descricao: ticketData.descricao?.trim() || '',
    time_responsavel: ticketData.time_responsavel?.trim() || '',
    solicitante: ticketData.solicitante?.trim() || '',
    status: ticketData.status?.trim() || 'aberto',
    nivel_criticidade: ticketData.nivel_criticidade?.trim() || 'P3'
  };
};