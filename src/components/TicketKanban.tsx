import { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, Clock, CheckCircle, X, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface KanbanCardProps {
  ticket: Ticket;
  isDragging?: boolean;
  onOpenDetail: (ticket: Ticket) => void;
  userCanEdit: boolean;
}

interface KanbanColumnProps {
  title: string;
  status: string;
  tickets: Ticket[];
  color: string;
  onOpenDetail: (ticket: Ticket) => void;
  userCanEdit: boolean;
}

interface TicketKanbanProps {
  tickets: Ticket[];
  onOpenDetail: (ticket: Ticket) => void;
  onTicketUpdate: () => void;
  userRole: string;
}

// Componente do card do ticket no Kanban
function KanbanCard({ ticket, isDragging, onOpenDetail, userCanEdit }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ 
    id: ticket.id,
    disabled: !userCanEdit
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isExpired = () => {
    const timeConfig = {
      'P0': 4 * 60 * 60 * 1000,
      'P1': 24 * 60 * 60 * 1000,
      'P2': 3 * 24 * 60 * 60 * 1000,
      'P3': 7 * 24 * 60 * 60 * 1000,
    };
    
    const startTime = new Date(ticket.data_criacao).getTime();
    const timeLimit = timeConfig[ticket.nivel_criticidade as keyof typeof timeConfig] || timeConfig['P3'];
    const deadline = startTime + timeLimit;
    
    return Date.now() > deadline && ticket.status !== 'resolvido' && ticket.status !== 'fechado';
  };

  const getCriticalityColor = (criticality: string) => {
    const colors = {
      'P0': 'bg-destructive text-destructive-foreground',
      'P1': 'bg-orange-500 text-white',
      'P2': 'bg-yellow-500 text-white',
      'P3': 'bg-blue-500 text-white'
    };
    return colors[criticality as keyof typeof colors] || colors.P3;
  };

  const expired = isExpired();

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(userCanEdit ? listeners : {})}
      className={cn(
        "mb-3 cursor-pointer transition-all duration-200 hover:shadow-md",
        "border-l-4",
        // Bordas laterais por criticidade
        ticket.nivel_criticidade === 'P0' && "border-l-destructive",
        ticket.nivel_criticidade === 'P1' && "border-l-orange-500",
        ticket.nivel_criticidade === 'P2' && "border-l-yellow-500",
        ticket.nivel_criticidade === 'P3' && "border-l-blue-500",
        // Destaque sutil para tickets expirados
        expired && "bg-destructive/5 border-r-destructive/30",
        isDragging && "opacity-50",
        isSortableDragging && "shadow-lg scale-105 rotate-2",
        !userCanEdit && "cursor-default"
      )}
      onClick={() => onOpenDetail(ticket)}
    >
      <CardContent className="p-4">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
            </Badge>
            {expired && (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
          </div>
          <Badge className={getCriticalityColor(ticket.nivel_criticidade)}>
            {ticket.nivel_criticidade}
          </Badge>
        </div>

        {/* Título */}
        <h4 className="font-medium text-sm mb-2 line-clamp-2">
          {ticket.titulo}
        </h4>

        {/* Tags */}
        {ticket.tags && ticket.tags.length > 0 && (
          <div className="flex gap-1 mb-2 flex-wrap">
            {ticket.tags.slice(0, 2).map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag.toLowerCase().includes('urgente') ? '🔥' : 
                 tag.toLowerCase().includes('vip') ? '⭐' : '🏷️'} {tag}
              </Badge>
            ))}
            {ticket.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{ticket.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Solicitante */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-xs">
              {ticket.solicitante.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {ticket.solicitante}
          </span>
        </div>

        {/* Responsável */}
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate">
            {ticket.time_responsavel}
          </span>
        </div>

        {/* Data */}
        <div className="text-xs text-muted-foreground">
          {format(new Date(ticket.data_criacao), "dd/MM 'às' HH:mm", { locale: ptBR })}
        </div>

        {/* Pontuação */}
        <div className="mt-2 text-right">
          <Badge variant="outline" className="text-xs font-mono">
            {ticket.pontuacao_total} pts
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente da coluna do Kanban
function KanbanColumn({ title, status, tickets, color, onOpenDetail, userCanEdit }: KanbanColumnProps) {
  return (
    <div className="flex-1 min-w-80">
      <Card className="h-full">
        <CardHeader className={cn("pb-3", color)}>
          <CardTitle className="flex items-center justify-between text-white">
            <span>{title}</span>
            <Badge variant="secondary" className="text-foreground">
              {tickets.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 h-[calc(100vh-300px)] overflow-y-auto">
          <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tickets.map((ticket) => (
              <KanbanCard
                key={ticket.id}
                ticket={ticket}
                onOpenDetail={onOpenDetail}
                userCanEdit={userCanEdit}
              />
            ))}
          </SortableContext>
          {tickets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm">Nenhum ticket nesta coluna</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente principal do Kanban
export default function TicketKanban({ tickets, onOpenDetail, onTicketUpdate, userRole }: TicketKanbanProps) {
  const [draggedTicket, setDraggedTicket] = useState<Ticket | null>(null);
  const { toast } = useToast();

  const userCanEdit = userRole === 'super_admin' || userRole === 'operador';

  // Organizar tickets por status
  const ticketsByStatus = {
    aberto: tickets.filter(t => t.status === 'aberto'),
    em_andamento: tickets.filter(t => t.status === 'em_andamento'),
    resolvido: tickets.filter(t => t.status === 'resolvido'),
    fechado: tickets.filter(t => t.status === 'fechado'),
  };

  const columns = [
    {
      title: '📋 Abertos',
      status: 'aberto',
      tickets: ticketsByStatus.aberto,
      color: 'bg-destructive'
    },
    {
      title: '🔄 Em Andamento',
      status: 'em_andamento',
      tickets: ticketsByStatus.em_andamento,
      color: 'bg-warning'
    },
    {
      title: '✅ Resolvidos',
      status: 'resolvido',
      tickets: ticketsByStatus.resolvido,
      color: 'bg-success'
    },
    {
      title: '📁 Fechados',
      status: 'fechado',
      tickets: ticketsByStatus.fechado,
      color: 'bg-muted-foreground'
    }
  ];

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const ticket = tickets.find(t => t.id === event.active.id);
    setDraggedTicket(ticket || null);
  }, [tickets]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTicket(null);

    if (!over || !userCanEdit) return;

    const ticketId = active.id as string;
    const newStatus = over.id as string;

    // Verificar se é uma mudança válida de status
    if (!['aberto', 'em_andamento', 'resolvido', 'fechado'].includes(newStatus)) {
      return;
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;

    try {
      const { error } = await supabase
        .from('sla_demandas')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Ticket movido para "${newStatus.replace('_', ' ')}"`,
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
  }, [tickets, userCanEdit, onTicketUpdate, toast]);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <SortableContext
            key={column.status}
            items={[column.status]}
            strategy={verticalListSortingStrategy}
          >
            <div
              id={column.status}
              className="flex-1 min-w-80"
            >
              <KanbanColumn
                title={column.title}
                status={column.status}
                tickets={column.tickets}
                color={column.color}
                onOpenDetail={onOpenDetail}
                userCanEdit={userCanEdit}
              />
            </div>
          </SortableContext>
        ))}
      </div>

      <DragOverlay>
        {draggedTicket ? (
          <KanbanCard
            ticket={draggedTicket}
            isDragging
            onOpenDetail={onOpenDetail}
            userCanEdit={userCanEdit}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}