import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, AlertTriangle, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSLAPolicies } from '@/hooks/useSLAPolicies';
import { usePermissions } from '@/hooks/usePermissions';

interface SLADeadlineChipProps {
  ticket: {
    id: string;
    nivel_criticidade: string;
    data_criacao: string;
    prazo_interno?: string;
    setor_id?: string;
    status: string;
  };
  onSetDeadline: () => void;
  onForceDeadline?: () => void;
  showActions?: boolean;
}

export const SLADeadlineChip = ({ 
  ticket, 
  onSetDeadline, 
  onForceDeadline,
  showActions = true 
}: SLADeadlineChipProps) => {
  const { getPolicyBySetor, calculateSLADeadline } = useSLAPolicies();
  const { userSetores } = usePermissions();

  const policy = ticket.setor_id ? getPolicyBySetor(ticket.setor_id) : null;
  const isFixedSLA = policy?.mode === 'FIXO';
  const isCustomSLA = policy?.mode === 'PERSONALIZADO';
  
  // Verificar se o usuário pode editar prazos neste setor
  const canEditDeadline = ticket.setor_id && userSetores.some(us => us.setor_id === ticket.setor_id);
  const isSuperAdmin = userSetores.some(us => us.is_leader); // Simplificado para exemplo

  // Calcular deadline efetivo
  const deadline = ticket.prazo_interno 
    ? new Date(ticket.prazo_interno)
    : calculateSLADeadline(ticket.nivel_criticidade, ticket.data_criacao, ticket.setor_id);

  const now = new Date();
  const isOverdue = now > deadline;
  const isNearDeadline = !isOverdue && (deadline.getTime() - now.getTime()) < (2 * 60 * 60 * 1000); // 2 horas

  // Não mostrar para tickets resolvidos/fechados
  if (['resolvido', 'fechado'].includes(ticket.status)) {
    return null;
  }

  const formatDeadline = (date: Date) => {
    return format(date, "dd/MM HH:mm", { locale: ptBR });
  };

  const getVariant = () => {
    if (isOverdue) return 'destructive';
    if (isNearDeadline) return 'secondary';
    return 'outline';
  };

  const getTimeInfo = () => {
    const hours = Math.abs(deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (isOverdue) {
      if (hours < 24) {
        return `VENCIDO há ${Math.floor(hours)}h`;
      }
      return `VENCIDO há ${Math.floor(hours / 24)}d`;
    }
    
    if (hours < 24) {
      return `vence em ${Math.floor(hours)}h`;
    }
    return `vence em ${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge 
        variant={getVariant()}
        className={cn(
          "flex items-center gap-1.5 text-xs px-2 py-1",
          isOverdue && "bg-red-600 text-white border-red-600 animate-pulse"
        )}
      >
        {isOverdue ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <Clock className="h-3 w-3" />
        )}
        <span className="font-medium">
          SLA: {ticket.nivel_criticidade} • {formatDeadline(deadline)}
        </span>
      </Badge>

      <div className="text-xs text-muted-foreground">
        {getTimeInfo()}
      </div>

      {ticket.prazo_interno && (
        <Badge variant="outline" className="text-xs">
          Customizado
        </Badge>
      )}

      {showActions && (
        <div className="flex items-center gap-1">
          {/* SLA Personalizado - operadores podem definir */}
          {isCustomSLA && canEditDeadline && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onSetDeadline}
              className="h-6 px-2 text-xs"
            >
              <Edit className="h-3 w-3 mr-1" />
              {ticket.prazo_interno ? 'Alterar' : 'Definir'} Prazo
            </Button>
          )}

          {/* SLA Fixo - apenas Super Admin pode forçar */}
          {isFixedSLA && isSuperAdmin && onForceDeadline && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onForceDeadline}
              className="h-6 px-2 text-xs text-orange-600 hover:text-orange-700"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Forçar Prazo
            </Button>
          )}
        </div>
      )}
    </div>
  );
};