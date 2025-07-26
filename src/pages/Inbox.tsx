import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Filter, Clock, AlertCircle, CheckCircle, X, Grid3X3, List, Star, User, MoreVertical, Play, Pause, CheckCircle2, XCircle, Eye, Columns3, AlertTriangle, Flag, Building, Target, Users, Activity, Inbox as InboxIcon, Circle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Navigation from "@/components/Navigation";
import TicketDetailModal from "@/components/TicketDetailModal";
import SupabaseStatus from "@/components/SupabaseStatus";
import { TicketCountdown } from "@/components/TicketCountdown";
import { useTicketCountdown } from "@/hooks/useTicketCountdown";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import TicketKanban from "@/components/TicketKanban";
import JiraTicketCard from "@/components/JiraTicketCard";
import { useAuth } from "@/hooks/useAuth";
import { useTicketStatus, useTicketFilters, validateStatusChange, type TicketStatusType } from "@/hooks/useTicketStatus";

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
}

interface Setor {
  id: string;
  nome: string;
}

export default function Inbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [criticalityFilter, setCriticalityFilter] = useState('all');
  const [setorFilter, setSetorFilter] = useState('all');
  const [showOnlyExpired, setShowOnlyExpired] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');
  const [displayMode, setDisplayMode] = useState<'list' | 'kanban'>(() => {
    return (localStorage.getItem('inbox-display-mode') as 'list' | 'kanban') || 'list';
  });
  const [favoriteFilters, setFavoriteFilters] = useState<string[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('viewer');

  useEffect(() => {
    loadTickets();
    loadSetores();
    loadUserRole();
  }, []);

  useEffect(() => {
    localStorage.setItem('inbox-display-mode', displayMode);
  }, [displayMode]);

  // Filters are now handled by useMemo in filteredTicketsWithStatus

  const loadSetores = async () => {
    try {
      const { data, error } = await supabase
        .from('setores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setSetores(data || []);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    }
  };

  const loadUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, user_type')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      // Converter role/user_type para o formato esperado
      if (data.role === 'super_admin' || data.user_type === 'administrador_master') {
        setUserRole('super_admin');
      } else if (data.role === 'operador') {
        setUserRole('operador');
      } else {
        setUserRole('viewer');
      }
    } catch (error) {
      console.error('Erro ao carregar role do usuário:', error);
      setUserRole('viewer');
    }
  };

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('sla_demandas')
        .select(`
          *,
          setores (
            id,
            nome
          )
        `);

      if (error) throw error;
      
      // Aplicar ordenação inteligente
      const sortedData = (data || []).sort((a, b) => {
        // 1. Prioridade por status - Tickets ativos primeiro
        const statusPriority = {
          'aberto': 4,
          'em_andamento': 3, 
          'pausado': 2,
          'resolvido': 1,
          'fechado': 0
        };
        
        const statusDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
        if (statusDiff !== 0) return statusDiff;
        
        // 2. Se mesmo status, priorizar por criticidade (P0 > P1 > P2 > P3)
        const criticalityPriority = {
          'P0': 4,
          'P1': 3,
          'P2': 2, 
          'P3': 1
        };
        
        const criticalityDiff = (criticalityPriority[b.nivel_criticidade] || 0) - (criticalityPriority[a.nivel_criticidade] || 0);
        if (criticalityDiff !== 0) return criticalityDiff;
        
        // 3. Se mesma criticidade, priorizar por pontuação total
        const scoreDiff = (b.pontuacao_total || 0) - (a.pontuacao_total || 0);
        if (scoreDiff !== 0) return scoreDiff;
        
        // 4. Por último, para tickets ativos, mais antigos primeiro (urgência)
        if ((statusPriority[a.status] || 0) >= 2 && (statusPriority[b.status] || 0) >= 2) {
          return new Date(a.data_criacao).getTime() - new Date(b.data_criacao).getTime();
        }
        
        // 5. Para tickets resolvidos/fechados, mais recentes primeiro
        return new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime();
      });
      
      setTickets(sortedData);
    } catch (error) {
      console.error('Erro ao carregar SLAs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Old filterTickets function removed - now handled by useMemo in filteredTicketsWithStatus

  // Função helper para obter o label do status
  const getStatusLabel = (status: string): string => {
    const labels = {
      'aberto': 'Aberto',
      'pausado': 'Pausado',
      'em_andamento': 'Em Andamento',
      'resolvido': 'Resolvido',
      'fechado': 'Fechado'
    };
    return labels[status as keyof typeof labels] || 'Desconhecido';
  };

  // Calcular status info para todos os tickets no nível do componente

  // Calcular status info para todos os tickets no nível do componente
  const ticketsWithStatus = useMemo(() => {
    return tickets.map(ticket => ({
      ...ticket,
      statusInfo: (() => {
        // Replicar a lógica do useTicketStatus aqui para evitar hooks em loops
        const userCanEdit = userRole === 'super_admin' || userRole === 'operador';
        
        // Calcular se está atrasado
        const isExpired = (() => {
          if (ticket.status === 'resolvido' || ticket.status === 'fechado') return false;
          
          const timeConfig = {
            'P0': 4 * 60 * 60 * 1000, // 4 horas
            'P1': 24 * 60 * 60 * 1000, // 24 horas
            'P2': 3 * 24 * 60 * 60 * 1000, // 3 dias
            'P3': 7 * 24 * 60 * 60 * 1000, // 7 dias
          };
          
          const startTime = new Date(ticket.data_criacao).getTime();
          const timeLimit = timeConfig[ticket.nivel_criticidade as keyof typeof timeConfig] || timeConfig['P3'];
          const deadline = startTime + timeLimit;
          
          return Date.now() > deadline;
        })();

        // Se está atrasado, sobrescrever as cores para vermelho
        if (isExpired) {
          return {
            status: ticket.status,
            isExpired: true,
            displayStatus: `${getStatusLabel(ticket.status)} (Atrasado)`,
            color: 'bg-red-500',
            bgColor: 'bg-red-50',
            textColor: 'text-red-800',
            borderColor: 'border-red-200',
            icon: AlertTriangle,
            canEdit: userCanEdit
          };
        }

        // Status normal
        const statusConfig = {
          'aberto': {
            displayStatus: 'Aberto',
            color: 'bg-slate-400',
            bgColor: 'bg-slate-50',
            textColor: 'text-slate-700',
            borderColor: 'border-slate-300',
            icon: Circle
          },
          'pausado': {
            displayStatus: 'Pausado',
            color: 'bg-orange-400',
            bgColor: 'bg-orange-50',
            textColor: 'text-orange-700',
            borderColor: 'border-orange-300',
            icon: AlertCircle
          },
          'em_andamento': {
            displayStatus: 'Em Andamento',
            color: 'bg-blue-500',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-800',
            borderColor: 'border-blue-200',
            icon: Activity
          },
          'resolvido': {
            displayStatus: 'Resolvido',
            color: 'bg-green-500',
            bgColor: 'bg-green-50',
            textColor: 'text-green-800',
            borderColor: 'border-green-200',
            icon: CheckCircle
          },
          'fechado': {
            displayStatus: 'Fechado',
            color: 'bg-gray-500',
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-600',
            borderColor: 'border-gray-300',
            icon: X
          }
        };

        const config = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.aberto;

        return {
          status: ticket.status,
          isExpired: false,
          displayStatus: config.displayStatus,
          color: config.color,
          bgColor: config.bgColor,
          textColor: config.textColor,
          borderColor: config.borderColor,
          icon: config.icon,
          canEdit: userCanEdit
        };
      })()
    }));
  }, [tickets, userRole]);

  // Aplicar filtros aos tickets com status info
  const filteredTicketsWithStatus = useMemo(() => {
    let filtered = ticketsWithStatus;

    // Filtro por termo de busca (incluindo tags)
    if (searchTerm) {
      filtered = filtered.filter(ticket => 
        ticket.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.solicitante.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.time_responsavel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket.ticket_number && ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ticket.tags && ticket.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      console.log(`🔍 Aplicando filtro de status: "${statusFilter}"`);
      console.log('📊 Status únicos encontrados:', [...new Set(filtered.map(t => `"${t.status}"`))]);
      
      // Verificar ticket específico mencionado pelo usuário
      const ticket2025013 = filtered.find(t => t.ticket_number?.includes('2025-0013'));
      if (ticket2025013) {
        console.log('🎯 Ticket TICKET-2025-0013 encontrado:', {
          ticket_number: ticket2025013.ticket_number,
          status: ticket2025013.status,
          titulo: ticket2025013.titulo
        });
      }
      
      // Fazer comparação mais robusta de status
      filtered = filtered.filter(ticket => {
        const ticketStatus = ticket.status?.toString()?.trim()?.toLowerCase();
        const filterStatus = statusFilter?.toString()?.trim()?.toLowerCase();
        return ticketStatus === filterStatus;
      });
      console.log('📊 Tickets depois do filtro:', filtered.length);
    }

    // Filtro por criticidade
    if (criticalityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.nivel_criticidade === criticalityFilter);
    }

    // Filtro por setor
    if (setorFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.setor_id === setorFilter);
    }

    // Filtro específico para tickets atrasados
    if (showOnlyExpired) {
      filtered = filtered.filter(ticket => ticket.statusInfo.isExpired);
    }

    return filtered;
  }, [ticketsWithStatus, searchTerm, statusFilter, criticalityFilter, setorFilter, showOnlyExpired]);

  // Usar a lógica centralizada de filtros baseada nos ticketsWithStatus
  const ticketFilters = useTicketFilters(ticketsWithStatus);

  // Função para obter badge de status (agora sem hooks)
  const getStatusBadge = (ticketWithStatus: any) => {
    const Icon = ticketWithStatus.statusInfo.icon;
    const isAberto = ticketWithStatus.status === 'aberto';
    const isExpired = ticketWithStatus.statusInfo.isExpired;

    // Se for ticket "Em Aberto" e estiver atrasado, mostrar ambos os badges
    if (isAberto && isExpired) {
      return (
        <div className="flex items-center gap-1">
          <Badge className={`${ticketWithStatus.statusInfo.bgColor} ${ticketWithStatus.statusInfo.textColor} ${ticketWithStatus.statusInfo.borderColor} flex items-center gap-1 border font-medium border-l-4 border-l-slate-400`}>
            <Icon size={12} />
            Aberto
          </Badge>
          <Badge className="bg-red-50 text-red-800 border-red-200 flex items-center gap-1 border font-medium">
            <AlertTriangle size={12} />
            Atrasado
          </Badge>
        </div>
      );
    }

    // Badge normal com borda lateral especial para tickets "Em Aberto"
    const borderClass = isAberto ? 'border-l-4 border-l-slate-400' : '';
    
    return (
      <Badge className={`${ticketWithStatus.statusInfo.bgColor} ${ticketWithStatus.statusInfo.textColor} ${ticketWithStatus.statusInfo.borderColor} flex items-center gap-1 border font-medium ${borderClass}`}>
        <Icon size={12} />
        {ticketWithStatus.statusInfo.displayStatus}
        {/* Spinner especial para "Em Andamento" */}
        {ticketWithStatus.status === 'em_andamento' && !ticketWithStatus.statusInfo.isExpired && (
          <Clock className="ml-1 h-3 w-3 animate-pulse text-blue-600" />
        )}
      </Badge>
    );
  };

  const getCriticalityBadge = (criticality: string) => {
    const criticalityConfig = {
      'P0': { color: 'bg-red-500 text-white', label: 'Crítico' },
      'P1': { color: 'bg-orange-500 text-white', label: 'Alto' },
      'P2': { color: 'bg-yellow-500 text-white', label: 'Médio' },
      'P3': { color: 'bg-blue-500 text-white', label: 'Baixo' }
    };

    const config = criticalityConfig[criticality as keyof typeof criticalityConfig] || criticalityConfig.P3;

    return (
      <Badge className={config.color}>
        {criticality} - {config.label}
      </Badge>
    );
  };

  const getTempoMedioResolucao = (criticality: string) => {
    const tempos = {
      'P0': '4 horas',
      'P1': '24 horas', 
      'P2': '3 dias úteis',
      'P3': '7 dias úteis'
    };
    return tempos[criticality as keyof typeof tempos] || '7 dias úteis';
  };

  const handleOpenTicketDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setModalOpen(true);
  };

  const handleUpdateSelectedTicket = (updatedTicket: Ticket) => {
    setSelectedTicket(updatedTicket);
    // Also update in the main list for immediate visual feedback
    setTickets(currentTickets => currentTickets.map(t => t.id === updatedTicket.id ? updatedTicket : t));
  };

  const handleCloseTicketDetail = () => {
    setSelectedTicket(null);
    setModalOpen(false);
  };

  // Função para aplicar filtros clicando nos cards de estatísticas
  const applyQuickFilter = useCallback((type: string, value: string) => {
    console.log(`🎯 Filtro aplicado: ${type} = ${value}`);
    
    // Sempre limpar todos os filtros primeiro para evitar conflitos
    setSearchTerm('');
    setCriticalityFilter('all');
    setSetorFilter('all');
    setShowOnlyExpired(false);
    
    switch (type) {
      case 'status':
        setStatusFilter(value);
        break;
      case 'criticality':
        setCriticalityFilter(value);
        setStatusFilter('all'); // Limpar filtro de status quando filtrar por criticidade
        break;
      case 'setor':
        setSetorFilter(value);
        setStatusFilter('all'); // Limpar filtro de status quando filtrar por setor
        break;
    }
  }, []);

  // Gerar sugestões de busca baseadas nos tickets
  const generateSearchSuggestions = useCallback((term: string) => {
    if (!term || term.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const suggestions = new Set<string>();
    
    tickets.forEach(ticket => {
      // Sugerir títulos
      if (ticket.titulo.toLowerCase().includes(term.toLowerCase())) {
        suggestions.add(ticket.titulo);
      }
      
      // Sugerir tags
      ticket.tags?.forEach(tag => {
        if (tag.toLowerCase().includes(term.toLowerCase())) {
          suggestions.add(tag);
        }
      });
      
      // Sugerir times responsáveis
      if (ticket.time_responsavel.toLowerCase().includes(term.toLowerCase())) {
        suggestions.add(ticket.time_responsavel);
      }
    });

    setSearchSuggestions(Array.from(suggestions).slice(0, 5));
  }, [tickets]);

  // Atualizar sugestões quando o termo de busca muda
  useEffect(() => {
    generateSearchSuggestions(searchTerm);
  }, [searchTerm, generateSearchSuggestions]);

  // Função para mudar status do ticket com validação
  const updateTicketStatus = useCallback(async (ticketId: string, newStatus: TicketStatusType) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const validation = validateStatusChange(
      ticket.status as TicketStatusType, 
      newStatus, 
      userRole
    );

    if (!validation.valid) {
      console.error('Mudança de status inválida:', validation.reason);
      return;
    }

    try {
      const { error } = await supabase
        .from('sla_demandas')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', ticketId);

      if (error) throw error;

      console.log(`✅ Status atualizado: ${ticket.titulo} → ${newStatus}`);
      
      // Recarregar tickets para atualizar dashboard
      await loadTickets();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  }, [tickets, userRole]);

  // Calcular tempo até vencer ou tempo vencido
  const getTimeStatus = useCallback((dataCriacao: string, criticidade: string, status: string) => {
    if (status === 'resolvido' || status === 'fechado') return null;
    
    const timeConfig = {
      'P0': 4 * 60 * 60 * 1000,
      'P1': 24 * 60 * 60 * 1000,
      'P2': 3 * 24 * 60 * 60 * 1000,
      'P3': 7 * 24 * 60 * 60 * 1000,
    };
    
    const startTime = new Date(dataCriacao).getTime();
    const timeLimit = timeConfig[criticidade as keyof typeof timeConfig] || timeConfig['P3'];
    const deadline = startTime + timeLimit;
    const now = Date.now();
    
    if (now > deadline) {
      const overdue = now - deadline;
      return {
        isOverdue: true,
        text: `atrasado há ${formatDistanceToNow(new Date(deadline), { locale: ptBR })}`,
        className: 'text-destructive font-medium'
      };
    } else {
      const remaining = deadline - now;
      return {
        isOverdue: false,
        text: `vence em ${formatDistanceToNow(new Date(deadline), { locale: ptBR })}`,
        className: remaining < 60 * 60 * 1000 ? 'text-orange-600 font-medium' : 'text-muted-foreground'
      };
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando SLAs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {!isSupabaseConfigured && (
            <div className="mb-6">
              <SupabaseStatus />
            </div>
          )}
          
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Caixa de Entrada - Tickets
                <Badge variant="secondary" className="ml-3 text-lg font-mono">
                  {filteredTicketsWithStatus.length}
                </Badge>
              </h1>
              <p className="text-muted-foreground">Gerencie todas as demandas e acompanhe o status dos tickets</p>
            </div>
            
            {/* Indicadores de urgência */}
            <div className="flex gap-2">
              {filteredTicketsWithStatus.filter(s => s.status !== 'resolvido' && s.status !== 'fechado').length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {filteredTicketsWithStatus.filter(s => s.status !== 'resolvido' && s.status !== 'fechado').length} ativos
                </Badge>
              )}
              {filteredTicketsWithStatus.filter(s => s.nivel_criticidade === 'P0' && s.status !== 'resolvido' && s.status !== 'fechado').length > 0 && (
                <Badge variant="destructive" className="animate-glow-pulse flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {filteredTicketsWithStatus.filter(s => s.nivel_criticidade === 'P0' && s.status !== 'resolvido' && s.status !== 'fechado').length} críticos
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Tickets Críticos Atrasados - Seção Fixa */}
        {tickets.filter(ticket => {
          if (ticket.status === 'resolvido' || ticket.status === 'fechado') return false;
          
          const timeConfig = {
            'P0': 4 * 60 * 60 * 1000,
            'P1': 24 * 60 * 60 * 1000,
            'P2': 3 * 24 * 60 * 60 * 1000,
            'P3': 7 * 24 * 60 * 60 * 1000,
          };
          
          const startTime = new Date(ticket.data_criacao).getTime();
          const timeLimit = timeConfig[ticket.nivel_criticidade as keyof typeof timeConfig] || timeConfig['P3'];
          const deadline = startTime + timeLimit;
          
          return Date.now() > deadline && (ticket.nivel_criticidade === 'P0' || ticket.nivel_criticidade === 'P1');
        }).length > 0 && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5 animate-pulse" />
                Tickets Críticos Atrasados
                <Badge variant="destructive" className="animate-glow-pulse flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {tickets.filter(ticket => {
                    if (ticket.status === 'resolvido' || ticket.status === 'fechado') return false;
                    
                    const timeConfig = {
                      'P0': 4 * 60 * 60 * 1000,
                      'P1': 24 * 60 * 60 * 1000,
                      'P2': 3 * 24 * 60 * 60 * 1000,
                      'P3': 7 * 24 * 60 * 60 * 1000,
                    };
                    
                    const startTime = new Date(ticket.data_criacao).getTime();
                    const timeLimit = timeConfig[ticket.nivel_criticidade as keyof typeof timeConfig] || timeConfig['P3'];
                    const deadline = startTime + timeLimit;
                    
                    return Date.now() > deadline && (ticket.nivel_criticidade === 'P0' || ticket.nivel_criticidade === 'P1');
                  }).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tickets
                  .filter(ticket => {
                    if (ticket.status === 'resolvido' || ticket.status === 'fechado') return false;
                    
                    const timeConfig = {
                      'P0': 4 * 60 * 60 * 1000,
                      'P1': 24 * 60 * 60 * 1000,
                      'P2': 3 * 24 * 60 * 60 * 1000,
                      'P3': 7 * 24 * 60 * 60 * 1000,
                    };
                    
                    const startTime = new Date(ticket.data_criacao).getTime();
                    const timeLimit = timeConfig[ticket.nivel_criticidade as keyof typeof timeConfig] || timeConfig['P3'];
                    const deadline = startTime + timeLimit;
                    
                    return Date.now() > deadline && (ticket.nivel_criticidade === 'P0' || ticket.nivel_criticidade === 'P1');
                  })
                  .slice(0, 3)
                  .map(ticket => (
                    <div 
                      key={ticket.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border border-destructive/20 cursor-pointer hover:bg-destructive/5 transition-colors"
                      onClick={() => handleOpenTicketDetail(ticket)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                        <Badge variant="secondary" className="font-mono text-xs">
                          {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
                        </Badge>
                        <span className="font-medium">{ticket.titulo}</span>
                        {getCriticalityBadge(ticket.nivel_criticidade)}
                      </div>
                      <div className="text-sm text-destructive font-medium">
                        {getTimeStatus(ticket.data_criacao, ticket.nivel_criticidade, ticket.status)?.text}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros Inteligentes */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter size={20} />
                Filtros Inteligentes
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Botão de alternância entre Lista e Kanban */}
                <Button
                  variant={displayMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDisplayMode('list')}
                  className="flex items-center gap-1"
                >
                  <List size={16} />
                  Lista
                </Button>
                <Button
                  variant={displayMode === 'kanban' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDisplayMode('kanban')}
                  className="flex items-center gap-1"
                >
                  <Columns3 size={16} />
                  Kanban
                </Button>
                
                <Separator orientation="vertical" className="h-8" />
                
                {/* Botões de modo de visualização (apenas para lista) */}
                {displayMode === 'list' && (
                  <>
                    <Button
                      variant={viewMode === 'compact' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('compact')}
                      className="flex items-center gap-1"
                    >
                      <Grid3X3 size={16} />
                      Compacto
                    </Button>
                    <Button
                      variant={viewMode === 'detailed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('detailed')}
                      className="flex items-center gap-1"
                    >
                      <Eye size={16} />
                      Detalhado
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ticket, título, descrição, tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {/* Sugestões de busca */}
                {searchSuggestions.length > 0 && (
                  <Card className="absolute top-full left-0 right-0 z-10 mt-1 max-h-40 overflow-y-auto">
                    <CardContent className="p-2">
                      {searchSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="p-2 hover:bg-muted rounded cursor-pointer text-sm"
                          onClick={() => {
                            setSearchTerm(suggestion);
                            setSearchSuggestions([]);
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
              
              <Select value={statusFilter} onValueChange={(value) => {
                console.log('📋 Mudança no filtro de status:', value);
                setStatusFilter(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="aberto">📋 Aberto</SelectItem>
                  <SelectItem value="em_andamento">🔵 Em Andamento</SelectItem>
                  <SelectItem value="resolvido">✅ Resolvido</SelectItem>
                  <SelectItem value="fechado">⚫ Fechado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={criticalityFilter} onValueChange={(value) => {
                console.log('🚨 Mudança no filtro de criticidade:', value);
                setCriticalityFilter(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por criticidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as criticidades</SelectItem>
                  <SelectItem value="P0">🚨 P0 - Crítico</SelectItem>
                  <SelectItem value="P1">🔥 P1 - Alto</SelectItem>
                  <SelectItem value="P2">⚠️ P2 - Médio</SelectItem>
                  <SelectItem value="P3">ℹ️ P3 - Baixo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={setorFilter} onValueChange={(value) => {
                console.log('🏢 Mudança no filtro de setor:', value);
                setSetorFilter(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {setores.map((setor) => (
                    <SelectItem key={setor.id} value={setor.id}>
                      🏢 {setor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtros Rápidos */}
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors flex items-center gap-1"
                onClick={() => {
                  setStatusFilter('aberto');
                  setCriticalityFilter('P0');
                }}
              >
                <AlertTriangle className="w-3 h-3 text-red-500" />
                Críticos Abertos
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300 transition-colors flex items-center gap-1"
                onClick={() => {
                  setStatusFilter('em_andamento');
                  setCriticalityFilter('all');
                  setSetorFilter('all');
                  setShowOnlyExpired(false);
                }}
              >
                <Activity className="w-3 h-3 text-blue-600" />
                Em Andamento
                <Clock className="w-3 h-3 animate-pulse text-blue-500" />
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-red-100 hover:text-red-800 hover:border-red-300 transition-colors flex items-center gap-1"
                onClick={() => {
                  console.log('🔍 Clicou em Atrasados - aplicando filtro específico');
                  // Limpar outros filtros e aplicar filtro específico para atrasados
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCriticalityFilter('all');
                  setSetorFilter('all');
                  setShowOnlyExpired(true);
                }}
              >
                <AlertTriangle className="w-3 h-3 text-red-600" />
                Atrasados
                <Clock className="w-3 h-3 animate-pulse text-red-500" />
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCriticalityFilter('all');
                  setSetorFilter('all');
                  setShowOnlyExpired(false);
                }}
                className="h-6 px-2 text-xs flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Estatísticas Atualizados */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => {
              console.log('🟡 Card Pausado clicado');
              console.log('🟡 Aplicando filtro para: pausado');
              applyQuickFilter('status', 'pausado');
            }}
          >
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-orange-600">{ticketFilters.pausado?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Pausados</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => applyQuickFilter('status', 'em_andamento')}
          >
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">{ticketFilters.em_andamento.length}</div>
              <p className="text-sm text-muted-foreground">Em Andamento</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => applyQuickFilter('status', 'resolvido')}
          >
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">{ticketFilters.resolvido.length}</div>
              <p className="text-sm text-muted-foreground">Resolvidos</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => applyQuickFilter('status', 'fechado')}
          >
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-500">{ticketFilters.fechado.length}</div>
              <p className="text-sm text-muted-foreground">Fechados</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => {
              // Filtrar apenas tickets atrasados
              setSearchTerm('');
              setStatusFilter('all');
              setCriticalityFilter('all');
              setSetorFilter('all');
              setShowOnlyExpired(true);
            }}
          >
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-red-600">{tickets.filter(ticket => {
                if (ticket.status === 'resolvido' || ticket.status === 'fechado') return false;
                
                const timeConfig = {
                  'P0': 4 * 60 * 60 * 1000,
                  'P1': 24 * 60 * 60 * 1000,
                  'P2': 3 * 24 * 60 * 60 * 1000,
                  'P3': 7 * 24 * 60 * 60 * 1000,
                };
                
                const startTime = new Date(ticket.data_criacao).getTime();
                const timeLimit = timeConfig[ticket.nivel_criticidade as keyof typeof timeConfig] || timeConfig['P3'];
                const deadline = startTime + timeLimit;
                
                return Date.now() > deadline;
              }).length}</div>
              <p className="text-sm text-muted-foreground">Atrasados</p>
            </CardContent>
          </Card>
        </div>

        {/* Renderização condicional: Lista ou Kanban */}
        {displayMode === 'kanban' ? (
          <TicketKanban
            tickets={filteredTicketsWithStatus}
            onOpenDetail={handleOpenTicketDetail}
            onTicketUpdate={loadTickets}
            userRole={userRole}
          />
        ) : (
          /* Lista de Tickets Melhorada */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <InboxIcon className="w-5 h-5" />
                  Caixa de Entrada
                  <Badge variant="outline" className="font-mono">
                    {filteredTicketsWithStatus.length} tickets
                  </Badge>
                  {filteredTicketsWithStatus.filter(s => s.status === 'aberto').length > 0 && (
                    <Badge variant="destructive">
                      <Clock className="w-3 h-3 mr-1" />
                      {filteredTicketsWithStatus.filter(s => s.status === 'aberto').length} abertos
                    </Badge>
                  )}
                </CardTitle>
                <div className="text-sm text-muted-foreground flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Críticos primeiro
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Inteligência
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Tempo real
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {filteredTicketsWithStatus.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Nenhum ticket encontrado</h3>
                    <p className="text-muted-foreground">Tente ajustar os filtros ou criar um novo ticket.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTicketsWithStatus.map((ticket) => {
                      const timeStatus = getTimeStatus(ticket.data_criacao, ticket.nivel_criticidade, ticket.status);
                      const isExpired = timeStatus?.isOverdue;
                      
                      return (
                        <JiraTicketCard
                          key={ticket.id}
                          ticket={ticket}
                          onOpenDetail={handleOpenTicketDetail}
                          onUpdateStatus={updateTicketStatus}
                          userCanEdit={userRole === 'super_admin' || userRole === 'operador'}
                          isExpired={isExpired}
                        />
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
        </div>
      </div>

      {/* Modal de Detalhes do SLA */}
      <TicketDetailModal
        sla={selectedTicket}
        isOpen={modalOpen}
        onClose={handleCloseTicketDetail}
        onUpdate={loadTickets}
        setSelectedSLA={handleUpdateSelectedTicket}
      />
    </div>
  );
}