import { useState, useCallback, useRef, memo, useMemo, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, pointerWithin, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HelpCircle, Edit, Eye, User, Clock, Target, Tag, MessageSquare, Activity, CheckCircle, Circle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

// Tipos de status específicos para melhorias
type MelhoriaStatusType = 'aberto' | 'em_andamento' | 'resolvido';

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
  pontuacao_financeiro: number;
  pontuacao_cliente: number;
  pontuacao_reputacao: number;
  pontuacao_urgencia: number;
  pontuacao_operacional: number;
  data_criacao: string;
  observacoes?: string;
  tags?: string[];
  setor_id?: string;
}

interface MelhoriaKanbanProps {
  tickets: Ticket[];
  onOpenDetail: (ticket: Ticket) => void;
  onEditTicket: (ticket: Ticket) => void;
  onTicketUpdate: () => void;
  userRole: string;
}

interface DroppableColumnProps {
  id: string;
  title: string;
  tickets: Ticket[];
  onOpenDetail: (ticket: Ticket) => void;
  onEditTicket: (ticket: Ticket) => void;
  userCanEdit: boolean;
}

interface KanbanCardProps {
  ticket: Ticket;
  isDragging: boolean;
  onOpenDetail: (ticket: Ticket) => void;
  onEditTicket: (ticket: Ticket) => void;
  userCanEdit: boolean;
}

// Validação de transição de status para melhorias
const ALLOWED_TRANSITIONS: Record<MelhoriaStatusType, MelhoriaStatusType[]> = {
  'aberto': ['em_andamento'],
  'em_andamento': ['aberto', 'resolvido'],
  'resolvido': ['em_andamento']
};

const validateStatusChange = (currentStatus: MelhoriaStatusType, newStatus: MelhoriaStatusType): boolean => {
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus) || currentStatus === newStatus;
};

const KanbanCard = memo(({
  ticket,
  isDragging,
  onOpenDetail,
  onEditTicket,
  userCanEdit
}: KanbanCardProps) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [commentsCount, setCommentsCount] = useState<number>(0);
  const pointerEventRef = useRef<any>(null);
  const dragTimeout = useRef<NodeJS.Timeout | null>(null);
  const startPosition = useRef<{
    x: number;
    y: number;
  } | null>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging
  } = useSortable({
    id: ticket.id,
    disabled: !userCanEdit
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  // Carregar comentários
  useEffect(() => {
    let isMounted = true;

    const loadCommentsCount = async () => {
      try {
        const { count, error } = await supabase
          .from('sla_comentarios_internos')
          .select('id', { count: 'exact', head: true })
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

    return () => {
      isMounted = false;
    };
  }, [ticket.id]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!userCanEdit) return;
    startPosition.current = {
      x: e.clientX,
      y: e.clientY
    };
    pointerEventRef.current = e;
    dragTimeout.current = setTimeout(() => {
      setIsDragActive(true);
      listeners?.onPointerDown?.(pointerEventRef.current);
    }, 200);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startPosition.current) return;
    const dx = Math.abs(e.clientX - startPosition.current.x);
    const dy = Math.abs(e.clientY - startPosition.current.y);
    if (dx > 5 || dy > 5) {
      if (dragTimeout.current) {
        clearTimeout(dragTimeout.current);
        dragTimeout.current = null;
      }
    }
  };
  
  const handleMouseUp = () => {
    if (dragTimeout.current) {
      clearTimeout(dragTimeout.current);
      dragTimeout.current = null;
    }
    startPosition.current = null;
    pointerEventRef.current = null;
    setIsDragActive(false);
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragActive && !isSortableDragging) {
      onOpenDetail(ticket);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragActive && !isSortableDragging) {
      onEditTicket(ticket);
    }
  };

  // Configuração de status
  const getStatusConfig = (status: string) => {
    const configs = {
      em_andamento: {
        icon: Activity,
        bgColor: "bg-blue-500/10 dark:bg-blue-500/15",
        textColor: "text-blue-700 dark:text-blue-400",
        borderColor: "border-blue-500/20 dark:border-blue-500/30",
        label: "Em Andamento"
      },
      resolvido: {
        icon: CheckCircle,
        bgColor: "bg-green-500/10 dark:bg-green-500/15",
        textColor: "text-green-700 dark:text-green-400",
        borderColor: "border-green-500/20 dark:border-green-500/30",
        label: "Resolvido"
      }
    };
    return configs[status as keyof typeof configs] || {
      icon: Circle,
      bgColor: "bg-slate-500/10 dark:bg-slate-500/15",
      textColor: "text-slate-700 dark:text-slate-400",
      borderColor: "border-slate-500/20 dark:border-slate-500/30",
      label: "Aberto"
    };
  };

  // Configuração de prioridade
  const getPriorityConfig = (priority: string) => {
    const configs = {
      P0: {
        color: "bg-red-500/10 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20 dark:border-red-500/30",
        label: "Crítico",
        borderLeft: "border-l-4 border-l-red-500"
      },
      P1: {
        color: "bg-orange-500/10 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20 dark:border-orange-500/30",
        label: "Alto",
        borderLeft: "border-l-4 border-l-orange-500"
      },
      P2: {
        color: "bg-yellow-500/10 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 dark:border-yellow-500/30",
        label: "Médio",
        borderLeft: "border-l-4 border-l-yellow-500"
      },
      P3: {
        color: "bg-blue-500/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30",
        label: "Baixo",
        borderLeft: "border-l-4 border-l-blue-500"
      }
    };
    return configs[priority as keyof typeof configs] || configs.P3;
  };

  const statusConfig = getStatusConfig(ticket.status);
  const priorityConfig = getPriorityConfig(ticket.nivel_criticidade);
  const StatusIcon = statusConfig.icon;
  const formattedDate = format(new Date(ticket.data_criacao), "dd/MM 'às' HH:mm", { locale: ptBR });

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      className={cn(
        "group macos-card border border-border bg-card",
        priorityConfig.borderLeft,
        ticket.status === 'resolvido' && "bg-green-50 dark:bg-green-900/10",
        isDragging && "opacity-90 rotate-2 scale-105 shadow-2xl z-50 ring-2 ring-primary", 
        isSortableDragging && "shadow-xl scale-105 rotate-2 border-primary"
      )} 
      onMouseDown={handleMouseDown} 
      onMouseMove={handleMouseMove} 
      onMouseUp={handleMouseUp} 
      onMouseLeave={handleMouseUp} 
      onClick={handleClick}
    >
      <CardContent className="py-2 px-3 space-y-2">
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

        {/* Título principal */}
        <div className="space-y-0.5">
          <h3 className="font-semibold text-foreground text-base leading-tight line-clamp-2">
            {ticket.titulo}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {ticket.descricao}
          </p>
        </div>

        {/* Tags discretas */}
        {ticket.tags && ticket.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {ticket.tags.slice(0, 3).map((tag: string, index: number) => {
              const isInfoIncompleta = tag === "info-incompleta";
              return (
                <div 
                  key={index} 
                  className={cn(
                    "flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm border",
                    isInfoIncompleta 
                      ? "bg-yellow-500/10 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 dark:border-yellow-500/30" 
                      : "bg-muted/30 text-muted-foreground border-border/50"
                  )}
                >
                  {isInfoIncompleta ? (
                    <HelpCircle className="h-2.5 w-2.5" />
                  ) : (
                    <Tag className="h-2.5 w-2.5" />
                  )}
                  {isInfoIncompleta ? "Info incompleta" : tag}
                </div>
              );
            })}
            {ticket.tags.length > 3 && (
              <div className="flex items-center gap-1 text-xs px-2 py-0.5 bg-muted/50 text-muted-foreground rounded-sm border border-border/30">
                <Tag className="h-2.5 w-2.5" />
                +{ticket.tags.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Metadados */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px] text-muted-foreground bg-muted">
                {ticket.solicitante.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-muted-foreground">Solicitante</span>
              <p className="text-xs font-medium text-foreground truncate" title={ticket.solicitante}>
                {ticket.solicitante}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-2.5 w-2.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-muted-foreground">Time</span>
              <p className="text-xs font-medium text-foreground truncate" title={ticket.time_responsavel}>
                {ticket.time_responsavel}
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Data e pontuação */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span className={cn("font-medium", (ticket.nivel_criticidade === 'P0' || ticket.nivel_criticidade === 'P1') && "text-destructive")}>
                {ticket.pontuacao_total}pts
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span className="font-medium">
                {commentsCount}
              </span>
            </div>
          </div>
          
          {/* Ações rápidas (aparecem no hover) */}
          {userCanEdit && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-6 px-2 text-xs bg-muted/30 dark:bg-muted/20 border-border/50 dark:border-border/40 hover:bg-muted/50 dark:hover:bg-muted/30" 
                onClick={handleClick}
                title="Ver detalhes"
              >
                <Eye className="h-3 w-3 mr-1" />
                Ver
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-6 px-2 text-xs bg-muted/30 dark:bg-muted/20 border-border/50 dark:border-border/40 hover:bg-muted/50 dark:hover:bg-muted/30" 
                onClick={handleEditClick}
                title="Editar ticket"
              >
                <Edit className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

KanbanCard.displayName = 'KanbanCard';

const DroppableColumn = memo(({
  id,
  title,
  tickets,
  onOpenDetail,
  onEditTicket,
  userCanEdit
}: DroppableColumnProps) => {
  const {
    setNodeRef,
    isOver
  } = useDroppable({
    id
  });

  const hasMoreTickets = tickets.length > 10;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 p-2 sm:p-3 bg-muted/50 rounded-lg">
        <h3 className="font-medium text-xs sm:text-sm text-foreground truncate">{title}</h3>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs bg-primary text-primary-foreground shrink-0">
            {tickets.length}
          </Badge>
        </div>
      </div>
      
      <div 
        ref={setNodeRef} 
        className={cn(
          "flex-1 p-1 sm:p-2 rounded-lg border-2 border-dashed transition-colors",
          "h-[600px] max-h-[600px]",
          isOver ? "border-primary bg-primary/5" : "border-border bg-transparent"
        )}
      >
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 sm:space-y-3 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            {tickets.map(ticket => (
              <KanbanCard 
                key={ticket.id} 
                ticket={ticket} 
                isDragging={false} 
                onOpenDetail={onOpenDetail} 
                onEditTicket={onEditTicket} 
                userCanEdit={userCanEdit} 
              />
            ))}
            {tickets.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Nenhum ticket nesta coluna
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
});

DroppableColumn.displayName = 'DroppableColumn';

const MelhoriaKanban = memo(({
  tickets,
  onOpenDetail,
  onEditTicket,
  onTicketUpdate,
  userRole
}: MelhoriaKanbanProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedTicket, setDraggedTicket] = useState<Ticket | null>(null);
  const { toast } = useToast();
  
  const userCanEdit = userRole === 'operador' || userRole === 'admin';

  // Organizar tickets por status (apenas 3 colunas)
  const ticketsByStatus = {
    aberto: tickets.filter(t => t.status === 'aberto'),
    em_andamento: tickets.filter(t => t.status === 'em_andamento'),
    resolvido: tickets.filter(t => t.status === 'resolvido')
  };

  const columns = [
    { id: 'aberto', title: 'Aberto', tickets: ticketsByStatus.aberto },
    { id: 'em_andamento', title: 'Em Andamento', tickets: ticketsByStatus.em_andamento },
    { id: 'resolvido', title: 'Finalizado', tickets: ticketsByStatus.resolvido }
  ];

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const ticket = tickets.find(t => t.id === active.id);
    setDraggedTicket(ticket || null);
  }, [tickets]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !userCanEdit) {
      setActiveId(null);
      setDraggedTicket(null);
      return;
    }

    const ticketId = active.id as string;
    const newStatus = over.id as MelhoriaStatusType;
    const ticket = tickets.find(t => t.id === ticketId);

    if (!ticket || ticket.status === newStatus) {
      setActiveId(null);
      setDraggedTicket(null);
      return;
    }

    // Validar transição de status
    if (!validateStatusChange(ticket.status as MelhoriaStatusType, newStatus)) {
      toast({
        title: "Transição inválida",
        description: "Essa mudança de status não é permitida",
        variant: "destructive"
      });
      setActiveId(null);
      setDraggedTicket(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('sla_demandas')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'resolvido' && { resolved_at: new Date().toISOString() })
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Ticket movido para ${newStatus === 'em_andamento' ? 'Em Andamento' : newStatus === 'resolvido' ? 'Finalizado' : 'Aberto'}`,
      });

      onTicketUpdate();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do ticket",
        variant: "destructive"
      });
    }

    setActiveId(null);
    setDraggedTicket(null);
  }, [tickets, userCanEdit, toast, onTicketUpdate]);

  return (
    <DndContext 
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Mobile: Scroll horizontal */}
      <div className="md:hidden overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max px-4">
          {columns.map(column => (
            <div key={column.id} className="w-[320px] flex-shrink-0">
              <DroppableColumn
                id={column.id}
                title={column.title}
                tickets={column.tickets}
                onOpenDetail={onOpenDetail}
                onEditTicket={onEditTicket}
                userCanEdit={userCanEdit}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Grid */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 px-4">
        {columns.map(column => (
          <DroppableColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tickets={column.tickets}
            onOpenDetail={onOpenDetail}
            onEditTicket={onEditTicket}
            userCanEdit={userCanEdit}
          />
        ))}
      </div>

      {/* Overlay do card sendo arrastado */}
      <DragOverlay>
        {activeId && draggedTicket ? (
          <KanbanCard
            ticket={draggedTicket}
            isDragging={true}
            onOpenDetail={onOpenDetail}
            onEditTicket={onEditTicket}
            userCanEdit={userCanEdit}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});

MelhoriaKanban.displayName = 'MelhoriaKanban';

export default MelhoriaKanban;
