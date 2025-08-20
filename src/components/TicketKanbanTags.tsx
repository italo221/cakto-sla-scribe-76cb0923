import { useState, useEffect, useMemo, memo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

interface TicketKanbanTagsProps {
  tickets: Ticket[];
  onOpenDetail: (ticket: Ticket) => void;
  onEditTicket: (ticket: Ticket) => void;
  rankingMode: 'all' | 'top10' | 'top25';
  searchTag: string;
}

interface TagColumnProps {
  tag: string;
  tickets: Ticket[];
  onOpenDetail: (ticket: Ticket) => void;
  onEditTicket: (ticket: Ticket) => void;
}

interface TagCardProps {
  ticket: Ticket;
  onOpenDetail: (ticket: Ticket) => void;
  onEditTicket: (ticket: Ticket) => void;
}

const TagCard = memo(({ ticket, onOpenDetail, onEditTicket }: TagCardProps) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'em_andamento':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'resolvido':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'fechado':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aberto':
        return 'Aberto';
      case 'em_andamento':
        return 'Em Andamento';
      case 'resolvido':
        return 'Resolvido';
      case 'fechado':
        return 'Fechado';
      default:
        return status;
    }
  };

  return (
    <Card 
      className="group bg-card animate-fade-in cursor-pointer macos-card-kanban border border-border hover:shadow-md transition-all duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onOpenDetail(ticket);
      }}
    >
      <CardContent className="p-3 space-y-3 macos-card">
        {/* Header com número e prioridade P0 */}
        <div className="flex items-center justify-between">
          <Badge variant="default" className="text-xs font-mono bg-primary text-primary-foreground">
            {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
          </Badge>
          {ticket.nivel_criticidade === 'P0' && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-red-600 dark:text-red-400">P0</span>
            </div>
          )}
        </div>

        {/* Título */}
        <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
          {ticket.titulo}
        </h4>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn("text-xs", getStatusColor(ticket.status))}>
            {getStatusLabel(ticket.status)}
          </Badge>
        </div>

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
        </div>
      </CardContent>
    </Card>
  );
});

TagCard.displayName = 'TagCard';

const TagColumn = memo(({ tag, tickets, onOpenDetail, onEditTicket }: TagColumnProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 p-2 sm:p-3 bg-muted/50 rounded-lg">
        <h3 className="font-medium text-xs sm:text-sm text-foreground truncate">
          {tag === 'sem-tag' ? 'Sem Tag' : `#${tag}`}
        </h3>
        <Badge variant="default" className="text-xs bg-primary text-primary-foreground shrink-0">
          {tickets.length}
        </Badge>
      </div>
      
      <div className="flex-1 p-1 sm:p-2 rounded-lg border-2 border-dashed border-border bg-transparent h-[600px] max-h-[600px]">
        <div className="space-y-2 sm:space-y-3 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {tickets.map(ticket => (
            <TagCard 
              key={ticket.id} 
              ticket={ticket} 
              onOpenDetail={onOpenDetail} 
              onEditTicket={onEditTicket} 
            />
          ))}
          {tickets.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Nenhum ticket nesta tag
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

TagColumn.displayName = 'TagColumn';

const TicketKanbanTags = memo(({ 
  tickets, 
  onOpenDetail, 
  onEditTicket, 
  rankingMode, 
  searchTag 
}: TicketKanbanTagsProps) => {
  // Organizar tickets por tags
  const ticketsByTag = useMemo(() => {
    const tagMap = new Map<string, Ticket[]>();
    
    // Contar ocorrências de cada tag
    const tagCounts = new Map<string, number>();
    
    tickets.forEach(ticket => {
      const ticketTags = Array.isArray(ticket.tags) ? ticket.tags : [];
      
      if (ticketTags.length === 0) {
        // Tickets sem tag
        const noTagTickets = tagMap.get('sem-tag') || [];
        noTagTickets.push(ticket);
        tagMap.set('sem-tag', noTagTickets);
        tagCounts.set('sem-tag', (tagCounts.get('sem-tag') || 0) + 1);
      } else {
        // Usar primeira tag como principal
        const primaryTag = ticketTags[0].toLowerCase().trim();
        
        // Filtrar por busca de tag se especificada
        if (searchTag && !primaryTag.includes(searchTag.toLowerCase())) {
          return;
        }
        
        const tagTickets = tagMap.get(primaryTag) || [];
        tagTickets.push(ticket);
        tagMap.set(primaryTag, tagTickets);
        tagCounts.set(primaryTag, (tagCounts.get(primaryTag) || 0) + 1);
      }
    });

    // Ordenar tags por contagem (desc)
    const sortedTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);

    // Aplicar filtro de ranking
    let filteredTags = sortedTags;
    if (rankingMode === 'top10') {
      filteredTags = sortedTags.slice(0, 10);
    } else if (rankingMode === 'top25') {
      filteredTags = sortedTags.slice(0, 25);
    }

    // Construir resultado final
    const result = new Map<string, Ticket[]>();
    filteredTags.forEach(tag => {
      const tagTickets = tagMap.get(tag) || [];
      if (tagTickets.length > 0) {
        result.set(tag, tagTickets);
      }
    });

    return result;
  }, [tickets, rankingMode, searchTag]);

  const columns = Array.from(ticketsByTag.entries()).map(([tag, tickets]) => ({
    id: tag,
    tag,
    tickets
  }));

  return (
    <div className="p-6">
      {/* Mobile: Horizontal scroll */}
      <div className="block lg:hidden">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => (
            <div key={column.id} className="min-w-[280px] flex-shrink-0">
              <TagColumn 
                tag={column.tag}
                tickets={column.tickets} 
                onOpenDetail={onOpenDetail} 
                onEditTicket={onEditTicket} 
              />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Grid layout com scroll horizontal para muitas tags */}
      <div className="hidden lg:block">
        <div 
          className={cn(
            "flex gap-6 overflow-x-auto pb-4",
            columns.length > 4 && "grid-flow-col"
          )}
          style={{
            gridTemplateColumns: columns.length <= 4 
              ? `repeat(${columns.length}, 1fr)` 
              : 'repeat(auto-fit, 300px)'
          }}
        >
          {columns.map(column => (
            <div key={column.id} className="min-w-[300px] flex-shrink-0">
              <TagColumn 
                tag={column.tag}
                tickets={column.tickets} 
                onOpenDetail={onOpenDetail} 
                onEditTicket={onEditTicket} 
              />
            </div>
          ))}
        </div>
      </div>

      {columns.length === 0 && (
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">Nenhum ticket encontrado</p>
            <p className="text-sm">Tente ajustar os filtros ou criar novos tickets</p>
          </div>
        </div>
      )}
    </div>
  );
});

TicketKanbanTags.displayName = 'TicketKanbanTags';

export default TicketKanbanTags;