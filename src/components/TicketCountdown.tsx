import { useTicketCountdown } from '@/hooks/useTicketCountdown';
import { Clock, AlertTriangle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TicketCountdownProps {
  dataCriacao: string;
  criticidade: string;
  status: string;
  prazoInterno?: string;
  compact?: boolean;
}

export const TicketCountdown = ({ dataCriacao, criticidade, status, prazoInterno, compact = false }: TicketCountdownProps) => {
  const { formattedTime, isExpired, urgencyLevel } = useTicketCountdown(dataCriacao, criticidade, prazoInterno);

  // Não mostrar cronômetro para tickets já resolvidos
  if (status === 'resolvido' || status === 'fechado') {
    return null;
  }

  const getVariantByUrgency = () => {
    switch (urgencyLevel) {
      case 'expired':
        return 'destructive';
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getIconByUrgency = () => {
    switch (urgencyLevel) {
      case 'expired':
        return <X className={cn("w-3 h-3", compact && "w-3 h-3")} />;
      case 'critical':
        return <AlertTriangle className={cn("w-3 h-3", compact && "w-3 h-3")} />;
      default:
        return <Clock className={cn("w-3 h-3", compact && "w-3 h-3")} />;
    }
  };

  const getExpiredText = () => {
    if (isExpired) {
      return 'VENCIDO';
    }
    return formattedTime;
  };

  return (
    <Badge 
      variant={getVariantByUrgency()}
      className={cn(
        "flex items-center gap-1.5 font-mono transition-all duration-300",
        compact ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5",
        isExpired && "bg-red-600 text-white border-red-600"
      )}
    >
      {getIconByUrgency()}
      <span className={cn(
        "font-medium",
        isExpired && "font-bold"
      )}>
        {getExpiredText()}
      </span>
    </Badge>
  );
};