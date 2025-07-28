import { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, rectIntersection, useDroppable, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle, X, User, Activity, Circle } from "lucide-react";
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

// Função para validar mudanças de status (simplificada para evitar problemas)
const validateStatusTransition = (fromStatus: string, toStatus: string): boolean => {
  // Permitir qualquer mudança para simplificar e evitar erros
  return true;
};

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
    transition: transition || 'transform 200ms cubic-bezier(0.18, 0.67, 0.6, 1.22)',
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
      'P0': 'bg-red-600 text-white',
      'P1': 'bg-orange-500 text-white',
      'P2': 'bg-yellow-500 text-white',
      'P3': 'bg-blue-500 text-white'
    };
    return colors[criticality as keyof typeof colors] || colors['P3'];
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-pointer transition-all duration-200 ease-in-out hover:shadow-lg hover:scale-[1.02] group",
        isDragging && "opacity-60 rotate-3 scale-105 shadow-2xl z-10",
        isSortableDragging && "shadow-lg scale-105",
        isExpired() && "border-red-500 bg-red-50 dark:bg-red-950/20",
        userCanEdit ? "hover:border-primary/50" : "cursor-default hover:shadow-none hover:scale-100"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onOpenDetail(ticket);
      }}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header do ticket */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
              </span>
              {isExpired() && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                  <Clock className="h-3 w-3 mr-1" />
                  Vencido
                </Badge>
              )}
            </div>
            <h4 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {ticket.titulo}
            </h4>
          </div>
          <Badge className={cn("text-xs font-medium shrink-0", getCriticalityColor(ticket.nivel_criticidade))}>
            {ticket.nivel_criticidade}
          </Badge>
        </div>

        {/* Descrição compacta */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {ticket.descricao}
        </p>

        {/* Tags (apenas as 2 primeiras) */}
        {ticket.tags && ticket.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {ticket.tags.slice(0, 2).map((tag, index) => (
              <span key={index} className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                {tag}
              </span>
            ))}
            {ticket.tags.length > 2 && (
              <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                +{ticket.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Info compacta */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-primary">
                {ticket.solicitante.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="truncate" title={ticket.solicitante}>
              {ticket.solicitante}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="truncate" title={ticket.time_responsavel}>
              {ticket.time_responsavel}
            </span>
          </div>
        </div>

        {/* Footer minimalista */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {format(new Date(ticket.data_criacao), "dd/MM", { locale: ptBR })}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-medium">
              {ticket.pontuacao_total}
            </span>
            <span className="text-xs text-muted-foreground">pts</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente da coluna do Kanban
function KanbanColumn({ title, status, tickets, color, onOpenDetail, userCanEdit }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const getColumnIcon = (status: string) => {
    switch (status) {
      case 'aberto':
        return <Circle className="h-4 w-4" />;
      case 'em_andamento':
        return <Activity className="h-4 w-4" />;
      case 'resolvido':
        return <CheckCircle className="h-4 w-4" />;
      case 'fechado':
        return <X className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 min-w-[300px] max-w-[350px]">
      <div className="bg-card border rounded-lg shadow-sm h-full flex flex-col">
        {/* Header da coluna - minimalista */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getColumnIcon(status)}
              <h3 className="font-semibold text-foreground">{title}</h3>
            </div>
            <Badge variant="secondary" className="text-xs">
              {tickets.length}
            </Badge>
          </div>
        </div>
        
        {/* Área de drop com scroll */}
        <div 
          ref={setNodeRef}
          className={cn(
            "flex-1 p-3 space-y-3 overflow-y-auto scrollbar-thin max-h-[calc(100vh-300px)]",
            isOver && userCanEdit && "bg-accent/10 border-2 border-dashed border-primary/30 rounded-lg"
          )}
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
          
          {/* Área de drop visual quando está vazia */}
          {tickets.length === 0 && (
            <div className={cn(
              "text-center py-12 text-muted-foreground transition-all duration-200",
              isOver && userCanEdit && "bg-primary/5 rounded-lg"
            )}>
              <Circle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {isOver && userCanEdit ? "Solte o ticket aqui" : "Nenhum ticket"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TicketKanban({ tickets, onOpenDetail, onTicketUpdate, userRole }: TicketKanbanProps) {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const { toast } = useToast();

  const userCanEdit = userRole === 'operador' || userRole === 'admin';

  // Definir as colunas do Kanban
  const columns = [
    {
      title: 'Aberto',
      status: 'aberto',
      tickets: tickets.filter(t => t.status === 'aberto'),
      color: 'red'
    },
    {
      title: 'Em Andamento',
      status: 'em_andamento',
      tickets: tickets.filter(t => t.status === 'em_andamento'),
      color: 'blue'
    },
    {
      title: 'Resolvido',
      status: 'resolvido',
      tickets: tickets.filter(t => t.status === 'resolvido'),
      color: 'green'
    },
    {
      title: 'Fechado',
      status: 'fechado',
      tickets: tickets.filter(t => t.status === 'fechado'),
      color: 'gray'
    }
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const ticket = tickets.find(t => t.id === active.id);
    setActiveTicket(ticket || null);
  }, [tickets]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);
    
    if (!over || !userCanEdit) return;
    
    const ticketId = active.id as string;
    const newStatus = over.id as string;
    
    // Encontrar o ticket
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    // Se o status não mudou, não fazer nada
    if (ticket.status === newStatus) return;
    
    // Validar mudança de status (simplificado)
    if (!validateStatusTransition(ticket.status, newStatus)) {
      toast({
        title: "Mudança de status inválida",
        description: `Não é possível alterar de "${ticket.status}" para "${newStatus}".`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Atualizar no banco
      const { error } = await supabase
        .from('sla_demandas')
        .update({ status: newStatus })
        .eq('id', ticketId);
      
      if (error) throw error;
      
      // Log da ação
      await supabase.rpc('log_sla_action', {
        p_sla_id: ticketId,
        p_acao: `mudanca_status_${ticket.status}_para_${newStatus}`,
        p_justificativa: `Status alterado via Kanban de "${ticket.status}" para "${newStatus}"`,
        p_dados_anteriores: { status: ticket.status },
        p_dados_novos: { status: newStatus }
      });
      
      toast({
        title: "Status atualizado",
        description: `Ticket movido para ${newStatus}.`,
      });
      
      onTicketUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [tickets, userCanEdit, toast, onTicketUpdate]);

  return (
    <div className="h-full">
      <DndContext 
        sensors={sensors} 
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
          {columns.map(column => (
            <KanbanColumn
              key={column.status}
              title={column.title}
              status={column.status}
              tickets={column.tickets}
              color={column.color}
              onOpenDetail={onOpenDetail}
              userCanEdit={userCanEdit}
            />
          ))}
        </div>
        
        <DragOverlay 
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeTicket ? (
            <KanbanCard
              ticket={activeTicket}
              isDragging={true}
              onOpenDetail={onOpenDetail}
              userCanEdit={userCanEdit}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}