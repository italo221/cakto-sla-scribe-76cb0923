import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubTicketInfo {
  [ticketId: string]: {
    isSubTicket: boolean;
    sequenceNumber?: number;
    parentTicketNumber?: string;
    parentTicketId?: string;
  };
}

interface SubTicketCount {
  parentId: string;
  count: number;
}

export function useTicketsWithSubTicketInfo(ticketIds: string[]) {
  const [subTicketInfo, setSubTicketInfo] = useState<SubTicketInfo>({});
  const [subTicketCounts, setSubTicketCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (ticketIds.length === 0) {
      setSubTicketInfo({});
      setSubTicketCounts(new Map());
      return;
    }

    const loadSubTicketInfo = async () => {
      setIsLoading(true);
      try {
        // Buscar informações de subtickets
        const { data, error } = await supabase
          .from('subtickets')
          .select(`
            child_ticket_id,
            sequence_number,
            parent_ticket_id,
            sla_demandas!subtickets_parent_ticket_id_fkey (
              ticket_number
            )
          `)
          .in('child_ticket_id', ticketIds);

        if (error) throw error;

        const info: SubTicketInfo = {};
        
        // Inicializar todos os tickets como não sendo subtickets
        ticketIds.forEach(id => {
          info[id] = { isSubTicket: false };
        });

        // Marcar os que são subtickets (child_ticket_id na tabela)
        data?.forEach((item: any) => {
          info[item.child_ticket_id] = {
            isSubTicket: true,
            sequenceNumber: item.sequence_number,
            parentTicketNumber: item.sla_demandas?.ticket_number,
            parentTicketId: item.parent_ticket_id
          };
        });

        setSubTicketInfo(info);

        // Agora buscar contagem de subtickets para cada ticket PAI
        const { data: countsData, error: countsError } = await supabase
          .from('subtickets')
          .select('parent_ticket_id')
          .in('parent_ticket_id', ticketIds);

        if (countsError) throw countsError;

        // Contar subtickets por ticket pai
        const counts = new Map<string, number>();
        countsData?.forEach(item => {
          const currentCount = counts.get(item.parent_ticket_id) || 0;
          counts.set(item.parent_ticket_id, currentCount + 1);
        });

        setSubTicketCounts(counts);
      } catch (error) {
        console.error('Erro ao carregar informações de subtickets:', error);
        // Em caso de erro, marcar todos como não sendo subtickets
        const info: SubTicketInfo = {};
        ticketIds.forEach(id => {
          info[id] = { isSubTicket: false };
        });
        setSubTicketInfo(info);
        setSubTicketCounts(new Map());
      } finally {
        setIsLoading(false);
      }
    };

    loadSubTicketInfo();
  }, [ticketIds.join(',')]);

  const getSubTicketInfo = (ticketId: string) => {
    return subTicketInfo[ticketId] || { isSubTicket: false };
  };

  const getSubTicketCount = (ticketId: string) => {
    return subTicketCounts.get(ticketId) || 0;
  };

  return {
    getSubTicketInfo,
    getSubTicketCount,
    subTicketCounts,
    isLoading
  };
}