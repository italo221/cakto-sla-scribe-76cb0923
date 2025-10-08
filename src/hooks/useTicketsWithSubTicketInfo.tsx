import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubTicketInfo {
  [ticketId: string]: {
    isSubTicket: boolean;
    sequenceNumber?: number;
    parentTicketNumber?: string;
  };
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
        // Query 1: Buscar informações de quais tickets SÃO subtickets
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

        if (error) {
          console.error('Erro ao buscar subtickets (child):', error);
          throw error;
        }

        console.log('🔍 Subtickets encontrados (filhos):', data?.length || 0);

        const info: SubTicketInfo = {};
        
        // Inicializar todos os tickets como não sendo subtickets
        ticketIds.forEach(id => {
          info[id] = { isSubTicket: false };
        });

        // Marcar os que são subtickets
        data?.forEach((item: any) => {
          info[item.child_ticket_id] = {
            isSubTicket: true,
            sequenceNumber: item.sequence_number,
            parentTicketNumber: item.sla_demandas?.ticket_number
          };
          console.log(`✅ Marcado como subticket: ${item.child_ticket_id}, pai: ${item.parent_ticket_id}`);
        });

        setSubTicketInfo(info);

        // Query 2: Buscar contagem de subtickets para cada ticket PAI
        const { data: countsData, error: countsError } = await supabase
          .from('subtickets')
          .select('parent_ticket_id')
          .in('parent_ticket_id', ticketIds);

        if (countsError) {
          console.error('Erro ao buscar contagem de subtickets:', countsError);
        } else {
          console.log('🔍 Registros de contagem encontrados:', countsData?.length || 0);
          
          const counts = new Map<string, number>();
          countsData?.forEach((item: any) => {
            const parentId = item.parent_ticket_id;
            counts.set(parentId, (counts.get(parentId) || 0) + 1);
          });
          
          console.log('📊 Contagens finais:', Array.from(counts.entries()));
          setSubTicketCounts(counts);
        }
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
    isLoading
  };
}