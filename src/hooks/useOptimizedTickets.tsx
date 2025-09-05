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

// Cache para evitar refetching desnecessário
const ticketCache = new Map<string, { data: Ticket[]; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 segundos

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
    const cacheKey = 'all_tickets';
    const now = Date.now();
    
    console.log('🔄 Iniciando fetch de tickets...', { forceRefresh, cacheSize: ticketCache.size });
    
    // Verificar cache se não for refresh forçado
    if (!forceRefresh && ticketCache.has(cacheKey)) {
      const cached = ticketCache.get(cacheKey)!;
      if (now - cached.timestamp < CACHE_DURATION) {
        console.log('✅ Usando cache de tickets:', cached.data.length, 'tickets');
        setTickets(cached.data);
        setLoading(false);
        return cached.data;
      }
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🌐 Fazendo request para Supabase...');

      // Query EXTREMAMENTE simplificada para evitar sobrecarga do Supabase
      const { data, error } = await supabase
        .from('sla_demandas')
        .select(`
          id,
          ticket_number,
          titulo,
          status,
          nivel_criticidade,
          data_criacao,
          setor_id
        `)
        .order('data_criacao', { ascending: false })
        .limit(50); // Reduzido drasticamente para performance

      if (error) throw error;
      console.log('✅ Dados recebidos do Supabase:', data?.length || 0, 'tickets');

      // Dados simplificados - sem responsáveis nem comentários para reduzir carga
      const ticketsData: Ticket[] = [];
      
      if (data && data.length > 0) {
        data.forEach((ticket: any) => {
          ticketsData.push({
            ...ticket,
            // Campos padrão simplificados
            time_responsavel: 'N/A',
            solicitante: 'Sistema',
            descricao: 'Carregamento simplificado para economia de recursos',
            tipo_ticket: 'sistema',
            pontuacao_total: 0,
            pontuacao_financeiro: 0,
            pontuacao_cliente: 0,
            pontuacao_reputacao: 0,
            pontuacao_urgencia: 0,
            pontuacao_operacional: 0,
            updated_at: ticket.data_criacao,
            resolved_at: null,
            observacoes: null,
            tags: [],
            responsavel_interno: null,
            prazo_interno: null,
            prioridade_operacional: 'media',
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
      
      setTickets(sortedData);
      sortedTicketsRef.current = sortedData;
      setLastFetch(now);
      
      console.log('✅ Tickets processados e salvos:', sortedData.length);
      
      return sortedData;
    } catch (err) {
      console.error('❌ Erro ao carregar tickets:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      
      // Se houver dados em cache, usar como fallback
      if (ticketCache.has(cacheKey)) {
        const cached = ticketCache.get(cacheKey)!;
        console.log('🔄 Usando dados de cache como fallback:', cached.data.length, 'tickets');
        setTickets(cached.data);
        return cached.data;
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [sortFunction]);

  // Função de reload otimizada
  const reloadTickets = useCallback(() => {
    return fetchTickets(true);
  }, [fetchTickets]);

  // TEMPORARIAMENTE DESABILITADO para reduzir carga no Supabase
  // O realtime está causando loop infinito e esgotando recursos
  useEffect(() => {
    console.log('🚫 Realtime desabilitado temporariamente para evitar sobrecarga');
    return () => {};
  }, []);

  // Listener para evento de atualização de prazo
  useEffect(() => {
    const handleDeadlineUpdate = (event: CustomEvent) => {
      const { ticketId } = event.detail;
      console.log('🔄 Recalculando status após atualização de prazo:', ticketId);
      
      // Invalidar cache e recarregar tickets
      ticketCache.clear();
      fetchTickets(true);
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
    fetchTickets(true);
  }, [fetchTickets]);

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
    reloadTickets,
    searchTickets,
    clearAllCache
  };
};