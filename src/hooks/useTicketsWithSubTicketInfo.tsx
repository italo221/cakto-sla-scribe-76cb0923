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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (ticketIds.length === 0) {
      setSubTicketInfo({});
      return;
    }

    const loadSubTicketInfo = async () => {
      setIsLoading(true);
      try {
        console.log('🔍 useTicketsWithSubTicketInfo - Buscando info para', ticketIds.length, 'tickets');
        
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

        console.log('✅ useTicketsWithSubTicketInfo - Dados retornados:', data?.length || 0, 'sub-tickets');
        console.log('📊 useTicketsWithSubTicketInfo - Dados completos:', data);

        const info: SubTicketInfo = {};
        
        // Inicializar todos os tickets como não sendo subtickets
        ticketIds.forEach(id => {
          info[id] = { isSubTicket: false };
        });

        // Marcar os que são subtickets
        data?.forEach((item: any) => {
          console.log('🎯 Sub-ticket detectado:', item.child_ticket_id, '| Parent:', item.sla_demandas?.ticket_number);
          info[item.child_ticket_id] = {
            isSubTicket: true,
            sequenceNumber: item.sequence_number,
            parentTicketNumber: item.sla_demandas?.ticket_number
          };
        });

        console.log('📋 useTicketsWithSubTicketInfo - Info final:', Object.keys(info).filter(k => info[k].isSubTicket).length, 'sub-tickets identificados');
        setSubTicketInfo(info);
      } catch (error) {
        console.error('❌ Erro ao carregar informações de subtickets:', error);
        // Em caso de erro, marcar todos como não sendo subtickets
        const info: SubTicketInfo = {};
        ticketIds.forEach(id => {
          info[id] = { isSubTicket: false };
        });
        setSubTicketInfo(info);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubTicketInfo();
  }, [ticketIds.join(',')]);

  const getSubTicketInfo = (ticketId: string) => {
    return subTicketInfo[ticketId] || { isSubTicket: false };
  };

  return {
    getSubTicketInfo,
    isLoading
  };
}