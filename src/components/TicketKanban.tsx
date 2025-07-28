import { useState, useCallback, useRef } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, pointerWithin, useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, Clock, CheckCircle, X, User, Activity, Loader2, Circle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTicketStatus, validateStatusChange, type TicketStatusType } from "@/hooks/useTicketStatus";

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

function DroppableColumn({ id, title, tickets, onOpenDetail, onEditTicket, userCanEdit }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
        <h3 className="font-medium text-sm text-foreground">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {tickets.length}
        </Badge>
      </div>
      
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 rounded-lg border-2 border-dashed transition-colors min-h-[300px]",
          isOver 
            ? "border-primary bg-primary/5" 
            : "border-border bg-transparent"
        )}
      >
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
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
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function KanbanCard({ ticket, isDragging, onOpenDetail, onEditTicket, userCanEdit }: {
  ticket: Ticket;
  isDragging: boolean;
  onOpenDetail: (ticket: Ticket) => void;
  onEditTicket: (ticket: Ticket) => void;
  userCanEdit: boolean;
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const pointerEventRef = useRef(null);
  const dragTimeout = useRef(null);
  const startPosition = useRef(null);

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

  const handleMouseDown = (e: any) => {
    if (!userCanEdit) return;
    startPosition.current = { x: e.clientX, y: e.clientY };
    pointerEventRef.current = e;
    dragTimeout.current = setTimeout(() => {
      setIsDragActive(true);
      listeners?.onPointerDown?.(pointerEventRef.current);
    }, 200);
  };

  const handleMouseMove = (e: any) => {
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

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!isDragActive && !isSortableDragging) {
      onOpenDetail(ticket);
    }
  };

  const handleEditClick = (e: any) => {
    e.stopPropagation();
    if (onEditTicket) {
      onEditTicket(ticket);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "transition-all duration-300 group bg-card animate-fade-in relative cursor-pointer",
        "border border-border rounded-lg hover:border-muted-foreground hover:shadow-md",
        isDragging && "opacity-90 rotate-2 scale-105 shadow-2xl z-50 ring-2 ring-primary",
        isSortableDragging && "shadow-xl scale-105 rotate-2 border-primary",
        userCanEdit && "hover:scale-102 hover:shadow-lg"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs font-mono">
            {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
          </Badge>
          {ticket.nivel_criticidade === 'P0' && (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
        </div>
        <h4 className="text-sm font-medium text-foreground line-clamp-2">
          {ticket.titulo}
        </h4>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{ticket.solicitante}</span>
          <span>{format(new Date(ticket.data_criacao), "dd/MM", { locale: ptBR })}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TicketKanban({ tickets, onOpenDetail, onEditTicket, onTicketUpdate, userRole }: TicketKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedTicket, setDraggedTicket] = useState<Ticket | null>(null);
  const { toast } = useToast();

  const userCanEdit = userRole === 'operador' || userRole === 'admin';

  // Organizar tickets por status
  const ticketsByStatus = {
    aberto: tickets.filter(t => t.status === 'aberto'),
    em_andamento: tickets.filter(t => t.status === 'em_andamento'),
    resolvido: tickets.filter(t => t.status === 'resolvido'),
    fechado: tickets.filter(t => t.status === 'fechado')
  };

  const columns = [
    { id: 'aberto', title: 'Abertos', tickets: ticketsByStatus.aberto },
    { id: 'em_andamento', title: 'Em Andamento', tickets: ticketsByStatus.em_andamento },
    { id: 'resolvido', title: 'Resolvidos', tickets: ticketsByStatus.resolvido },
    { id: 'fechado', title: 'Fechados', tickets: ticketsByStatus.fechado }
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
    const newStatus = over.id as TicketStatusType;
    const ticket = tickets.find(t => t.id === ticketId);

    if (!ticket || ticket.status === newStatus) {
      console.log("🚫 Status igual");
      setActiveId(null);
      setDraggedTicket(null);
      return;
    }

    // Validar mudança de status
    if (!validateStatusChange(ticket.status as TicketStatusType, newStatus, userRole)) {
      toast({
        title: "Mudança não permitida",
        description: "Esta transição de status não é permitida.",
        variant: "destructive",
      });
      setActiveId(null);
      setDraggedTicket(null);
      return;
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
        description: `Ticket movido para ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status do ticket.",
        variant: "destructive",
      });
    } finally {
      setActiveId(null);
      setDraggedTicket(null);
    }
  }, [tickets, userCanEdit, userRole, onTicketUpdate, toast]);

  return (
    <DndContext 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
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
}
