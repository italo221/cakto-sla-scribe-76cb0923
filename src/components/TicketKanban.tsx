import { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, DragOverEvent, pointerWithin, rectIntersection, useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  onEditTicket?: (ticket: Ticket) => void;
  userCanEdit: boolean;
}

interface KanbanColumnProps {
  title: string;
  status: string;
  tickets: Ticket[];
  color: string;
  onOpenDetail: (ticket: Ticket) => void;
  onEditTicket?: (ticket: Ticket) => void;
  userCanEdit: boolean;
}

interface TicketKanbanProps {
  tickets: Ticket[];
  onOpenDetail: (ticket: Ticket) => void;
  onEditTicket?: (ticket: Ticket) => void;
  onTicketUpdate: () => void;
  userRole: string;
}

// Componente do card do ticket no Kanban
function KanbanCard({ ticket, isDragging, onOpenDetail, onEditTicket, userCanEdit }: KanbanCardProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  
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

  // Usar lógica centralizada de status
  const statusInfo = useTicketStatus({ 
    ticket: { 
      id: ticket.id, 
      status: ticket.status, 
      nivel_criticidade: ticket.nivel_criticidade, 
      data_criacao: ticket.data_criacao 
    }, 
    userRole: userCanEdit ? 'super_admin' : 'viewer' 
  });

  // Handlers para clique vs drag melhorados
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!userCanEdit) return;
    setIsDragActive(true);
  };

  const handleMouseUp = () => {
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
    if (onEditTicket) {
      onEditTicket(ticket);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(userCanEdit ? listeners : {})}
      className={cn(
        "transition-all duration-300 group bg-white animate-fade-in relative cursor-pointer",
        "border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md",
        // Usar cores do statusInfo
        statusInfo.bgColor,
        statusInfo.borderColor,
        // Destaque sutil para criticidade
        ticket.nivel_criticidade === 'P0' && "border-l-4 border-l-red-500",
        ticket.nivel_criticidade === 'P1' && "border-l-4 border-l-orange-500",
        ticket.nivel_criticidade === 'P2' && "border-l-4 border-l-yellow-500",
        ticket.nivel_criticidade === 'P3' && "border-l-4 border-l-blue-500",
        // Estados de drag - animações mais fluidas
        isDragging && "opacity-90 rotate-2 scale-105 shadow-2xl z-50 ring-2 ring-blue-300",
        isSortableDragging && "shadow-xl scale-105 rotate-2 border-blue-400",
        // Hover effect melhorado
        userCanEdit && "hover:scale-102 hover:shadow-lg"
      )}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header compacto */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs font-mono bg-gray-100 text-gray-600 border-0">
            {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
          </Badge>
          <div className="flex items-center gap-1">
            {/* Badge de status com lógica centralizada */}
            {(() => {
              const StatusIcon = statusInfo.icon;
              return (
                <Badge className={`${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor} flex items-center gap-1 text-xs px-2 py-1`}>
                  <StatusIcon size={10} />
                  {statusInfo.displayStatus}
                </Badge>
              );
            })()}
            {/* Criticidade */}
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded text-white font-medium",
              ticket.nivel_criticidade === 'P0' && "bg-red-500",
              ticket.nivel_criticidade === 'P1' && "bg-orange-500", 
              ticket.nivel_criticidade === 'P2' && "bg-yellow-500",
              ticket.nivel_criticidade === 'P3' && "bg-blue-500"
            )}>
              {ticket.nivel_criticidade}
            </span>
          </div>
        </div>

        {/* Título clean */}
        <h4 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2 group-hover:text-gray-700">
          {ticket.titulo}
        </h4>

        {/* Tags minimalistas */}
        {ticket.tags && ticket.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {ticket.tags.slice(0, 2).map((tag: string, index: number) => (
              <span key={index} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                {tag}
              </span>
            ))}
            {ticket.tags.length > 2 && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                +{ticket.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Info compacta */}
        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-gray-600">
                {ticket.solicitante.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="truncate" title={ticket.solicitante}>
              {ticket.solicitante}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-gray-400" />
            <span className="truncate" title={ticket.time_responsavel}>
              {ticket.time_responsavel}
            </span>
          </div>
        </div>

        {/* Footer minimalista */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {format(new Date(ticket.data_criacao), "dd/MM", { locale: ptBR })}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">
              {ticket.pontuacao_total}pts
            </span>
            {userCanEdit && onEditTicket && (
              <button
                onClick={handleEditClick}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                title="Editar ticket"
              >
                Editar
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente da coluna do Kanban
function KanbanColumn({ title, status, tickets, color, onOpenDetail, onEditTicket, userCanEdit }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const getColumnIcon = (status: string) => {
    switch (status) {
      case 'aberto':
        return <Circle className="h-4 w-4 text-slate-500" />;
      case 'em_andamento':
        return <Activity className="h-4 w-4 text-yellow-600" />;
      case 'resolvido':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fechado':
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getColumnColor = (status: string) => {
    switch (status) {
      case 'aberto':
        return 'border-slate-300 bg-slate-50';
      case 'em_andamento':
        return 'border-yellow-300 bg-yellow-50';
      case 'resolvido':
        return 'border-green-300 bg-green-50';
      case 'fechado':
        return 'border-gray-300 bg-gray-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div ref={setNodeRef} className="flex-1 min-w-72 max-w-sm">
      <div className={cn(
        "rounded-lg border h-full transition-all duration-300 ease-in-out relative",
        getColumnColor(status),
        // Destaque suave quando hover durante drag
        isOver && userCanEdit && "border-blue-400 bg-blue-50 shadow-lg scale-[1.02] transform ring-2 ring-blue-200",
        // Animação de entrada
        "animate-fade-in"
      )}>
        {/* Header da coluna */}
        <div className="p-3 border-b border-current border-opacity-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getColumnIcon(status)}
              <h3 className="font-medium text-sm text-gray-700">{title}</h3>
            </div>
            <span className="text-xs bg-white bg-opacity-70 text-gray-600 px-2 py-1 rounded-full font-medium border">
              {tickets.length}
            </span>
          </div>
        </div>
        
        {/* Indicador visual de drop zone quando arrastrando */}
        {isOver && userCanEdit && (
          <div className="absolute inset-0 bg-blue-100 bg-opacity-50 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-medium shadow-lg">
              Solte aqui para mover
            </div>
          </div>
        )}
        
        {/* Conteúdo da coluna */}
        <div className={cn(
          "p-3 h-[calc(100vh-280px)] overflow-y-auto transition-all duration-300",
          isOver && userCanEdit && "transform scale-98 opacity-90"
        )}>
          <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <KanbanCard
                  key={ticket.id}
                  ticket={ticket}
                  onOpenDetail={onOpenDetail}
                  onEditTicket={onEditTicket}
                  userCanEdit={userCanEdit}
                />
              ))}
            </div>
          </SortableContext>
          {tickets.length === 0 && (
            <div className={cn(
              "text-center py-8 transition-all duration-300",
              isOver && userCanEdit ? "text-blue-500 scale-105" : "text-gray-400"
            )}>
              <div className="text-2xl mb-2">
                {isOver && userCanEdit ? "⬇️" : "📋"}
              </div>
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

// Componente principal do Kanban
export default function TicketKanban({ tickets, onOpenDetail, onEditTicket, onTicketUpdate, userRole }: TicketKanbanProps) {
  const [draggedTicket, setDraggedTicket] = useState<Ticket | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
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
      title: 'Aberto',
      status: 'aberto',
      tickets: ticketsByStatus.aberto,
      color: 'bg-slate-400',
      icon: Circle,
      description: 'Tickets recém-criados'
    },
    {
      title: 'Em Andamento',
      status: 'em_andamento',
      tickets: ticketsByStatus.em_andamento,
      color: 'bg-yellow-500',
      icon: Activity,
      description: 'Tickets sendo trabalhados'
    },
    {
      title: 'Resolvido',
      status: 'resolvido',
      tickets: ticketsByStatus.resolvido,
      color: 'bg-green-500',
      icon: CheckCircle,
      description: 'Tickets resolvidos'
    },
    {
      title: 'Fechado',
      status: 'fechado',
      tickets: ticketsByStatus.fechado,
      color: 'bg-gray-500',
      icon: X,
      description: 'Tickets finalizados'
    }
  ];

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const ticket = tickets.find(t => t.id === event.active.id);
    setDraggedTicket(ticket || null);
    
    // Log para debug
    console.log('🎯 Iniciando drag:', ticket?.titulo, 'Status atual:', ticket?.status);
  }, [tickets]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setActiveColumn(over?.id as string || null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTicket(null);
    setActiveColumn(null);

    if (!over || !userCanEdit) {
      console.log('🚫 Drag cancelado - sem destino ou sem permissão');
      return;
    }

    const ticketId = active.id as string;
    const newStatus = over.id as TicketStatusType;

    // Verificar se é uma mudança válida de status
    if (!['aberto', 'em_andamento', 'resolvido', 'fechado'].includes(newStatus)) {
      console.log('🚫 Status inválido:', newStatus);
      return;
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
      console.log('🚫 Ticket não encontrado');
      return;
    }

    // Validar mudança de status
    const validation = validateStatusChange(
      ticket.status as TicketStatusType, 
      newStatus, 
      userCanEdit ? 'super_admin' : 'viewer'
    );

    if (!validation.valid) {
      console.log('🚫 Mudança inválida:', validation.reason);
      return;
    }

    if (ticket.status === newStatus) {
      console.log('🚫 Status igual');
      return;
    }

    // Log para debug
    console.log('🎯 Movendo ticket:', ticket.titulo, 'de', ticket.status, 'para', newStatus);

    try {
      const { error } = await supabase
        .from('sla_demandas')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      const statusLabels = {
        'aberto': 'Aberto',
        'em_andamento': 'Em Andamento',
        'resolvido': 'Resolvido',
        'fechado': 'Fechado'
      };

      toast({
        title: "✅ Status atualizado com sucesso",
        description: `Ticket "${ticket.titulo}" movido para "${statusLabels[newStatus as keyof typeof statusLabels]}"`,
      });

      console.log('✅ Status atualizado com sucesso');
      onTicketUpdate();
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      toast({
        title: "❌ Erro ao atualizar",
        description: "Não foi possível atualizar o status do ticket. Tente novamente.",
        variant: "destructive"
      });
    }
  }, [tickets, userCanEdit, onTicketUpdate, toast]);

  return (
    <div className="space-y-4">
      {/* Cabeçalho informativo */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">Kanban Board</h2>
          <p className="text-sm text-gray-500">
            {userCanEdit 
              ? "Arraste os tickets entre as colunas para alterar o status" 
              : "Visualização somente leitura"}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {tickets.length} tickets total
        </Badge>
      </div>

      <DndContext
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.status}
              title={column.title}
              status={column.status}
              tickets={column.tickets}
              color={column.color}
              onOpenDetail={onOpenDetail}
              onEditTicket={onEditTicket}
              userCanEdit={userCanEdit}
            />
          ))}
        </div>

        <DragOverlay 
          dropAnimation={{
            duration: 500,
            easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          style={{ transformOrigin: '0 0' }}
        >
          {draggedTicket ? (
            <div className="rotate-3 scale-110 opacity-95 shadow-2xl ring-2 ring-blue-400">
              <KanbanCard
                ticket={draggedTicket}
                isDragging
                onOpenDetail={onOpenDetail}
                onEditTicket={onEditTicket}
                userCanEdit={userCanEdit}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}