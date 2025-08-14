import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Clock, Target, Building, Play, Pause, CheckCircle2, AlertTriangle, Circle, Activity, CheckCircle, X, Edit3, Trash2, Tag, MessageSquare } from "lucide-react";
import { SetTicketDeadlineButton } from "@/components/SetTicketDeadlineButton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, memo, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
interface Ticket {
  id: string;
  ticket_number: string;
  titulo: string;
  time_responsavel: string;
  solicitante: string;
  descricao: string;
  tipo_ticket: string;
  status: string;
  nivel_criticidade: string;
  pontuacao_total: number;
  data_criacao: string;
  observacoes?: string;
  tags?: string[];
  setor_id?: string;
  responsavel_interno?: string;
  prazo_interno?: string;
  prioridade_operacional?: string;
}
interface JiraTicketCardProps {
  ticket: Ticket;
  onOpenDetail: (ticket: Ticket) => void;
  onUpdateStatus?: (ticketId: string, newStatus: string) => void;
  onEditTicket?: (ticket: Ticket) => void;
  onDeleteTicket?: (ticket: Ticket) => void;
  userCanEdit: boolean;
  userCanDelete: boolean;
  isExpired?: boolean;
}
const getStatusConfig = (status: string, isExpired: boolean) => {
  if (isExpired) {
    return {
      icon: AlertTriangle,
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      borderColor: "border-red-200",
      label: "Atrasado"
    };
  }
  const configs = {
    em_andamento: {
      icon: Activity,
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
      label: "Em Andamento"
    },
    resolvido: {
      icon: CheckCircle,
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-200",
      label: "Resolvido"
    },
    fechado: {
      icon: X,
      bgColor: "bg-gray-50",
      textColor: "text-gray-600",
      borderColor: "border-gray-200",
      label: "Fechado"
    }
  };
  return configs[status as keyof typeof configs] || {
    icon: Circle,
    bgColor: "bg-gray-50",
    textColor: "text-gray-600",
    borderColor: "border-gray-200",
    label: "Aberto"
  };
};
const getPriorityConfig = (priority: string) => {
  const configs = {
    P0: {
      color: "bg-red-100 text-red-700 border-red-200",
      label: "Crítico"
    },
    P1: {
      color: "bg-orange-100 text-orange-700 border-orange-200",
      label: "Alto"
    },
    P2: {
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      label: "Médio"
    },
    P3: {
      color: "bg-blue-100 text-blue-700 border-blue-200",
      label: "Baixo"
    }
  };
  return configs[priority as keyof typeof configs] || configs.P3;
};
const JiraTicketCard = memo(({
  ticket,
  onOpenDetail,
  onUpdateStatus,
  onEditTicket,
  onDeleteTicket,
  userCanEdit,
  userCanDelete,
  isExpired = false
}: JiraTicketCardProps) => {
  const statusConfig = useMemo(() => getStatusConfig(ticket.status, isExpired), [ticket.status, isExpired]);
  const priorityConfig = useMemo(() => getPriorityConfig(ticket.nivel_criticidade), [ticket.nivel_criticidade]);
  const StatusIcon = statusConfig.icon;
  
  const {
    canStartOrResolveTicket,
    getStartResolveValidationMessage
  } = usePermissions();
  const { toast } = useToast();

  // Estado para contador de comentários com otimização
  const [commentsCount, setCommentsCount] = useState<number>(0);

  // Carregar comentários de forma otimizada
  useEffect(() => {
    let isMounted = true;
    let channel: any = null;

    const loadCommentsCount = async () => {
      try {
        const { count, error } = await supabase
          .from('sla_comentarios_internos')
          .select('*', { count: 'exact', head: true })
          .eq('sla_id', ticket.id);
        
        if (error) throw error;
        if (isMounted) {
          setCommentsCount(count || 0);
        }
      } catch (error) {
        console.error('Erro ao carregar contagem de comentários:', error);
      }
    };

    loadCommentsCount();

    // Subscription otimizada para atualizações em tempo real
    channel = supabase
      .channel(`comments-optimized-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sla_comentarios_internos',
          filter: `sla_id=eq.${ticket.id}`
        },
        () => {
          if (isMounted) {
            loadCommentsCount();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [ticket.id]);

  const handleStatusUpdate = useMemo(() => 
    (e: React.MouseEvent, newStatus: string) => {
      e.stopPropagation();

      // Verificar se pode iniciar ou resolver o ticket
      if ((newStatus === 'em_andamento' || newStatus === 'resolvido') && !canStartOrResolveTicket(ticket)) {
        const message = getStartResolveValidationMessage(ticket);
        if (message) {
          toast({
            title: "Ação não permitida",
            description: message,
            variant: "destructive"
          });
          return;
        }
      }
      if (onUpdateStatus) {
        onUpdateStatus(ticket.id, newStatus);
      }
    }, [ticket, canStartOrResolveTicket, getStartResolveValidationMessage, toast, onUpdateStatus]
  );

  // Memoizar formatação de data
  const formattedDate = useMemo(() => 
    format(new Date(ticket.data_criacao), "dd/MM 'às' HH:mm", { locale: ptBR }),
    [ticket.data_criacao]
  );
  return <Card className={cn("group macos-card border border-border bg-white",
  // Borda lateral para prioridade
  ticket.nivel_criticidade === 'P0' && "border-l-4 border-l-red-500", ticket.nivel_criticidade === 'P1' && "border-l-4 border-l-orange-500", ticket.nivel_criticidade === 'P2' && "border-l-4 border-l-yellow-500", ticket.nivel_criticidade === 'P3' && "border-l-4 border-l-blue-500",
  // Destaque sutil para tickets atrasados
  isExpired && "bg-red-50/30",
  // Fundo verde claro para tickets resolvidos (apenas no modo lista)
  ticket.status === 'resolvido' && "bg-green-50")} onClick={() => onOpenDetail(ticket)}>
      <CardContent className="py-3 px-4 space-y-3">
        {/* Header - Número e badges */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
            {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
          </Badge>
          
          <div className="flex items-center gap-2">
            {/* Status badge */}
            <Badge className={cn("text-xs flex items-center gap-1 border", statusConfig.bgColor, statusConfig.textColor, statusConfig.borderColor)}>
              <StatusIcon size={10} />
              {statusConfig.label}
            </Badge>
            
            {/* Priority badge */}
            <Badge className={cn("text-xs border", priorityConfig.color)}>
              {ticket.nivel_criticidade}
            </Badge>
          </div>
        </div>

        {/* Título principal - estilo Jira */}
        <div className="space-y-1">
          <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">
            {ticket.titulo}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-1 leading-relaxed">
            {ticket.descricao}
          </p>
        </div>

        {/* Tags discretas */}
        {ticket.tags && ticket.tags.length > 0 && <div className="flex gap-1 flex-wrap">
            {ticket.tags.slice(0, 3).map((tag: string, index: number) => <div key={index} className="flex items-center gap-1 text-xs px-2 py-0.5 text-muted-foreground rounded-sm border border-border/50 bg-slate-50">
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </div>)}
            {ticket.tags.length > 3 && <div className="flex items-center gap-1 text-xs px-2 py-0.5 bg-muted/30 text-muted-foreground rounded-sm border border-border/30">
                <Tag className="h-2.5 w-2.5" />
                +{ticket.tags.length - 3}
              </div>}
          </div>}

        {/* Metadados - estilo Jira clean */}
        <div className="grid grid-cols-2 gap-3 text-xs leading-relaxed">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs text-gray-600 bg-gray-100">
                {ticket.solicitante.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <span className="text-gray-500">Solicitante</span>
              <p className="font-medium text-gray-900 truncate" title={ticket.solicitante}>
                {ticket.solicitante}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-3 w-3 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-gray-500">Time</span>
              <p className="font-medium text-gray-900 truncate" title={ticket.time_responsavel}>
                {ticket.time_responsavel}
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Data e pontuação */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span className={cn("font-medium", (ticket.nivel_criticidade === 'P0' || ticket.nivel_criticidade === 'P1') && "text-red-600")}>
                {ticket.pontuacao_total}pts
              </span>
            </div>
            {/* Contador de comentários discreto */}
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span className="font-medium">
                {commentsCount}
              </span>
            </div>
          </div>
          
          {/* Ações rápidas (aparecem no hover) */}
          {(userCanEdit || userCanDelete) && <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {userCanEdit && ticket.status === 'em_andamento' && <Button size="sm" variant="default" className="h-6 px-2 text-xs" onClick={e => handleStatusUpdate(e, 'resolvido')}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Resolver
                </Button>}
              <SetTicketDeadlineButton
                ticket={ticket}
                variant="outline"
                size="sm"
                showIcon={false}
              />
              {userCanEdit && onEditTicket && <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={e => {
            e.stopPropagation();
            onEditTicket(ticket);
          }}>
                  <Edit3 className="h-3 w-3 mr-1" />
                  Editar
                </Button>}
              {userCanDelete && onDeleteTicket && <Button size="sm" variant="destructive" className="h-6 px-2 text-xs" onClick={e => {
            e.stopPropagation();
            onDeleteTicket(ticket);
          }}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Excluir
                </Button>}
            </div>}
        </div>
      </CardContent>
    </Card>;
});

JiraTicketCard.displayName = 'JiraTicketCard';

export default JiraTicketCard;