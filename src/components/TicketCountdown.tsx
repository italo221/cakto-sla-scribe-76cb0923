import { useTicketCountdown } from '@/hooks/useTicketCountdown';
import { Clock, AlertTriangle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TicketCountdownProps {
  dataCriacao: string;
  criticidade: string;
  status: string;
  compact?: boolean;
}

export const TicketCountdown = ({ dataCriacao, criticidade, status, compact = false }: TicketCountdownProps) => {
  const { formattedTime, isExpired, urgencyLevel } = useTicketCountdown(dataCriacao, criticidade);

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
    <div className={cn(
      "relative",
      isExpired && "animate-pulse"
    )}>
      <Badge 
        variant={getVariantByUrgency()}
        className={cn(
          "flex items-center gap-1.5 font-mono transition-all duration-300",
          compact ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5",
          isExpired && "animate-[pulse_1s_ease-in-out_infinite] shadow-lg shadow-destructive/20",
          urgencyLevel === 'critical' && "animate-[pulse_2s_ease-in-out_infinite] shadow-md shadow-destructive/10"
        )}
      >
        {getIconByUrgency()}
        <span className={cn(
          "font-medium",
          isExpired && "font-bold tracking-wide"
        )}>
          {getExpiredText()}
        </span>
      </Badge>
      
      {isExpired && (
        <div className="absolute -inset-1 bg-gradient-to-r from-destructive/20 via-destructive/30 to-destructive/20 rounded-lg blur-sm animate-[pulse_1.5s_ease-in-out_infinite] -z-10" />
      )}
    </div>
  );
};