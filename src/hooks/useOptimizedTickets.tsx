import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";

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
  updated_at?: string;
  isExpired?: boolean;
}

interface UseOptimizedTicketsOptions {
  enableRealtime?: boolean;
  batchSize?: number;
  sortFunction?: (a: Ticket, b: Ticket) => number;
}

interface TicketFilters {
  dateField?: 'data_criacao' | 'updated_at' | 'prazo_interno';
  from?: string;
  to?: string;
}

// Cache para evitar refetching desnecessário
const ticketCache = new Map<string, { data: Ticket[]; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 segundos

// Função de ordenação otimizada com memoização
const createOptimizedSort = () => {
  const statusPriority = { 'aberto': 3, 'em_andamento': 2, 'resolvido': 1, 'fechado': 0 };
  const criticalityPriority = { 'P0': 4, 'P1': 3, 'P2': 2, 'P3': 1 };
  
  return (a: Ticket, b: Ticket) => {
    // 1. Status
    const statusDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
    if (statusDiff !== 0) return statusDiff;

    // 2. Criticidade
    const criticalityDiff = (criticalityPriority[b.nivel_criticidade] || 0) - (criticalityPriority[a.nivel_criticidade] || 0);
    if (criticalityDiff !== 0) return criticalityDiff;

    // 3. Pontuação
    const scoreDiff = (b.pontuacao_total || 0) - (a.pontuacao_total || 0);
    if (scoreDiff !== 0) return scoreDiff;

    // 4. Data
    if ((statusPriority[a.status] || 0) >= 2 && (statusPriority[b.status] || 0) >= 2) {
      return new Date(a.data_criacao).getTime() - new Date(b.data_criacao).getTime();
    }

    return new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime();
  };
};

export const useOptimizedTickets = (options: UseOptimizedTicketsOptions = {}, filters?: TicketFilters) => {
  const {
    enableRealtime = true,
    batchSize = 50,
    sortFunction = createOptimizedSort()
  } = options;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  const realtimeChannelRef = useRef<any>(null);
  const sortedTicketsRef = useRef<Ticket[]>([]);

  // Função de fetch otimizada com cache
  const fetchTickets = useCallback(async (forceRefresh = false) => {
    const cacheKey = filters ? `tickets_${JSON.stringify(filters)}` : 'all_tickets';
    const now = Date.now();
    
    // Verificar cache se não for refresh forçado
    if (!forceRefresh && ticketCache.has(cacheKey)) {
      const cached = ticketCache.get(cacheKey)!;
      if (now - cached.timestamp < CACHE_DURATION) {
        setTickets(cached.data);
        setLoading(false);
        return cached.data;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Query otimizada - buscar apenas campos necessários
      let query = supabase
        .from('sla_demandas')
        .select(`
          id, ticket_number, titulo, time_responsavel, solicitante, 
          descricao, tipo_ticket, status, nivel_criticidade,
          pontuacao_total, pontuacao_financeiro, pontuacao_cliente,
          pontuacao_reputacao, pontuacao_urgencia, pontuacao_operacional,
          data_criacao, observacoes, tags, setor_id, responsavel_interno,
          prazo_interno, prioridade_operacional, updated_at
        `)
        .order('data_criacao', { ascending: false });

      // Aplicar filtros de data se fornecidos
      if (filters?.dateField && (filters.from || filters.to)) {
        if (filters.from) {
          query = query.gte(filters.dateField, filters.from);
        }
        if (filters.to) {
          query = query.lte(filters.dateField, filters.to);
        }
      }

      const { data, error: fetchError } = await query.limit(500);

      if (fetchError) throw fetchError;

      const ticketsData = data || [];

      // Aplicar ordenação customizada
      const sortedTickets = [...ticketsData].sort(sortFunction);
      sortedTicketsRef.current = sortedTickets;

      // Salvar no cache
      ticketCache.set(cacheKey, { data: sortedTickets, timestamp: now });
      setTickets(sortedTickets);
      setLastFetch(now);
      
      return sortedTickets;
    } catch (err) {
      console.error('Erro ao buscar tickets:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return [];
    } finally {
      setLoading(false);
    }
  }, [sortFunction, filters]);

  // Debounce para updates em tempo real
  let updateTimeout: NodeJS.Timeout;
  
  // Realtime subscription
  useEffect(() => {
    if (enableRealtime) {
      realtimeChannelRef.current = supabase
        .channel('tickets_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sla_demandas'
          },
          (payload) => {
            // Para transferências de setor (mudança de setor_id), atualizar imediatamente
            const isTransfer = payload.eventType === 'UPDATE' && 
              payload.old?.setor_id !== payload.new?.setor_id;
            
            if (updateTimeout) clearTimeout(updateTimeout);
            
            // Reduzir debounce para transferências para atualização mais rápida
            const debounceTime = isTransfer ? 200 : 1000;
            
            updateTimeout = setTimeout(() => {
              fetchTickets(true);
            }, debounceTime);
          }
        )
        .subscribe();

      return () => {
        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
        }
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
      };
    }
  }, [enableRealtime, fetchTickets]);

  // Fetch inicial
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Função de reload
  const reloadTickets = useCallback(() => {
    return fetchTickets(true);
  }, [fetchTickets]);

  // Adição de informações de status para os tickets
  const ticketsWithStatus = useMemo(() => {
    return tickets.map(ticket => {
      const isExpired = (() => {
        const now = new Date();
        const createdAt = new Date(ticket.data_criacao);
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
        const limits = {
          'P0': 4,   // 4 horas
          'P1': 24,  // 24 horas
          'P2': 72,  // 3 dias
          'P3': 168  // 7 dias
        };
        
        const limit = limits[ticket.nivel_criticidade as keyof typeof limits] || 168;
        const isActiveTicket = ['aberto', 'em_andamento'].includes(ticket.status?.toLowerCase());
        
        return isActiveTicket && hoursSinceCreation > limit;
      })();

      const statusInfo = (() => {
        const status = ticket.status?.toString()?.trim()?.toLowerCase();
        
        if (isExpired) {
          return {
            icon: require('lucide-react').AlertTriangle,
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            textColor: 'text-red-800 dark:text-red-200',
            borderColor: 'border-red-200 dark:border-red-800',
            displayStatus: 'Atrasado',
            isExpired: true
          };
        }

        switch (status) {
          case 'aberto':
            return {
              icon: require('lucide-react').Circle,
              bgColor: 'bg-slate-50 dark:bg-slate-900/20',
              textColor: 'text-slate-800 dark:text-slate-200',
              borderColor: 'border-slate-200 dark:border-slate-800',
              displayStatus: 'Aberto',
              isExpired: false
            };
          case 'em_andamento':
            return {
              icon: require('lucide-react').Play,
              bgColor: 'bg-blue-50 dark:bg-blue-900/20',
              textColor: 'text-blue-800 dark:text-blue-200',
              borderColor: 'border-blue-200 dark:border-blue-800',
              displayStatus: 'Em Andamento',
              isExpired: false
            };
          case 'resolvido':
            return {
              icon: require('lucide-react').CheckCircle,
              bgColor: 'bg-green-50 dark:bg-green-900/20',
              textColor: 'text-green-800 dark:text-green-200',
              borderColor: 'border-green-200 dark:border-green-800',
              displayStatus: 'Resolvido',
              isExpired: false
            };
          case 'fechado':
            return {
              icon: require('lucide-react').XCircle,
              bgColor: 'bg-gray-50 dark:bg-gray-900/20',
              textColor: 'text-gray-800 dark:text-gray-200',
              borderColor: 'border-gray-200 dark:border-gray-800',
              displayStatus: 'Fechado',
              isExpired: false
            };
          default:
            return {
              icon: require('lucide-react').Circle,
              bgColor: 'bg-gray-50 dark:bg-gray-900/20',
              textColor: 'text-gray-800 dark:text-gray-200',
              borderColor: 'border-gray-200 dark:border-gray-800',
              displayStatus: status || 'Desconhecido',
              isExpired: false
            };
        }
      })();

      return {
        ...ticket,
        isExpired,
        statusInfo
      };
    });
  }, [tickets]);

  // Função de busca otimizada
  const searchTickets = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return ticketsWithStatus;
    
    const normalizedTerm = searchTerm.toLowerCase().trim();
    return ticketsWithStatus.filter(ticket => {
      const searchableFields = [
        ticket.titulo,
        ticket.descricao,
        ticket.solicitante,
        ticket.time_responsavel,
        ticket.ticket_number,
        ...(ticket.tags || [])
      ].filter(Boolean);
      
      return searchableFields.some(field =>
        field.toString().toLowerCase().includes(normalizedTerm)
      );
    });
  }, [ticketsWithStatus]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const counts = {
      total: ticketsWithStatus.length,
      abertos: 0,
      em_andamento: 0,
      resolvidos: 0,
      fechados: 0,
      atrasados: 0,
      criticos: 0
    };

    // Um loop único para calcular todas as estatísticas
    ticketsWithStatus.forEach(ticket => {
      // Contagem de atrasados (primeira prioridade)
      if (ticket.isExpired) {
        counts.atrasados++;
      }
      
      // Contagem de críticos (apenas abertos ou em andamento)
      if (ticket.nivel_criticidade === 'P0') {
        const status = ticket.status?.toString()?.trim()?.toLowerCase();
        if (['aberto', 'em_andamento'].includes(status)) {
          counts.criticos++;
        }
      }
      
      // Contagem por status - INCLUIR todos os tickets (mesmo atrasados)
      const status = ticket.status?.toString()?.trim()?.toLowerCase();
      switch (status) {
        case 'aberto':
          counts.abertos++;
          break;
        case 'em_andamento':
          counts.em_andamento++;
          break;
        case 'resolvido':
          counts.resolvidos++;
          break;
        case 'fechado':
          counts.fechados++;
          break;
      }
    });

    return counts;
  }, [ticketsWithStatus]);

  return {
    tickets,
    ticketsWithStatus,
    loading,
    error,
    lastFetch,
    fetchTickets,
    reloadTickets,
    searchTickets,
    stats
  };
};