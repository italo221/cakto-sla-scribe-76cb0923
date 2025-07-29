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
import { Search, Filter, Clock, AlertCircle, CheckCircle, X, Grid3X3, List, Star, User, MoreVertical, Play, Pause, CheckCircle2, XCircle, Eye, Columns3, AlertTriangle, Flag, Building, Target, Users, Activity, Inbox as InboxIcon, Circle, Info, Building2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Navigation from "@/components/Navigation";
import TicketDetailModal from "@/components/TicketDetailModal";
import TicketEditModal from "@/components/TicketEditModal";
import TicketDeleteModal from "@/components/TicketDeleteModal";
import SetorValidationAlert from "@/components/SetorValidationAlert";
import SupabaseStatus from "@/components/SupabaseStatus";
import { TicketCountdown } from "@/components/TicketCountdown";
import { useTicketCountdown } from "@/hooks/useTicketCountdown";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import TicketKanban from "@/components/TicketKanban";
import JiraTicketCard from "@/components/JiraTicketCard";
import VirtualizedTicketList from "@/components/VirtualizedTicketList";
import { useOptimizedTickets } from "@/hooks/useOptimizedTickets";
import { useAuth } from "@/hooks/useAuth";
import { useTags } from "@/hooks/useTags";
import { useToast } from "@/hooks/use-toast";
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
  // Usar hook otimizado para tickets
  const {
    tickets: optimizedTickets,
    ticketsWithStatus: optimizedTicketsWithStatus,
    loading,
    error,
    stats,
    lastFetch,
    fetchTickets: loadTickets,
    reloadTickets,
    searchTickets
  } = useOptimizedTickets({
    enableRealtime: true,
    batchSize: 50
  });

  const [setores, setSetores] = useState<Setor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'aberto' | 'em_andamento' | 'resolvido' | 'fechado' | 'atrasado' | 'critico'>('all');
  const [setorFilter, setSetorFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('todas');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTicketForEdit, setSelectedTicketForEdit] = useState<Ticket | null>(null);
  const [selectedTicketForDelete, setSelectedTicketForDelete] = useState<Ticket | null>(null);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');
  
  const {
    user,
    canEdit,
    isSuperAdmin
  } = useAuth();
  const { allTags } = useTags();
  const [userRole, setUserRole] = useState<string>('viewer');
  const { toast } = useToast();

  // Define canDelete based on user permissions
  const canDelete = isSuperAdmin;

  useEffect(() => {
    loadSetores();
    loadUserRole();

    // Event listener para abrir modal de edição
    const handleOpenEditModal = (event: CustomEvent) => {
      const ticket = event.detail;
      setSelectedTicketForEdit(ticket);
      setEditModalOpen(true);
    };
    window.addEventListener('openEditModal', handleOpenEditModal as EventListener);
    return () => {
      window.removeEventListener('openEditModal', handleOpenEditModal as EventListener);
    };
  }, []);

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

  // Função helper para obter o label do status
  const getStatusLabel = (status: string): string => {
    const labels = {
      'aberto': 'Aberto',
      'em_andamento': 'Em Andamento',
      'resolvido': 'Resolvido',
      'fechado': 'Fechado'
    };
    return labels[status as keyof typeof labels] || 'Desconhecido';
  };

  // Usar tickets otimizados diretamente
  const ticketsWithStatus = optimizedTicketsWithStatus;

  // Busca inteligente com sugestões
  const generateSearchSuggestions = useCallback((term: string) => {
    if (!term || term.length < 2) return [];
    const suggestions = new Set<string>();
    const lowerTerm = term.toLowerCase();

    // Buscar em títulos, solicitantes, setores e números de ticket
    ticketsWithStatus.forEach(ticket => {
      // Títulos que contenham o termo
      if (ticket.titulo.toLowerCase().includes(lowerTerm)) {
        suggestions.add(ticket.titulo);
      }

      // Solicitantes que contenham o termo
      if (ticket.solicitante.toLowerCase().includes(lowerTerm)) {
        suggestions.add(ticket.solicitante);
      }

      // Setores que contenham o termo
      if (ticket.time_responsavel.toLowerCase().includes(lowerTerm)) {
        suggestions.add(ticket.time_responsavel);
      }

      // Números de ticket que contenham o termo
      if (ticket.ticket_number && ticket.ticket_number.toLowerCase().includes(lowerTerm)) {
        suggestions.add(ticket.ticket_number);
      }
    });

    // Priorizar sugestões - tickets críticos e recentes primeiro
    return Array.from(suggestions).slice(0, 8).sort((a, b) => {
      const aTicket = ticketsWithStatus.find(t => t.titulo === a || t.solicitante === a || t.time_responsavel === a || t.ticket_number === a);
      const bTicket = ticketsWithStatus.find(t => t.titulo === b || t.solicitante === b || t.time_responsavel === b || t.ticket_number === b);
      if (!aTicket || !bTicket) return 0;

      // Priorizar por criticidade
      const criticalityOrder = {
        'P0': 4,
        'P1': 3,
        'P2': 2,
        'P3': 1
      };
      const aCritical = criticalityOrder[aTicket.nivel_criticidade as keyof typeof criticalityOrder] || 0;
      const bCritical = criticalityOrder[bTicket.nivel_criticidade as keyof typeof criticalityOrder] || 0;
      if (aCritical !== bCritical) return bCritical - aCritical;

      // Depois por data (mais recentes primeiro)
      return new Date(bTicket.data_criacao).getTime() - new Date(aTicket.data_criacao).getTime();
    });
  }, [ticketsWithStatus]);

  // Atualizar sugestões quando o termo de busca mudar
  useEffect(() => {
    const suggestions = generateSearchSuggestions(searchTerm);
    setSearchSuggestions(suggestions);
    setShowSuggestions(searchTerm.length >= 2 && suggestions.length > 0);
  }, [searchTerm, generateSearchSuggestions]);

  // Busca inteligente com suporte a palavras incompletas e tolerância a erros
  const smartSearch = useCallback((ticket: any, term: string) => {
    if (!term) return true;
    const lowerTerm = term.toLowerCase();
    const searchFields = [ticket.titulo, ticket.descricao, ticket.solicitante, ticket.time_responsavel, ticket.ticket_number, ...(ticket.tags || [])].filter(Boolean).map(field => field.toLowerCase());

    // Busca exata
    const exactMatch = searchFields.some(field => field.includes(lowerTerm));
    if (exactMatch) return true;

    // Busca por palavras parciais (para busca inteligente tipo Google)
    const termWords = lowerTerm.split(' ').filter(word => word.length > 1);
    const partialMatch = termWords.every(word => searchFields.some(field => field.includes(word)));
    return partialMatch;
  }, []);

  // Aplicar filtros aos tickets com status info
  const filteredTicketsWithStatus = useMemo(() => {
    let filtered = ticketsWithStatus;

    // Busca inteligente
    if (searchTerm) {
      filtered = filtered.filter(ticket => smartSearch(ticket, searchTerm));
    }

    // Sistema de filtros unificado - apenas um filtro ativo por vez
    if (activeFilter !== 'all') {
      filtered = filtered.filter(ticket => {
        const ticketStatus = ticket.status?.toString()?.trim()?.toLowerCase();
        switch (activeFilter) {
          case 'atrasado':
            return ticket.isExpired;
          case 'critico':
            return ticket.nivel_criticidade === 'P0';
          default:
            return ticketStatus === activeFilter && !ticket.isExpired;
        }
      });
    }

    // Filtro por setor - usar mesma lógica da contagem
    if (setorFilter !== 'all') {
      filtered = filtered.filter(ticket => {
        const setorSelecionado = setores.find(s => s.id === setorFilter);
        if (!setorSelecionado) return false;

        const timeResponsavel = ticket.time_responsavel?.trim();
        const nomeSetor = setorSelecionado.nome?.trim();

        
        // Se time_responsavel corresponde ao nome do setor, usar isso (prioritário)
        if (timeResponsavel === nomeSetor) {
          return true;
        }
        
        // Fallback: se não há time_responsavel ou não corresponde, usar setor_id
        if (!timeResponsavel && ticket.setor_id === setorFilter) {
          return true;
        }
        
        return false;
      });
    }

    // Filtro por tag (separado e independente dos outros filtros)
    if (tagFilter !== 'todas') {
      filtered = filtered.filter(ticket => {
        // Garantir que tags seja sempre um array válido
        const ticketTags = Array.isArray(ticket.tags) ? ticket.tags : [];
        
        // Busca case-insensitive e com trim para evitar problemas de espaço
        const hasTag = ticketTags.some(tag => 
          tag && typeof tag === 'string' && 
          tag.trim().toLowerCase() === tagFilter.trim().toLowerCase()
        );
        
        return hasTag;
      });
    }

    return filtered;
  }, [ticketsWithStatus, searchTerm, activeFilter, setorFilter, tagFilter, smartSearch]);

  // Cálculo de contagens dos cards baseadas na mesma lógica dos filtros
  const cardCounts = useMemo(() => {
    const counts = {
      aberto: 0,
      em_andamento: 0,
      resolvido: 0,
      fechado: 0,
      atrasado: 0
    };
    ticketsWithStatus.forEach(ticket => {
      if (ticket.isExpired) {
        counts.atrasado++;
      }
      if (!ticket.isExpired) {
        const status = ticket.status?.toString()?.trim()?.toLowerCase();
        if (status === 'aberto') counts.aberto++;
        else if (status === 'em_andamento') counts.em_andamento++;
        else if (status === 'resolvido') counts.resolvido++;
        else if (status === 'fechado') counts.fechado++;
      }
    });
    return counts;
  }, [ticketsWithStatus]);

  // Contagem de tickets por setor - priorizar time_responsavel se existir, senão setor_id
  const setorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    setores.forEach(setor => {
      counts[setor.id] = ticketsWithStatus.filter(ticket => {
        const timeResponsavel = ticket.time_responsavel?.trim();
        const nomeSetor = setor.nome?.trim();
        
        // Se time_responsavel corresponde ao nome do setor, usar isso (prioritário)
        if (timeResponsavel === nomeSetor) {
          return true;
        }
        
        // Fallback: se não há time_responsavel ou não corresponde, usar setor_id
        if (!timeResponsavel && ticket.setor_id === setor.id) {
          return true;
        }
        
        return false;
      }).length;
    });
    return counts;
  }, [ticketsWithStatus, setores]);

  // Função para obter badge de status (agora sem hooks)
  const getStatusBadge = (ticketWithStatus: any) => {
    const Icon = ticketWithStatus.statusInfo.icon;
    const isAberto = ticketWithStatus.status === 'aberto';
    const isExpired = ticketWithStatus.statusInfo.isExpired;

    // Se for ticket "Em Aberto" e estiver atrasado, mostrar ambos os badges
    if (isAberto && isExpired) {
      return <div className="flex items-center gap-1">
          <Badge className={`${ticketWithStatus.statusInfo.bgColor} ${ticketWithStatus.statusInfo.textColor} ${ticketWithStatus.statusInfo.borderColor} flex items-center gap-1 border font-medium border-l-4 border-l-slate-400 dark:border-l-slate-500`}>
            <Icon size={12} />
            Aberto
          </Badge>
          <Badge className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800 flex items-center gap-1 border font-medium">
            <AlertTriangle size={12} />
            Atrasado
          </Badge>
        </div>;
    }

    // Badge normal com borda lateral especial para tickets "Em Aberto"
    const borderClass = isAberto ? 'border-l-4 border-l-slate-400 dark:border-l-slate-500' : '';
    return <Badge className={`${ticketWithStatus.statusInfo.bgColor} ${ticketWithStatus.statusInfo.textColor} ${ticketWithStatus.statusInfo.borderColor} flex items-center gap-1 border font-medium ${borderClass}`}>
        <Icon size={12} />
        {ticketWithStatus.statusInfo.displayStatus}
        {/* Spinner especial para "Em Andamento" */}
        {ticketWithStatus.status === 'em_andamento' && !ticketWithStatus.statusInfo.isExpired && <Clock className="ml-1 h-3 w-3 animate-pulse text-blue-600 dark:text-blue-400" />}
      </Badge>;
  };
  const getCriticalityBadge = (criticality: string) => {
    const criticalityConfig = {
      'P0': {
        color: 'bg-red-500 text-white',
        label: 'Crítico'
      },
      'P1': {
        color: 'bg-orange-500 text-white',
        label: 'Alto'
      },
      'P2': {
        color: 'bg-yellow-500 text-white',
        label: 'Médio'
      },
      'P3': {
        color: 'bg-blue-500 text-white',
        label: 'Baixo'
      }
    };
    const config = criticalityConfig[criticality as keyof typeof criticalityConfig] || criticalityConfig.P3;
    return <Badge className={config.color}>
        {criticality} - {config.label}
      </Badge>;
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
  const handleEditTicket = (ticket: Ticket) => {
    setSelectedTicketForEdit(ticket);
    setEditModalOpen(true);
  };
  const handleDeleteTicket = (ticket: Ticket) => {
    setSelectedTicketForDelete(ticket);
    setDeleteModalOpen(true);
  };
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedTicket(null);
  };
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedTicketForEdit(null);
  };
  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setSelectedTicketForDelete(null);
  };
  const handleTicketUpdate = () => {
    reloadTickets();
    toast({
      title: "Ticket atualizado",
      description: "O ticket foi atualizado com sucesso."
    });
  };
  const handleUpdateSelectedTicket = (updatedTicket: any) => {
    setSelectedTicket(updatedTicket);
  };
  if (!isSupabaseConfigured) {
    return <div className="min-h-screen bg-background dark:bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <SupabaseStatus />
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background dark:bg-background text-foreground dark:text-foreground">
      <Navigation />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Alerta de validação de setor */}
        <SetorValidationAlert />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground dark:text-foreground flex items-center gap-3">
              <InboxIcon className="h-8 w-8" />
              Caixa de Entrada
            </h1>
            <p className="text-muted-foreground dark:text-muted-foreground">
              Gerencie e acompanhe todos os tickets do sistema
            </p>
          </div>
          
          <Button onClick={reloadTickets} variant="outline" className="gap-2">
            <Activity className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-card dark:bg-card rounded-lg border border-border dark:border-border p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Buscar tickets (títulos, solicitantes, setores...)" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => setShowSuggestions(searchTerm.length >= 2 && searchSuggestions.length > 0)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} className="pl-10 bg-background text-foreground border-border focus:border-primary" />
            </div>
            
            {/* Dropdown de sugestões de busca */}
            {showSuggestions && searchSuggestions.length > 0 && <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                {searchSuggestions.map((suggestion, index) => <div key={index} className="px-3 py-2 hover:bg-accent cursor-pointer text-sm" onClick={() => {
              setSearchTerm(suggestion);
              setShowSuggestions(false);
            }}>
                    {suggestion}
                  </div>)}
              </div>}
            
            <div className="flex gap-2">
              <Select value={setorFilter} onValueChange={setSetorFilter}>
                <SelectTrigger className="w-[160px] bg-background dark:bg-background text-foreground dark:text-foreground border-border dark:border-border">
                  <SelectValue placeholder="Setor" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border">
                  <SelectItem value="all">Todos Setores</SelectItem>
                  {setores.map(setor => <SelectItem key={setor.id} value={setor.id}>
                      {setor.nome} ({setorCounts[setor.id] || 0})
                    </SelectItem>)}
                </SelectContent>
              </Select>

              {/* Filtro por tag */}
              <Select value={tagFilter} onValueChange={(value) => {
                console.log('🔄 Tag filter mudando de:', tagFilter, 'para:', value);
                setTagFilter(value);
              }}>
                <SelectTrigger className="w-[140px] bg-background dark:bg-background text-foreground dark:text-foreground border-border dark:border-border">
                  <SelectValue placeholder="Tags" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border max-h-60 overflow-y-auto">
                  <SelectItem value="todas">Todas Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Status Cards - Sistema de filtro unificado */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className={cn("cursor-pointer transition-all hover:shadow-md border-l-4 bg-card dark:bg-card", activeFilter === 'aberto' ? 'ring-2 ring-slate-500 border-l-slate-500 bg-slate-50 dark:bg-slate-800' : 'border-l-slate-400 hover:border-l-slate-500')} onClick={() => setActiveFilter(activeFilter === 'aberto' ? 'all' : 'aberto')}>
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <Circle className="h-6 w-6 text-slate-400 dark:text-slate-300" />
              </div>
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-100">{cardCounts.aberto}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">Abertos</div>
            </CardContent>
          </Card>

          <Card className={cn("cursor-pointer transition-all hover:shadow-md border-l-4 bg-card dark:bg-card", activeFilter === 'em_andamento' ? 'ring-2 ring-blue-500 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-l-blue-400 hover:border-l-blue-500')} onClick={() => setActiveFilter(activeFilter === 'em_andamento' ? 'all' : 'em_andamento')}>
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <Activity className="h-6 w-6 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{cardCounts.em_andamento}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Em Andamento</div>
            </CardContent>
          </Card>

          <Card className={cn("cursor-pointer transition-all hover:shadow-md border-l-4 bg-card dark:bg-card", activeFilter === 'resolvido' ? 'ring-2 ring-green-500 border-l-green-500 bg-green-50 dark:bg-green-900/20' : 'border-l-green-400 hover:border-l-green-500')} onClick={() => setActiveFilter(activeFilter === 'resolvido' ? 'all' : 'resolvido')}>
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-green-500 dark:text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">{cardCounts.resolvido}</div>
              <div className="text-sm text-green-600 dark:text-green-400">Resolvidos</div>
            </CardContent>
          </Card>

          <Card className={cn("cursor-pointer transition-all hover:shadow-md border-l-4 bg-card dark:bg-card", activeFilter === 'fechado' ? 'ring-2 ring-gray-500 border-l-gray-500 bg-gray-50 dark:bg-gray-800' : 'border-l-gray-400 hover:border-l-gray-500')} onClick={() => setActiveFilter(activeFilter === 'fechado' ? 'all' : 'fechado')}>
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{cardCounts.fechado}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Fechados</div>
            </CardContent>
          </Card>

          <Card className={cn("cursor-pointer transition-all hover:shadow-md border-l-4 bg-card dark:bg-card", activeFilter === 'atrasado' ? 'ring-2 ring-red-500 border-l-red-500 bg-red-50 dark:bg-red-900/20' : 'border-l-red-400 hover:border-l-red-500')} onClick={() => setActiveFilter(activeFilter === 'atrasado' ? 'all' : 'atrasado')}>
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400" />
              </div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">{cardCounts.atrasado}</div>
              <div className="text-sm text-red-600 dark:text-red-400">Atrasados</div>
            </CardContent>
          </Card>

          <Card className={cn("cursor-pointer transition-all hover:shadow-md border-l-4 bg-card dark:bg-card", activeFilter === 'critico' ? 'ring-2 ring-red-600 border-l-red-600 bg-red-50 dark:bg-red-900/20' : 'border-l-red-500 hover:border-l-red-600')} onClick={() => setActiveFilter(activeFilter === 'critico' ? 'all' : 'critico')}>
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <Flag className="h-6 w-6 text-red-600 dark:text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-800 dark:text-red-300">
                {ticketsWithStatus.filter(t => t.nivel_criticidade === 'P0').length}
              </div>
              <div className="text-sm text-red-700 dark:text-red-400">Críticos</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            
            
            {/* Link para Kanban separado */}
            
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground dark:text-muted-foreground">
            <span className="mx-0 px-0 my-[5px] py-0 text-base text-center">
              {filteredTicketsWithStatus.length} de {optimizedTickets.length} tickets
            </span>
            {(searchTerm || activeFilter !== 'all' || setorFilter !== 'all') && <Button variant="ghost" size="sm" onClick={() => {
            setSearchTerm('');
            setActiveFilter('all');
            setSetorFilter('all');
            setShowSuggestions(false);
          }} className="text-xs">
                Limpar filtros
              </Button>}
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {loading ? <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground dark:text-muted-foreground">Carregando tickets...</p>
            </div> : filteredTicketsWithStatus.length === 0 ? <Card className="border-dashed bg-card dark:bg-card">
              <CardContent className="p-8 text-center">
                <InboxIcon className="h-12 w-12 text-muted-foreground dark:text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">
                  {searchTerm || activeFilter !== 'all' || setorFilter !== 'all' ? 'Nenhum ticket encontrado' : 'Nenhum ticket cadastrado'}
                </h3>
                <p className="text-muted-foreground dark:text-muted-foreground">
                  {searchTerm || activeFilter !== 'all' || setorFilter !== 'all' ? 'Tente ajustar os filtros de busca.' : 'Quando houver tickets, eles aparecerão aqui.'}
                </p>
              </CardContent>
            </Card> : filteredTicketsWithStatus.map(ticket => <JiraTicketCard key={ticket.id} ticket={ticket} onOpenDetail={handleOpenTicketDetail} onEditTicket={handleEditTicket} onDeleteTicket={handleDeleteTicket} userCanEdit={canEdit} userCanDelete={canDelete} />)}
        </div>

        {/* Modals */}
        <TicketDetailModal sla={selectedTicket} isOpen={modalOpen} onClose={handleCloseModal} onUpdate={handleTicketUpdate} setSelectedSLA={handleUpdateSelectedTicket} />

        <TicketEditModal ticket={selectedTicketForEdit} isOpen={editModalOpen} onClose={handleCloseEditModal} onUpdate={handleTicketUpdate} />

        <TicketDeleteModal ticket={selectedTicketForDelete} isOpen={deleteModalOpen} onClose={handleCloseDeleteModal} onDelete={handleTicketUpdate} />
      </div>
    </div>;
}