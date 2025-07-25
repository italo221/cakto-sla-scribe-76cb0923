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
        "mb-3 cursor-pointer transition-all duration-300 group",
        "border-l-4 rounded-lg shadow-sm hover:shadow-md",
        // Bordas laterais por criticidade
        ticket.nivel_criticidade === 'P0' && "border-l-destructive bg-destructive/5",
        ticket.nivel_criticidade === 'P1' && "border-l-orange-500 bg-orange-50",
        ticket.nivel_criticidade === 'P2' && "border-l-yellow-500 bg-yellow-50",
        ticket.nivel_criticidade === 'P3' && "border-l-blue-500 bg-blue-50",
        // Estados de drag
        isDragging && "opacity-60 scale-95 rotate-1 shadow-lg",
        isSortableDragging && "shadow-xl scale-105 z-10",
        // Destaque sutil para tickets expirados
        expired && "ring-1 ring-destructive/20 bg-destructive/10",
        !userCanEdit && "cursor-default opacity-90"
      )}
      onClick={() => onOpenDetail(ticket)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Cabeçalho com ticket number e criticidade */}
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary" className="font-mono text-xs flex-shrink-0">
            {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
          </Badge>
          <div className="flex items-center gap-1 flex-shrink-0">
            {expired && (
              <AlertTriangle className="h-3 w-3 text-destructive animate-pulse" />
            )}
            <Badge className={getCriticalityColor(ticket.nivel_criticidade)}>
              {ticket.nivel_criticidade}
            </Badge>
          </div>
        </div>

        {/* Título com quebra automática */}
        <h4 className="font-semibold text-sm leading-tight break-words hyphens-auto group-hover:text-primary transition-colors">
          {ticket.titulo}
        </h4>

        {/* Tags (máximo 2 no Kanban) */}
        {ticket.tags && ticket.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {ticket.tags.slice(0, 2).map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs px-2 py-0.5 bg-background/50 border-primary/20">
                <span className="mr-1">
                  {tag.toLowerCase().includes('urgente') ? '🔥' : 
                   tag.toLowerCase().includes('vip') ? '⭐' : '🏷️'}
                </span>
                <span className="truncate max-w-16">{tag}</span>
              </Badge>
            ))}
            {ticket.tags.length > 2 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-muted/50">
                +{ticket.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Informações de usuários */}
        <div className="space-y-2 text-xs">
          {/* Solicitante */}
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5 flex-shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {ticket.solicitante.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-xs">Solicitante</p>
              <p className="font-medium text-xs truncate" title={ticket.solicitante}>
                {ticket.solicitante}
              </p>
            </div>
          </div>

          {/* Time Responsável */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-xs">Responsável</p>
              <p className="font-medium text-xs truncate" title={ticket.time_responsavel}>
                {ticket.time_responsavel}
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé com data e pontuação */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            {format(new Date(ticket.data_criacao), "dd/MM", { locale: ptBR })}
          </div>
          <Badge variant="outline" className="text-xs font-mono bg-primary/5 border-primary/20">
            {ticket.pontuacao_total}pts
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente da coluna do Kanban
function KanbanColumn({ title, status, tickets, color, onOpenDetail, userCanEdit }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div className="flex-1 min-w-80 max-w-sm">
      <Card className={cn(
        "h-full transition-all duration-300",
        isDragOver && "ring-2 ring-primary/50 bg-primary/5 shadow-lg"
      )}>
        <CardHeader className={cn(
          "pb-4 rounded-t-lg text-center",
          color,
          "shadow-sm"
        )}>
          <CardTitle className="flex items-center justify-center gap-2 text-white font-semibold">
            <span className="truncate">{title}</span>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 font-mono">
              {tickets.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent 
          className="p-4 h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={() => setIsDragOver(false)}
        >
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
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3 opacity-50">📭</div>
              <p className="text-sm font-medium">Nenhum ticket</p>
              <p className="text-xs text-muted-foreground/70">nesta coluna</p>
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
      title: '🔴 Abertos',
      status: 'aberto',
      tickets: ticketsByStatus.aberto,
      color: 'bg-gradient-to-r from-destructive to-destructive/90'
    },
    {
      title: '🟡 Em Andamento',
      status: 'em_andamento',
      tickets: ticketsByStatus.em_andamento,
      color: 'bg-gradient-to-r from-warning to-warning/90'
    },
    {
      title: '🟢 Resolvidos',
      status: 'resolvido',
      tickets: ticketsByStatus.resolvido,
      color: 'bg-gradient-to-r from-success to-success/90'
    },
    {
      title: '⚫ Fechados',
      status: 'fechado',
      tickets: ticketsByStatus.fechado,
      color: 'bg-gradient-to-r from-muted-foreground to-muted-foreground/90'
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
      <div className="flex gap-6 overflow-x-auto pb-6 px-2">
        {columns.map((column) => (
          <SortableContext
            key={column.status}
            items={[column.status]}
            strategy={verticalListSortingStrategy}
          >
            <div
              id={column.status}
              className="flex-1 min-w-80 max-w-sm"
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
          <div className="transform rotate-3 scale-105">
            <KanbanCard
              ticket={draggedTicket}
              isDragging
              onOpenDetail={onOpenDetail}
              userCanEdit={userCanEdit}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}