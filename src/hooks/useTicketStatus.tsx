import { useMemo } from 'react';
import { AlertCircle, Clock, CheckCircle, X, Activity, AlertTriangle } from "lucide-react";

export type TicketStatusType = 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';

export interface TicketStatusInfo {
  status: TicketStatusType;
  isExpired: boolean;
  displayStatus: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: any;
  canEdit: boolean;
}

interface SimpleTicket {
  id: string;
  status: string;
  nivel_criticidade: string;
  data_criacao: string;
}

interface UseTicketStatusProps {
  ticket: SimpleTicket;
  userRole: string;
}

export const useTicketStatus = ({ ticket, userRole }: UseTicketStatusProps) => {
  const userCanEdit = userRole === 'super_admin' || userRole === 'operador';

  // Calcular se o ticket está atrasado automaticamente
  const isExpired = useMemo(() => {
    // Tickets resolvidos ou fechados nunca estão atrasados
    if (ticket.status === 'resolvido' || ticket.status === 'fechado') return false;
    
    const timeConfig = {
      'P0': 4 * 60 * 60 * 1000, // 4 horas
      'P1': 24 * 60 * 60 * 1000, // 24 horas
      'P2': 3 * 24 * 60 * 60 * 1000, // 3 dias
      'P3': 7 * 24 * 60 * 60 * 1000, // 7 dias
    };
    
    const startTime = new Date(ticket.data_criacao).getTime();
    const timeLimit = timeConfig[ticket.nivel_criticidade as keyof typeof timeConfig] || timeConfig['P3'];
    const deadline = startTime + timeLimit;
    
    return Date.now() > deadline;
  }, [ticket.data_criacao, ticket.nivel_criticidade, ticket.status]);

  // Configuração centralizada de status
  const statusInfo = useMemo((): TicketStatusInfo => {
    const baseStatus = ticket.status as TicketStatusType;
    
    // Se está atrasado, sobrescrever as cores para vermelho
    if (isExpired) {
      return {
        status: baseStatus,
        isExpired: true,
        displayStatus: `${getStatusLabel(baseStatus)} (Atrasado)`,
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-800',
        borderColor: 'border-red-200',
        icon: AlertTriangle,
        canEdit: userCanEdit
      };
    }

    // Status normal
    const statusConfig = {
      'aberto': {
        displayStatus: 'Aberto',
        color: 'bg-gray-500',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-200',
        icon: AlertCircle
      },
      'em_andamento': {
        displayStatus: 'Em Andamento',
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
        icon: Activity
      },
      'resolvido': {
        displayStatus: 'Resolvido',
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        icon: CheckCircle
      },
      'fechado': {
        displayStatus: 'Fechado',
        color: 'bg-gray-500',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-300',
        icon: X
      }
    };

    const config = statusConfig[baseStatus] || statusConfig.aberto;

    return {
      status: baseStatus,
      isExpired: false,
      displayStatus: config.displayStatus,
      color: config.color,
      bgColor: config.bgColor,
      textColor: config.textColor,
      borderColor: config.borderColor,
      icon: config.icon,
      canEdit: userCanEdit
    };
  }, [ticket.status, isExpired, userCanEdit]);

  return statusInfo;
};

// Função helper para obter o label do status
const getStatusLabel = (status: TicketStatusType): string => {
  const labels = {
    'aberto': 'Aberto',
    'em_andamento': 'Em Andamento',
    'resolvido': 'Resolvido',
    'fechado': 'Fechado'
  };
  return labels[status] || 'Desconhecido';
};

// Hook para filtrar tickets por categoria
export const useTicketFilters = (tickets: SimpleTicket[]) => {
  return useMemo(() => {
    const expired = tickets.filter(ticket => {
      if (ticket.status === 'resolvido' || ticket.status === 'fechado') return false;
      
      const timeConfig = {
        'P0': 4 * 60 * 60 * 1000,
        'P1': 24 * 60 * 60 * 1000,
        'P2': 3 * 24 * 60 * 60 * 1000,
        'P3': 7 * 24 * 60 * 60 * 1000,
      };
      
      const startTime = new Date(ticket.data_criacao).getTime();
      const timeLimit = timeConfig[ticket.nivel_criticidade as keyof typeof timeConfig] || timeConfig['P3'];
      const deadline = startTime + timeLimit;
      
      return Date.now() > deadline;
    });

    return {
      all: tickets,
      aberto: tickets.filter(t => t.status === 'aberto'),
      em_andamento: tickets.filter(t => t.status === 'em_andamento'),
      resolvido: tickets.filter(t => t.status === 'resolvido'),
      fechado: tickets.filter(t => t.status === 'fechado'),
      atrasado: expired,
      // Filtros compostos
      abertoAtrasado: expired.filter(t => t.status === 'aberto'),
      emAndamentoAtrasado: expired.filter(t => t.status === 'em_andamento')
    };
  }, [tickets]);
};

// Função para validar mudanças de status
export const validateStatusChange = (
  fromStatus: TicketStatusType,
  toStatus: TicketStatusType,
  userRole: string
): { valid: boolean; reason?: string } => {
  const userCanEdit = userRole === 'super_admin' || userRole === 'operador';
  
  if (!userCanEdit) {
    return { valid: false, reason: 'Usuário não tem permissão para alterar status' };
  }

  // Status válidos que podem ser alterados manualmente
  const validStatuses: TicketStatusType[] = ['aberto', 'em_andamento', 'resolvido', 'fechado'];
  
  if (!validStatuses.includes(toStatus)) {
    return { valid: false, reason: 'Status de destino inválido' };
  }

  // Regras de negócio específicas
  if (fromStatus === 'fechado' && toStatus !== 'fechado') {
    return { valid: false, reason: 'Tickets fechados não podem ser reabertos' };
  }

  return { valid: true };
};