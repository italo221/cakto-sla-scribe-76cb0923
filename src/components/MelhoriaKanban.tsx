import { useState, useCallback, memo } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Eye, Edit, Lightbulb, Circle, Play, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
  isDragging?: boolean;
  onOpenDetail: (ticket: Ticket) => void;
  onEditTicket: (ticket: Ticket) => void;
  userCanEdit: boolean;
}

type MelhoriaStatusType = 'aberto' | 'em_andamento' | 'resolvido';

const statusTransitions: Record<MelhoriaStatusType, MelhoriaStatusType[]> = {
  aberto: ['em_andamento'],
  em_andamento: ['aberto', 'resolvido'],
  resolvido: ['em_andamento'],
};

const validateStatusChange = (currentStatus: MelhoriaStatusType, newStatus: MelhoriaStatusType): boolean => {
  if (currentStatus === newStatus) return false;
  return statusTransitions[currentStatus]?.includes(newStatus) || false;
};

const KanbanCard = memo(({ ticket, isDragging = false, onOpenDetail, onEditTicket, userCanEdit }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: ticket.id,
    disabled: !userCanEdit,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const getPriorityColor = (criticidade: string) => {
    switch (criticidade) {
      case 'P0': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'P1': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'P2': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'P3': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aberto': return <Circle className="h-4 w-4" />;
      case 'em_andamento': return <Play className="h-4 w-4" />;
      case 'resolvido': return <CheckCircle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "mb-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md group",
        isDragging && "opacity-50 rotate-2 scale-105 shadow-lg",
        !userCanEdit && "cursor-default"
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Lightbulb className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-xs font-medium text-muted-foreground truncate">
              {ticket.ticket_number}
            </span>
          </div>
          <Badge variant="outline" className={cn("text-xs flex-shrink-0", getPriorityColor(ticket.nivel_criticidade))}>
            {ticket.nivel_criticidade}
          </Badge>
        </div>

        <h4 className="font-semibold text-sm line-clamp-2 leading-tight">
          {ticket.titulo}
        </h4>

        {ticket.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {ticket.descricao}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2 border-t">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon(ticket.status)}
            <span className="text-xs text-muted-foreground capitalize truncate">
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {userCanEdit && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail(ticket);
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTicket(ticket);
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(ticket.data_criacao), "dd/MM/yy", { locale: ptBR })}</span>
          </div>
          <div className="flex items-center gap-1 truncate">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px]">
                {ticket.solicitante?.substring(0, 2).toUpperCase() || 'US'}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[100px]">{ticket.solicitante}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

KanbanCard.displayName = 'MelhoriaKanbanCard';

const DroppableColumn = memo(({ id, title, tickets, onOpenDetail, onEditTicket, userCanEdit }: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  const getColumnColor = (id: string) => {
    switch (id) {
      case 'aberto': return 'from-yellow-500/10 to-yellow-600/10 border-yellow-500/20';
      case 'em_andamento': return 'from-blue-500/10 to-blue-600/10 border-blue-500/20';
      case 'resolvido': return 'from-green-500/10 to-green-600/10 border-green-500/20';
      default: return 'from-gray-500/10 to-gray-600/10 border-gray-500/20';
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full min-h-[400px] rounded-lg border bg-gradient-to-br transition-all duration-200",
        getColumnColor(id),
        isOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div className="p-4 border-b bg-background/50 backdrop-blur-sm rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            {title}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {tickets.length}
          </Badge>
        </div>
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto max-h-[calc(100vh-400px)]">
        {tickets.map((ticket) => (
          <KanbanCard
            key={ticket.id}
            ticket={ticket}
            onOpenDetail={onOpenDetail}
            onEditTicket={onEditTicket}
            userCanEdit={userCanEdit}
          />
        ))}
        {tickets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma melhoria
          </div>
        )}
      </div>
    </div>
  );
});

DroppableColumn.displayName = 'MelhoriaDroppableColumn';

const MelhoriaKanban = memo(({ tickets, onOpenDetail, onEditTicket, onTicketUpdate, userRole }: MelhoriaKanbanProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedTicket, setDraggedTicket] = useState<Ticket | null>(null);
  const { toast } = useToast();
  const { canStartOrResolveTicket, getStartResolveValidationMessage } = usePermissions();
  const userCanEdit = userRole === 'operador' || userRole === 'admin';

  const ticketsByStatus = {
    aberto: tickets.filter(t => t.status === 'aberto'),
    em_andamento: tickets.filter(t => t.status === 'em_andamento'),
    resolvido: tickets.filter(t => t.status === 'resolvido'),
  };

  const columns = [
    { id: 'aberto', title: 'Aberto', tickets: ticketsByStatus.aberto },
    { id: 'em_andamento', title: 'Em Andamento', tickets: ticketsByStatus.em_andamento },
    { id: 'resolvido', title: 'Finalizado', tickets: ticketsByStatus.resolvido },
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

    if (!validateStatusChange(ticket.status as MelhoriaStatusType, newStatus)) {
      toast({
        title: "Mudança não permitida",
        description: "Esta transição de status não é permitida.",
        variant: "destructive",
      });
      setActiveId(null);
      setDraggedTicket(null);
      return;
    }

    if ((newStatus === 'em_andamento' || newStatus === 'resolvido') && !canStartOrResolveTicket(ticket)) {
      const message = getStartResolveValidationMessage(ticket);
      if (message) {
        toast({
          title: "Ação não permitida",
          description: message,
          variant: "destructive",
        });
        setActiveId(null);
        setDraggedTicket(null);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('sla_demandas')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      onTicketUpdate();
      toast({
        title: "Status atualizado",
        description: `Melhoria movida para ${newStatus === 'resolvido' ? 'Finalizado' : newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status da melhoria.",
        variant: "destructive",
      });
    } finally {
      setActiveId(null);
      setDraggedTicket(null);
    }
  }, [tickets, userCanEdit, onTicketUpdate, toast, canStartOrResolveTicket, getStartResolveValidationMessage]);

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div className="p-6">
        {/* Mobile: Horizontal scroll */}
        <div className="block lg:hidden">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map(column => (
              <div key={column.id} className="min-w-[280px] flex-shrink-0">
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

        {/* Desktop: Grid layout */}
        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
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
      </div>

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
