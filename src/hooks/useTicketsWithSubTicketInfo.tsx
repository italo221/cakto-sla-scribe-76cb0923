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
    console.log('🚀 useTicketsWithSubTicketInfo - useEffect disparado! IDs recebidos:', ticketIds.length);
    
    if (ticketIds.length === 0) {
      console.log('⚠️ useTicketsWithSubTicketInfo - Nenhum ticket ID, pulando...');
      setSubTicketInfo({});
      return;
    }

    const loadSubTicketInfo = async () => {
      setIsLoading(true);
      try {
        console.log('🔍 useTicketsWithSubTicketInfo - Buscando info para', ticketIds.length, 'tickets');
        
        // Dividir em lotes de 50 para evitar URL muito longa (UUIDs são grandes!)
        const BATCH_SIZE = 50;
        const batches: string[][] = [];
        
        for (let i = 0; i < ticketIds.length; i += BATCH_SIZE) {
          batches.push(ticketIds.slice(i, i + BATCH_SIZE));
        }
        
        console.log(`📦 Dividido em ${batches.length} lotes de até ${BATCH_SIZE} tickets`);
        
        // Buscar dados de todos os lotes
        const allData: any[] = [];
        
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          console.log(`🔄 Processando lote ${i + 1}/${batches.length} com ${batch.length} tickets`);
          
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
            .in('child_ticket_id', batch);

          if (error) {
            console.error(`❌ Erro no lote ${i + 1}:`, error);
            // Continuar processando os próximos lotes mesmo se um falhar
            continue;
          }
          
          if (data && data.length > 0) {
            allData.push(...data);
          }
        }

        console.log('✅ useTicketsWithSubTicketInfo - Total de sub-tickets encontrados:', allData.length);

        const info: SubTicketInfo = {};
        
        // Inicializar todos os tickets como não sendo subtickets
        ticketIds.forEach(id => {
          info[id] = { isSubTicket: false };
        });

        // Marcar os que são subtickets
        allData.forEach((item: any) => {
          console.log('🎯 Sub-ticket detectado:', item.child_ticket_id, '| Seq:', item.sequence_number, '| Parent:', item.sla_demandas?.ticket_number);
          info[item.child_ticket_id] = {
            isSubTicket: true,
            sequenceNumber: item.sequence_number,
            parentTicketNumber: item.sla_demandas?.ticket_number
          };
        });

        console.log('📋 useTicketsWithSubTicketInfo - Total identificado:', Object.keys(info).filter(k => info[k].isSubTicket).length, 'sub-tickets');
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