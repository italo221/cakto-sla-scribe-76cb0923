import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ParentTicketInfo {
  id: string;
  ticket_number: string;
  titulo: string;
  sequence_number: number;
}

export function useSubTicket(ticketId: string | null) {
  const [parentTicketInfo, setParentTicketInfo] = useState<ParentTicketInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubTicket, setIsSubTicket] = useState(false);

  useEffect(() => {
    if (!ticketId) {
      setParentTicketInfo(null);
      setIsSubTicket(false);
      return;
    }

    const loadParentTicketInfo = async () => {
      setIsLoading(true);
      try {
        // Primeiro verificar se é um subticket
        const { data: subTicketData, error: subTicketError } = await supabase
          .from('subtickets')
          .select('parent_ticket_id, sequence_number')
          .eq('child_ticket_id', ticketId)
          .single();

        if (subTicketError) {
          // Se não encontrou, não é um subticket
          if (subTicketError.code === 'PGRST116') {
            setParentTicketInfo(null);
            setIsSubTicket(false);
          } else {
            throw subTicketError;
          }
        } else {
          // É um subticket, buscar dados do pai
          const { data: parentData, error: parentError } = await supabase
            .from('sla_demandas')
            .select('id, ticket_number, titulo')
            .eq('id', subTicketData.parent_ticket_id)
            .single();

          if (parentError) {
            throw parentError;
          }

          setParentTicketInfo({
            id: parentData.id,
            ticket_number: parentData.ticket_number,
            titulo: parentData.titulo,
            sequence_number: subTicketData.sequence_number
          });
          setIsSubTicket(true);
        }
      } catch (error) {
        console.error('Erro ao verificar se é subticket:', error);
        setParentTicketInfo(null);
        setIsSubTicket(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadParentTicketInfo();
  }, [ticketId]);

  return {
    parentTicketInfo,
    isSubTicket,
    isLoading
  };
}