import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, TreePine } from 'lucide-react';

interface SubTicketBadgeProps {
  parentTicketInfo: {
    id: string;
    ticket_number: string;
    titulo: string;
    sequence_number: number;
  };
  onParentTicketClick: (ticketId: string) => void;
}

export function SubTicketBadge({ parentTicketInfo, onParentTicketClick }: SubTicketBadgeProps) {
  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TreePine className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Sub-ticket #{parentTicketInfo.sequence_number.toString().padStart(2, '0')}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Este é um sub-ticket de{' '}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onParentTicketClick(parentTicketInfo.id);
                }}
              >
                {parentTicketInfo.ticket_number}
              </Button>
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
              {parentTicketInfo.titulo}
            </p>
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onParentTicketClick(parentTicketInfo.id);
            }}
            className="flex-shrink-0 text-blue-600 hover:text-blue-900 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900/50"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}