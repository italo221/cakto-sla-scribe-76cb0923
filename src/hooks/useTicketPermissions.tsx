import { usePermissions } from './usePermissions';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Ticket {
  id: string;
  status: string;
  setor_id?: string;
  time_responsavel?: string;
  solicitante?: string;
}

export const useTicketPermissions = () => {
  const { canStartOrResolveTicket, getStartResolveValidationMessage, canDeleteTicket, getDeleteValidationMessage } = usePermissions();
  const { user } = useAuth();
  const { toast } = useToast();

  const validateTicketAction = (ticket: Ticket, action: 'start' | 'resolve' | 'delete'): boolean => {
    switch (action) {
      case 'start':
      case 'resolve':
        if (!canStartOrResolveTicket(ticket)) {
          const message = getStartResolveValidationMessage(ticket);
          if (message) {
            toast({
              title: "Ação não permitida",
              description: message,
              variant: "destructive",
            });
          }
          return false;
        }
        break;
      
      case 'delete':
        if (!canDeleteTicket(ticket)) {
          const message = getDeleteValidationMessage(ticket);
          if (message) {
            toast({
              title: "Ação não permitida", 
              description: message,
              variant: "destructive",
            });
          }
          return false;
        }
        break;
    }
    
    return true;
  };

  const canPerformAction = (ticket: Ticket, action: 'start' | 'resolve' | 'delete'): boolean => {
    switch (action) {
      case 'start':
      case 'resolve':
        return canStartOrResolveTicket(ticket);
      case 'delete':
        return canDeleteTicket(ticket);
      default:
        return false;
    }
  };

  return {
    validateTicketAction,
    canPerformAction,
    canStartOrResolveTicket,
    canDeleteTicket
  };
};