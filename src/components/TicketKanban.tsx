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

// ... todas as interfaces permanecem iguais

function KanbanCard({ ticket, isDragging, onOpenDetail, onEditTicket, userCanEdit }) {
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

  const handleMouseDown = (e) => {
    if (!userCanEdit) return;
    startPosition.current = { x: e.clientX, y: e.clientY };
    pointerEventRef.current = e;
    dragTimeout.current = setTimeout(() => {
      setIsDragActive(true);
      listeners.onPointerDown?.(pointerEventRef.current);
    }, 200);
  };

  const handleMouseMove = (e) => {
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

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isDragActive && !isSortableDragging) {
      onOpenDetail(ticket);
    }
  };

  const handleEditClick = (e) => {
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
        "transition-all duration-300 group bg-white animate-fade-in relative cursor-pointer",
        "border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md",
        isDragging && "opacity-90 rotate-2 scale-105 shadow-2xl z-50 ring-2 ring-blue-300",
        isSortableDragging && "shadow-xl scale-105 rotate-2 border-blue-400",
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
          <Badge variant="secondary" className="text-xs font-mono bg-gray-100 text-gray-600 border-0">
            {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
          </Badge>
        </div>
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
          {ticket.titulo}
        </h4>
      </CardContent>
    </Card>
  );
}

// ... restante do código permanece igual
