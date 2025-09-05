import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { subscribeToChannel } from '@/lib/realtimeManager';

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
  updated_at?: string;
  resolved_at?: string | null;
  observacoes?: string;
  tags?: string[];
  setor_id?: string;
  responsavel_interno?: string;
  prazo_interno?: string;
  prioridade_operacional?: string;
  assignee_user_id?: string | null;
  assignee?: {
    user_id: string;
    nome_completo: string;
    email: string;
    avatar_url?: string;
  } | null;
  sla_comentarios_internos?: Array<{ comentario: string }>;
}

interface UseOptimizedTicketsOptions {
  enableRealtime?: boolean;
  batchSize?: number;
  sortFunction?: (a: Ticket, b: Ticket) => number;
}

// Cache mais agressivo para reduzir egress
const ticketCache = new Map<string, { data: Ticket[]; timestamp: number }>();
const CACHE_DURATION = 120000; // 2 minutos

// Função para limpar cache completamente
const clearAllCache = () => {
  console.log('🧹 Limpando todo o cache de tickets');
  ticketCache.clear();
};

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

export const useOptimizedTickets = (options: UseOptimizedTicketsOptions = {}) => {
  const {
    enableRealtime = false, // Desabilitar por padrão para reduzir egress
    batchSize = 25, // Reduzir tamanho do batch
    sortFunction = createOptimizedSort()
  } = options;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const sortedTicketsRef = useRef<Ticket[]>([]);

  const hasMore = useMemo(() => tickets.length < totalCount, [tickets, totalCount]);

  // Função de fetch com timeout agressivo e fallbacks
  const fetchTickets = useCallback(async (page = 1, forceRefresh = false) => {
    const cacheKey = `tickets_page_${page}`;
    const now = Date.now();

    console.log('🔄 Iniciando fetch de tickets...', { forceRefresh, cacheSize: ticketCache.size, page });

    const handleRateLimitError = (status: number, err: unknown) => {
      if (status === 429) {
        console.error('❌ Supabase rate limit exceeded:', err);
        setError('Limite de recursos do Supabase excedido, tente novamente mais tarde ou contate o administrador');
        return true;
      }
      return false;
    };
    
    // Verificar cache se não for refresh forçado
    if (!forceRefresh && ticketCache.has(cacheKey)) {
      const cached = ticketCache.get(cacheKey)!;
      if (now - cached.timestamp < CACHE_DURATION) {
        console.log('✅ Usando cache de tickets:', cached.data.length, 'tickets');
        if (page === 1) {
          setTickets(cached.data);
        } else {
          setTickets(prev => [...prev, ...cached.data]);
        }
        setLoading(false);
        return cached.data;
      }
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🌐 Fazendo request para Supabase com timeout...');

      const from = (page - 1) * batchSize;
      const to = from + batchSize - 1;

      // Query com timeout agressivo
      const queryPromise = supabase
        .from('sla_demandas')
        .select(`
          id,
          ticket_number,
          titulo,
          solicitante,
          status,
          nivel_criticidade,
          data_criacao
        `, { count: 'exact' })
        .order('data_criacao', { ascending: false })
        .range(from, to);

      // Timeout de 5 segundos
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na consulta de tickets')), 5000);
      });

      const { data, error, status, count } = await Promise.race([queryPromise, timeoutPromise]) as any;
      if (error) {
        if (handleRateLimitError(status, error)) return [];
        throw error;
      }
      console.log('✅ Dados recebidos do Supabase:', data?.length || 0, 'tickets');
      if (typeof count === 'number') setTotalCount(count);

      // Transformar dados simplificados
      const ticketsData: Ticket[] = [];
      
      if (data && data.length > 0) {
        // Mapear dados básicos sem queries adicionais para evitar sobrecarga
        data.forEach((ticket: any) => {
          ticketsData.push({
            id: ticket.id,
            ticket_number: ticket.ticket_number,
            titulo: ticket.titulo,
            time_responsavel: ticket.solicitante || 'N/A',
            solicitante: ticket.solicitante,
            descricao: '',
            tipo_ticket: 'Padrão',
            status: ticket.status,
            nivel_criticidade: ticket.nivel_criticidade,
            pontuacao_total: 0,
            pontuacao_financeiro: 0,
            pontuacao_cliente: 0,
            pontuacao_reputacao: 0,
            pontuacao_urgencia: 0,
            pontuacao_operacional: 0,
            data_criacao: ticket.data_criacao,
            updated_at: undefined,
            resolved_at: null,
            observacoes: undefined,
            tags: [],
            setor_id: undefined,
            responsavel_interno: undefined,
            prazo_interno: undefined,
            prioridade_operacional: undefined,
            assignee_user_id: null,
            assignee: null,
            sla_comentarios_internos: []
          });
        });
      }
      
      // Ordenar de forma otimizada
      const sortedData = [...ticketsData].sort(sortFunction);
      
      // Atualizar cache
      ticketCache.set(cacheKey, { data: sortedData, timestamp: now });

      if (page === 1 || forceRefresh) {
        setTickets(sortedData);
        sortedTicketsRef.current = sortedData;
      } else {
        setTickets(prev => {
          const existing = new Set(prev.map(t => t.id));
          const merged = [...prev, ...sortedData.filter(t => !existing.has(t.id))];
          sortedTicketsRef.current = merged;
          return merged;
        });
      }
      setCurrentPage(page);
      setLastFetch(now);

      console.log('✅ Tickets processados e salvos:', sortedTicketsRef.current.length);

      return sortedTicketsRef.current;
    } catch (err: unknown) {
      console.error('❌ Erro ao carregar tickets:', err);
      
      let errorMessage = 'Erro desconhecido';
      if (err instanceof Error) {
        if (err.message === 'Timeout na consulta de tickets') {
          errorMessage = 'Supabase está sobrecarregado. Tentando carregar dados básicos...';
        } else if (err.message.includes('upstream')) {
          errorMessage = 'Servidor sobrecarregado. Verifique novamente em alguns minutos.';
        } else {
          errorMessage = err.message;
        }
      }
      
      const status = (err as { status?: number }).status;
      if (status === 429) {
        errorMessage = 'Limite de recursos do Supabase excedido, tente novamente mais tarde ou contate o administrador';
      }
      
      setError(errorMessage);
      
      // Se houver dados em cache, usar como fallback
      if (ticketCache.has(cacheKey)) {
        const cached = ticketCache.get(cacheKey)!;
        console.log('🔄 Usando dados de cache como fallback:', cached.data.length, 'tickets');
        if (page === 1) {
          setTickets(cached.data);
        } else {
          setTickets(prev => [...prev, ...cached.data]);
        }
        return cached.data;
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [sortFunction, batchSize]);

  // Função de reload otimizada
  const reloadTickets = useCallback(() => {
    setCurrentPage(1);
    ticketCache.clear();
    return fetchTickets(1, true);
  }, [fetchTickets]);

  const loadMoreTickets = useCallback(() => {
    if (!hasMore) return Promise.resolve([]);
    const nextPage = currentPage + 1;
    return fetchTickets(nextPage);
  }, [fetchTickets, currentPage, hasMore]);

  // Realtime temporariamente desabilitado para reduzir carga no Supabase
  useEffect(() => {
    // Desabilitado temporariamente devido à sobrecarga do Supabase
    if (!enableRealtime || true) return; // Força desabilitar

    console.log('🔗 Configurando canal realtime...');

    // Configurar novo canal com throttling reduzido para transferências
    let updateTimeout: NodeJS.Timeout | null = null;

    const unsubscribe = subscribeToChannel('tickets-optimized', (channel) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sla_demandas'
        },
        (payload) => {
          console.log('📡 Realtime update recebido:', payload.eventType, (payload.new as any)?.id);

          // Para transferências de setor (mudança de setor_id), atualizar imediatamente
          const isTransfer = payload.eventType === 'UPDATE' &&
            payload.old?.setor_id !== payload.new?.setor_id;

          if (updateTimeout) clearTimeout(updateTimeout);

          // Reduzir debounce para transferências para atualização mais rápida
          const debounceTime = isTransfer ? 200 : 1000;

          updateTimeout = setTimeout(() => {
            console.log('🔄 Atualizando tickets por realtime...');
            // Invalidar cache e recarregar
            ticketCache.clear();
            setCurrentPage(1);
            fetchTickets(1, true);
          }, debounceTime);
        }
      );
    });

    console.log('✅ Canal realtime configurado');

    return () => {
      if (updateTimeout) clearTimeout(updateTimeout);
      unsubscribe();
    };
  }, [enableRealtime, fetchTickets]);

  // Listener para evento de atualização de prazo
  useEffect(() => {
    const handleDeadlineUpdate = (event: CustomEvent) => {
      const { ticketId } = event.detail;
      console.log('🔄 Recalculando status após atualização de prazo:', ticketId);
      
      // Invalidar cache e recarregar tickets
      ticketCache.clear();
      fetchTickets(1, true);
    };

    window.addEventListener('ticketDeadlineUpdated', handleDeadlineUpdate as EventListener);
    
    return () => {
      window.removeEventListener('ticketDeadlineUpdated', handleDeadlineUpdate as EventListener);
    };
  }, [fetchTickets]);

  // Carregar tickets na inicialização
  useEffect(() => {
    // Limpar cache ao inicializar para garantir dados frescos
    clearAllCache();
    fetchTickets(1, true);
  }, []); // Remove fetchTickets dependency to prevent infinite loop

  // Memoizar tickets com status para evitar recálculos
  const ticketsWithStatus = useMemo(() => {
    return tickets.map(ticket => {
      // Calcular se está atrasado de forma otimizada
      const timeConfig = {
        'P0': 4 * 60 * 60 * 1000,   // 4 horas
        'P1': 24 * 60 * 60 * 1000,  // 24 horas
        'P2': 3 * 24 * 60 * 60 * 1000,  // 3 dias
        'P3': 7 * 24 * 60 * 60 * 1000   // 7 dias
      };

      const isExpired = (() => {
        if (ticket.status === 'resolvido' || ticket.status === 'fechado') return false;
        
        // Usar prazo_interno se definido, senão usar prazo calculado por criticidade
        let deadline;
        if (ticket.prazo_interno) {
          deadline = new Date(ticket.prazo_interno).getTime();
        } else {
          const startTime = new Date(ticket.data_criacao).getTime();
          const timeLimit = timeConfig[ticket.nivel_criticidade as keyof typeof timeConfig] || timeConfig['P3'];
          deadline = startTime + timeLimit;
        }
        
        return Date.now() > deadline;
      })();

      return {
        ...ticket,
        isExpired
      };
    });
  }, [tickets]);

  // Função de busca otimizada
  const searchTickets = useCallback((searchTerm: string, tickets: Ticket[]) => {
    if (!searchTerm.trim()) return tickets;
    
    const lowerTerm = searchTerm.toLowerCase();
    const termWords = lowerTerm.split(' ').filter(word => word.length > 1);
    
    return tickets.filter(ticket => {
      const searchFields = [
        ticket.titulo,
        ticket.descricao,
        ticket.solicitante,
        ticket.time_responsavel,
        ticket.ticket_number,
        ...(ticket.tags || [])
      ].filter(Boolean).map(field => field.toLowerCase());

      // Buscar nos comentários
      const commentFields = (ticket.sla_comentarios_internos || [])
        .map(comment => comment.comentario.toLowerCase())
        .filter(Boolean);

      // Busca exata primeiro (mais rápida)
      const exactMatch = searchFields.some(field => field.includes(lowerTerm)) ||
                         commentFields.some(field => field.includes(lowerTerm));
      if (exactMatch) return true;

      // Busca por palavras parciais
      return termWords.every(word => 
        searchFields.some(field => field.includes(word)) ||
        commentFields.some(field => field.includes(word))
      );
    });
  }, []);

  // Estatísticas otimizadas
  const stats = useMemo(() => {
    const counts = {
      total: tickets.length,
      abertos: 0,
      em_andamento: 0,
      resolvidos: 0,
      fechados: 0,
      atrasados: 0,
      criticos: 0
    };

    // Um loop único para calcular todas as estatísticas
    ticketsWithStatus.forEach(ticket => {
      if (ticket.isExpired) counts.atrasados++;
      if (ticket.nivel_criticidade === 'P0') counts.criticos++;
      
      switch (ticket.status) {
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
    stats,
    lastFetch,
    fetchTickets,
    loadMoreTickets,
    reloadTickets,
    currentPage,
    totalCount,
    hasMore,
    searchTickets,
    clearAllCache
  };
};