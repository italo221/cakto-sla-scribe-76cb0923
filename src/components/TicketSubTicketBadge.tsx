import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TreePine } from 'lucide-react';

interface TicketSubTicketBadgeProps {
  isSubTicket: boolean;
  sequenceNumber?: number;
  parentTicketNumber?: string;
  className?: string;
}

export function TicketSubTicketBadge({ 
  isSubTicket, 
  sequenceNumber, 
  parentTicketNumber,
  className = "" 
}: TicketSubTicketBadgeProps) {
  if (!isSubTicket) return null;

  return (
    <Badge 
      variant="outline" 
      className={`text-xs bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 ${className}`}
    >
      <TreePine className="h-3 w-3 mr-1" />
      Sub-ticket
      {sequenceNumber && ` #${sequenceNumber.toString().padStart(2, '0')}`}
    </Badge>
  );
}