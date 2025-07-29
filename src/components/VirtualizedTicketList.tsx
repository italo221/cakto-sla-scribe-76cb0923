import { memo, useMemo } from 'react';
import { useVirtualization } from '@/hooks/useVirtualization';
import JiraTicketCard from '@/components/JiraTicketCard';
import { cn } from '@/lib/utils';

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
  responsavel_interno?: string;
  prazo_interno?: string;
  prioridade_operacional?: string;
  isExpired?: boolean;
}

interface VirtualizedTicketListProps {
  tickets: Ticket[];
  onOpenDetail: (ticket: Ticket) => void;
  onUpdateStatus?: (ticketId: string, newStatus: string) => void;
  onEditTicket?: (ticket: Ticket) => void;
  onDeleteTicket?: (ticket: Ticket) => void;
  userCanEdit: boolean;
  userCanDelete: boolean;
  className?: string;
  itemHeight?: number;
  containerHeight?: number;
}

// Componente memoizado para o item individual
const TicketListItem = memo(({ 
  ticket, 
  onOpenDetail, 
  onUpdateStatus, 
  onEditTicket, 
  onDeleteTicket, 
  userCanEdit, 
  userCanDelete 
}: {
  ticket: Ticket;
  onOpenDetail: (ticket: Ticket) => void;
  onUpdateStatus?: (ticketId: string, newStatus: string) => void;
  onEditTicket?: (ticket: Ticket) => void;
  onDeleteTicket?: (ticket: Ticket) => void;
  userCanEdit: boolean;
  userCanDelete: boolean;
}) => {
  return (
    <div className="mb-4">
      <JiraTicketCard
        ticket={ticket}
        onOpenDetail={onOpenDetail}
        onUpdateStatus={onUpdateStatus}
        onEditTicket={onEditTicket}
        onDeleteTicket={onDeleteTicket}
        userCanEdit={userCanEdit}
        userCanDelete={userCanDelete}
        isExpired={ticket.isExpired || false}
      />
    </div>
  );
});

TicketListItem.displayName = 'TicketListItem';

export const VirtualizedTicketList = memo(({
  tickets,
  onOpenDetail,
  onUpdateStatus,
  onEditTicket,
  onDeleteTicket,
  userCanEdit,
  userCanDelete,
  className,
  itemHeight = 280, // Altura estimada do card + margem
  containerHeight = 600
}: VirtualizedTicketListProps) => {
  // Usar virtualização apenas se há muitos tickets
  const shouldVirtualize = tickets.length > 20;

  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    scrollElementRef
  } = useVirtualization(tickets, {
    itemHeight,
    containerHeight,
    overscan: 3
  });

  // Se não precisar de virtualização, renderizar normalmente
  if (!shouldVirtualize) {
    return (
      <div className={cn("space-y-4", className)}>
        {tickets.map(ticket => (
          <TicketListItem
            key={ticket.id}
            ticket={ticket}
            onOpenDetail={onOpenDetail}
            onUpdateStatus={onUpdateStatus}
            onEditTicket={onEditTicket}
            onDeleteTicket={onDeleteTicket}
            userCanEdit={userCanEdit}
            userCanDelete={userCanDelete}
          />
        ))}
      </div>
    );
  }

  // Renderização virtualizada
  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item: ticket, index }) => (
            <TicketListItem
              key={ticket.id}
              ticket={ticket}
              onOpenDetail={onOpenDetail}
              onUpdateStatus={onUpdateStatus}
              onEditTicket={onEditTicket}
              onDeleteTicket={onDeleteTicket}
              userCanEdit={userCanEdit}
              userCanDelete={userCanDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

VirtualizedTicketList.displayName = 'VirtualizedTicketList';

export default VirtualizedTicketList;