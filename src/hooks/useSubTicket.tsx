import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ParentTicketInfo {
  id: string;
  ticket_number: string;
  titulo: string;
  sequence_number: number;
}

// Cache global para evitar múltiplas requisições
const subTicketCache = new Map<string, {
  data: ParentTicketInfo | null;
  timestamp: number;
  isSubTicket: boolean;
}>();

const CACHE_DURATION = 30000; // 30 segundos

export function useSubTicket(ticketId: string | null) {
  const [parentTicketInfo, setParentTicketInfo] = useState<ParentTicketInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubTicket, setIsSubTicket] = useState(false);

  // Memoizar o ticketId para evitar re-execuções desnecessárias
  const memoizedTicketId = useMemo(() => ticketId, [ticketId]);

  useEffect(() => {
    if (!memoizedTicketId) {
      setParentTicketInfo(null);
      setIsSubTicket(false);
      return;
    }

    // Verificar cache primeiro
    const cached = subTicketCache.get(memoizedTicketId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setParentTicketInfo(cached.data);
      setIsSubTicket(cached.isSubTicket);
      return;
    }

    const loadParentTicketInfo = async () => {
      setIsLoading(true);
      try {
        // Primeiro verificar se é um subticket
        const { data: subTicketData, error: subTicketError } = await supabase
          .from('subtickets')
          .select('parent_ticket_id, sequence_number')
          .eq('child_ticket_id', memoizedTicketId)
          .maybeSingle(); // Usar maybeSingle para evitar erro quando não existe

        if (subTicketError) throw subTicketError;

        if (!subTicketData) {
          // Não é um subticket
          const cacheData = {
            data: null,
            timestamp: Date.now(),
            isSubTicket: false
          };
          subTicketCache.set(memoizedTicketId, cacheData);
          setParentTicketInfo(null);
          setIsSubTicket(false);
          return;
        }

        // É um subticket, buscar dados do pai
        const { data: parentData, error: parentError } = await supabase
          .from('sla_demandas')
          .select('id, ticket_number, titulo')
          .eq('id', subTicketData.parent_ticket_id)
          .single();

        if (parentError) throw parentError;

        const parentInfo = {
          id: parentData.id,
          ticket_number: parentData.ticket_number,
          titulo: parentData.titulo,
          sequence_number: subTicketData.sequence_number
        };

        // Atualizar cache
        const cacheData = {
          data: parentInfo,
          timestamp: Date.now(),
          isSubTicket: true
        };
        subTicketCache.set(memoizedTicketId, cacheData);

        setParentTicketInfo(parentInfo);
        setIsSubTicket(true);
      } catch (error) {
        console.error('Erro ao verificar se é subticket:', error);
        // Em caso de erro, cachear como não sendo subticket
        const cacheData = {
          data: null,
          timestamp: Date.now(),
          isSubTicket: false
        };
        subTicketCache.set(memoizedTicketId, cacheData);
        setParentTicketInfo(null);
        setIsSubTicket(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadParentTicketInfo();
  }, [memoizedTicketId]);

  return {
    parentTicketInfo,
    isSubTicket,
    isLoading
  };
}