import { useState, useCallback, useRef, memo, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, pointerWithin, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, HelpCircle, Edit, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateStatusChange, type TicketStatusType } from "@/hooks/useTicketStatus";
import { usePermissions } from "@/hooks/usePermissions";
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
interface TicketKanbanProps {
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
const KanbanCard = memo(({
  ticket,
  isDragging,
  onOpenDetail,
  onEditTicket,
  userCanEdit
}: KanbanCardProps) => {
  const [isDragActive, setIsDragActive] = useState(false);
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

  // Configurações de prioridade
  const getPriorityColor = (nivel: string) => {
    switch (nivel) {
      case 'P0':
        return 'text-red-600 dark:text-red-400';
      case 'P1':
        return 'text-orange-600 dark:text-orange-400';
      case 'P2':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'P3':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };
  return <Card ref={setNodeRef} style={style} {...attributes} className={cn("group bg-card animate-fade-in relative cursor-pointer macos-card-kanban", "border border-border", isDragging && "opacity-90 rotate-2 scale-105 shadow-2xl z-50 ring-2 ring-primary", isSortableDragging && "shadow-xl scale-105 rotate-2 border-primary")} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleClick}>
      <CardContent className="p-3 space-y-3 macos-card">
        {/* Header com número, prioridade P0 e botões de ação */}
        <div className="flex items-center justify-between">
          <Badge variant="default" className="text-xs font-mono bg-primary text-primary-foreground">
            {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
          </Badge>
          <div className="flex items-center gap-1">
            {ticket.nivel_criticidade === 'P0' && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium text-red-600 dark:text-red-400">P0</span>
              </div>
            )}
            {/* Botões de ação - aparecem no hover */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-primary/10"
                onClick={handleClick}
                title="Ver detalhes"
              >
                <Eye className="h-3 w-3" />
              </Button>
              {userCanEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-primary/10"
                  onClick={handleEditClick}
                  title="Editar ticket"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Título */}
        <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
          {ticket.titulo}
        </h4>

        {/* Informações adicionais */}
        <div className="space-y-2">
          {/* Setor responsável */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="truncate font-medium">{ticket.time_responsavel}</span>
          </div>

          {/* Solicitante */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-xs">👤</span>
            <span className="truncate">{ticket.solicitante}</span>
          </div>

          {/* Prioridade (se não for P0) e Data */}
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${getPriorityColor(ticket.nivel_criticidade)}`}>
              {ticket.nivel_criticidade}
            </span>
            <span className="text-muted-foreground">
              {format(new Date(ticket.data_criacao), "dd/MM", {
              locale: ptBR
            })}
            </span>
          </div>

          {/* Badge para info-incompleta */}
          {ticket.tags?.includes("info-incompleta") && (
            <div className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded">
              <HelpCircle className="h-3 w-3" />
              <span className="font-medium">Info incompleta</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>;
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

  // Mostrar apenas os primeiros 10 tickets, o resto fica no scroll
  const visibleTickets = tickets.slice(0, 10);
  const hasMoreTickets = tickets.length > 10;
  return <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 p-2 sm:p-3 bg-muted/50 rounded-lg">
        <h3 className="font-medium text-xs sm:text-sm text-foreground truncate">{title}</h3>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs bg-primary text-primary-foreground shrink-0">
            {tickets.length}
          </Badge>
          {hasMoreTickets}
        </div>
      </div>
      
      <div ref={setNodeRef} className={cn("flex-1 p-1 sm:p-2 rounded-lg border-2 border-dashed transition-colors", "h-[600px] max-h-[600px]",
    // Altura fixa para scroll
    isOver ? "border-primary bg-primary/5" : "border-border bg-transparent")}>
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 sm:space-y-3 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            {tickets.map(ticket => <KanbanCard key={ticket.id} ticket={ticket} isDragging={false} onOpenDetail={onOpenDetail} onEditTicket={onEditTicket} userCanEdit={userCanEdit} />)}
            {tickets.length === 0 && <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Nenhum ticket nesta coluna
              </div>}
          </div>
        </SortableContext>
      </div>
    </div>;
});
DroppableColumn.displayName = 'DroppableColumn';
const TicketKanban = memo(({
  tickets,
  onOpenDetail,
  onEditTicket,
  onTicketUpdate,
  userRole
}: TicketKanbanProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedTicket, setDraggedTicket] = useState<Ticket | null>(null);
  const {
    toast
  } = useToast();
  const {
    canStartOrResolveTicket,
    getStartResolveValidationMessage,
    canCloseTicket,
    getCloseValidationMessage
  } = usePermissions();
  const userCanEdit = userRole === 'operador' || userRole === 'admin';

  // Organizar tickets por status
  const ticketsByStatus = {
    aberto: tickets.filter(t => t.status === 'aberto'),
    em_andamento: tickets.filter(t => t.status === 'em_andamento'),
    resolvido: tickets.filter(t => t.status === 'resolvido'),
    fechado: tickets.filter(t => t.status === 'fechado')
  };
  const columns = [{
    id: 'aberto',
    title: 'Abertos',
    tickets: ticketsByStatus.aberto
  }, {
    id: 'em_andamento',
    title: 'Em Andamento',
    tickets: ticketsByStatus.em_andamento
  }, {
    id: 'resolvido',
    title: 'Resolvidos',
    tickets: ticketsByStatus.resolvido
  }, {
    id: 'fechado',
    title: 'Fechados',
    tickets: ticketsByStatus.fechado
  }];
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const {
      active
    } = event;
    setActiveId(active.id as string);
    const ticket = tickets.find(t => t.id === active.id);
    setDraggedTicket(ticket || null);
  }, [tickets]);
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (!over || !userCanEdit) {
      setActiveId(null);
      setDraggedTicket(null);
      return;
    }
    const ticketId = active.id as string;
    const newStatus = over.id as TicketStatusType;
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) {
      if (import.meta.env.DEV) console.log("🚫 Status igual");
      setActiveId(null);
      setDraggedTicket(null);
      return;
    }

    // Validar mudança de status
    if (!validateStatusChange(ticket.status as TicketStatusType, newStatus, userRole)) {
      toast({
        title: "Mudança não permitida",
        description: "Esta transição de status não é permitida.",
        variant: "destructive"
      });
      setActiveId(null);
      setDraggedTicket(null);
      return;
    }

    // Verificar se pode iniciar ou resolver o ticket
    if ((newStatus === 'em_andamento' || newStatus === 'resolvido') && !canStartOrResolveTicket(ticket)) {
      const message = getStartResolveValidationMessage(ticket);
      if (message) {
        toast({
          title: "Ação não permitida",
          description: message,
          variant: "destructive"
        });
        setActiveId(null);
        setDraggedTicket(null);
        return;
      }
    }

    // Verificar se pode fechar o ticket (apenas quem criou pode fechar)
    if (newStatus === 'fechado' && !canCloseTicket(ticket)) {
      const message = getCloseValidationMessage(ticket);
      if (message) {
        toast({
          title: "Ação não permitida",
          description: message,
          variant: "destructive"
        });
        setActiveId(null);
        setDraggedTicket(null);
        return;
      }
    }
    try {
      const {
        error
      } = await supabase.from('sla_demandas').update({
        status: newStatus
      }).eq('id', ticketId);
      if (error) throw error;
      onTicketUpdate();
      toast({
        title: "Status atualizado",
        description: `Ticket movido para ${newStatus.replace('_', ' ')}`
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status do ticket.",
        variant: "destructive"
      });
    } finally {
      setActiveId(null);
      setDraggedTicket(null);
    }
  }, [tickets, userCanEdit, userRole, onTicketUpdate, toast]);
  return <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div className="p-6">
        {/* Mobile: Horizontal scroll */}
        <div className="block lg:hidden">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map(column => <div key={column.id} className="min-w-[280px] flex-shrink-0">
                <DroppableColumn id={column.id} title={column.title} tickets={column.tickets} onOpenDetail={onOpenDetail} onEditTicket={onEditTicket} userCanEdit={userCanEdit} />
              </div>)}
          </div>
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden lg:grid lg:grid-cols-4 lg:gap-6">
          {columns.map(column => <DroppableColumn key={column.id} id={column.id} title={column.title} tickets={column.tickets} onOpenDetail={onOpenDetail} onEditTicket={onEditTicket} userCanEdit={userCanEdit} />)}
        </div>
      </div>

      <DragOverlay>
        {activeId && draggedTicket ? <KanbanCard ticket={draggedTicket} isDragging={true} onOpenDetail={onOpenDetail} onEditTicket={onEditTicket} userCanEdit={userCanEdit} /> : null}
      </DragOverlay>
    </DndContext>;
});
TicketKanban.displayName = 'TicketKanban';
export default TicketKanban;