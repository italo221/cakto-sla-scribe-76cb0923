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
import SupabaseStatus from "@/components/SupabaseStatus";
import { TicketCountdown } from "@/components/TicketCountdown";
import { useTicketCountdown } from "@/hooks/useTicketCountdown";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import TicketKanban from "@/components/TicketKanban";
import JiraTicketCard from "@/components/JiraTicketCard";
import { useAuth } from "@/hooks/useAuth";
import { useTicketStatus, useTicketFilters, validateStatusChange, type TicketStatusType } from "@/hooks/useTicketStatus";
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTicketForEdit, setSelectedTicketForEdit] = useState<Ticket | null>(null);
  const [selectedTicketForDelete, setSelectedTicketForDelete] = useState<Ticket | null>(null);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');
  const [favoriteFilters, setFavoriteFilters] = useState<string[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  
  const { user, canEdit, isSuperAdmin } = useAuth();
  const [userRole, setUserRole] = useState<string>('viewer');
  const { toast } = useToast();

  useEffect(() => {
    loadTickets();
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
          'aberto': 3,
          'em_andamento': 2, 
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
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            textColor: 'text-red-800 dark:text-red-200',
            borderColor: 'border-red-200 dark:border-red-800',
            icon: AlertTriangle,
            canEdit: userCanEdit
          };
        }

        // Status normal com cores ajustadas para modo escuro
        const statusConfig = {
          'aberto': {
            displayStatus: 'Aberto',
            color: 'bg-slate-400 dark:bg-slate-500',
            bgColor: 'bg-slate-50 dark:bg-slate-800',
            textColor: 'text-slate-700 dark:text-slate-100',
            borderColor: 'border-slate-300 dark:border-slate-600',
            icon: Circle
          },
          'em_andamento': {
            displayStatus: 'Em Andamento',
            color: 'bg-blue-500 dark:bg-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            textColor: 'text-blue-800 dark:text-blue-200',
            borderColor: 'border-blue-200 dark:border-blue-700',
            icon: Activity
          },
          'resolvido': {
            displayStatus: 'Resolvido',
            color: 'bg-green-500 dark:bg-green-400',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            textColor: 'text-green-800 dark:text-green-200',
            borderColor: 'border-green-200 dark:border-green-700',
            icon: CheckCircle
          },
          'fechado': {
            displayStatus: 'Fechado',
            color: 'bg-gray-500 dark:bg-gray-400',
            bgColor: 'bg-gray-100 dark:bg-gray-800',
            textColor: 'text-gray-600 dark:text-gray-300',
            borderColor: 'border-gray-300 dark:border-gray-600',
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

    // Filtro por status - CORREÇÃO COMPLETA: Cada status mostra APENAS seus próprios tickets
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => {
        const ticketStatus = ticket.status?.toString()?.trim()?.toLowerCase();
        const filterStatus = statusFilter?.toString()?.trim()?.toLowerCase();
        
        // Filtro especial para tickets atrasados
        if (filterStatus === 'atrasado') {
          return ticket.statusInfo.isExpired;
        }
        
        // Para outros status, mostrar APENAS tickets com aquele status E que NÃO estejam atrasados
        return ticketStatus === filterStatus && !ticket.statusInfo.isExpired;
      });
    }

    // Filtro específico para mostrar apenas tickets atrasados (usado pelos cards de estatística)
    if (showOnlyExpired) {
      filtered = filtered.filter(ticket => ticket.statusInfo.isExpired);
    }

    // Filtro por criticidade
    if (criticalityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.nivel_criticidade === criticalityFilter);
    }

    // Filtro por setor - FONTE DA VERDADE: time_responsavel (campo obrigatório)
    if (setorFilter !== 'all') {
      filtered = filtered.filter(ticket => {
        const setorSelecionado = setores.find(s => s.id === setorFilter);
        if (!setorSelecionado) return false;
        
        // Comparação estrita: time_responsavel deve ser exatamente igual ao nome do setor
        const timeResponsavel = ticket.time_responsavel?.trim();
        const nomeSetor = setorSelecionado.nome?.trim();
        
        return timeResponsavel === nomeSetor;
      });
    }

    return filtered;
  }, [ticketsWithStatus, searchTerm, statusFilter, criticalityFilter, setorFilter, showOnlyExpired]);

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
      // Contar tickets atrasados
      if (ticket.statusInfo.isExpired) {
        counts.atrasado++;
      }
      
      // Contar por status (apenas tickets NÃO atrasados para os status normais)
      if (!ticket.statusInfo.isExpired) {
        const status = ticket.status?.toString()?.trim()?.toLowerCase();
        if (status === 'aberto') counts.aberto++;
        else if (status === 'em_andamento') counts.em_andamento++;
        else if (status === 'resolvido') counts.resolvido++;
        else if (status === 'fechado') counts.fechado++;
      }
    });

    return counts;
  }, [ticketsWithStatus]);

  // Contagem de tickets por setor baseada em time_responsavel
  const setorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    setores.forEach(setor => {
      counts[setor.id] = ticketsWithStatus.filter(ticket => {
        // Usar apenas time_responsavel como fonte da verdade
        const timeResponsavel = ticket.time_responsavel?.trim();
        const nomeSetor = setor.nome?.trim();
        
        return timeResponsavel === nomeSetor;
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
      return (
        <div className="flex items-center gap-1">
          <Badge className={`${ticketWithStatus.statusInfo.bgColor} ${ticketWithStatus.statusInfo.textColor} ${ticketWithStatus.statusInfo.borderColor} flex items-center gap-1 border font-medium border-l-4 border-l-slate-400 dark:border-l-slate-500`}>
            <Icon size={12} />
            Aberto
          </Badge>
          <Badge className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800 flex items-center gap-1 border font-medium">
            <AlertTriangle size={12} />
            Atrasado
          </Badge>
        </div>
      );
    }

    // Badge normal com borda lateral especial para tickets "Em Aberto"
    const borderClass = isAberto ? 'border-l-4 border-l-slate-400 dark:border-l-slate-500' : '';
    
    return (
      <Badge className={`${ticketWithStatus.statusInfo.bgColor} ${ticketWithStatus.statusInfo.textColor} ${ticketWithStatus.statusInfo.borderColor} flex items-center gap-1 border font-medium ${borderClass}`}>
        <Icon size={12} />
        {ticketWithStatus.statusInfo.displayStatus}
        {/* Spinner especial para "Em Andamento" */}
        {ticketWithStatus.status === 'em_andamento' && !ticketWithStatus.statusInfo.isExpired && (
          <Clock className="ml-1 h-3 w-3 animate-pulse text-blue-600 dark:text-blue-400" />
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
    loadTickets();
    toast({
      title: "Ticket atualizado",
      description: "O ticket foi atualizado com sucesso.",
    });
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-background dark:bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <SupabaseStatus />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground dark:text-foreground">
      <Navigation />
      
      <div className="container mx-auto p-6 space-y-6">
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
          
          <Button onClick={loadTickets} variant="outline" className="gap-2">
            <Activity className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-card dark:bg-card rounded-lg border border-border dark:border-border p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por título, descrição, solicitante ou tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background dark:bg-background text-foreground dark:text-foreground border-border dark:border-border"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-background dark:bg-background text-foreground dark:text-foreground border-border dark:border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background dark:bg-background border-border dark:border-border">
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                  <SelectItem value="atrasado">Atrasados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
                <SelectTrigger className="w-[120px] bg-background dark:bg-background text-foreground dark:text-foreground border-border dark:border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background dark:bg-background border-border dark:border-border">
                  <SelectItem value="all">Criticidade</SelectItem>
                  <SelectItem value="P0">P0 - Crítico</SelectItem>
                  <SelectItem value="P1">P1 - Alto</SelectItem>
                  <SelectItem value="P2">P2 - Médio</SelectItem>
                  <SelectItem value="P3">P3 - Baixo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={setorFilter} onValueChange={setSetorFilter}>
                <SelectTrigger className="w-[160px] bg-background dark:bg-background text-foreground dark:text-foreground border-border dark:border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background dark:bg-background border-border dark:border-border">
                  <SelectItem value="all">Todos Setores</SelectItem>
                  {setores.map((setor) => (
                    <SelectItem key={setor.id} value={setor.id}>
                      {setor.nome} ({setorCounts[setor.id] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-l-4 bg-card dark:bg-card",
              statusFilter === 'aberto' ? 'ring-2 ring-slate-500 border-l-slate-500 bg-slate-50 dark:bg-slate-800' : 'border-l-slate-400 hover:border-l-slate-500'
            )}
            onClick={() => {
              setStatusFilter(statusFilter === 'aberto' ? 'all' : 'aberto');
              setShowOnlyExpired(false);
            }}
          >
            <CardContent className="p-4 text-center">
              <Circle className="h-6 w-6 mx-auto mb-2 text-slate-400 dark:text-slate-300" />
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-100">{cardCounts.aberto}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">Abertos</div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-l-4 bg-card dark:bg-card",
              statusFilter === 'em_andamento' ? 'ring-2 ring-blue-500 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-l-blue-400 hover:border-l-blue-500'
            )}
            onClick={() => {
              setStatusFilter(statusFilter === 'em_andamento' ? 'all' : 'em_andamento');
              setShowOnlyExpired(false);
            }}
          >
            <CardContent className="p-4 text-center">
              <Activity className="h-6 w-6 mx-auto mb-2 text-blue-500 dark:text-blue-400" />
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{cardCounts.em_andamento}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Em Andamento</div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-l-4 bg-card dark:bg-card",
              statusFilter === 'resolvido' ? 'ring-2 ring-green-500 border-l-green-500 bg-green-50 dark:bg-green-900/20' : 'border-l-green-400 hover:border-l-green-500'
            )}
            onClick={() => {
              setStatusFilter(statusFilter === 'resolvido' ? 'all' : 'resolvido');
              setShowOnlyExpired(false);
            }}
          >
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500 dark:text-green-400" />
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">{cardCounts.resolvido}</div>
              <div className="text-sm text-green-600 dark:text-green-400">Resolvidos</div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-l-4 bg-card dark:bg-card",
              statusFilter === 'fechado' ? 'ring-2 ring-gray-500 border-l-gray-500 bg-gray-50 dark:bg-gray-800' : 'border-l-gray-400 hover:border-l-gray-500'
            )}
            onClick={() => {
              setStatusFilter(statusFilter === 'fechado' ? 'all' : 'fechado');
              setShowOnlyExpired(false);
            }}
          >
            <CardContent className="p-4 text-center">
              <X className="h-6 w-6 mx-auto mb-2 text-gray-500 dark:text-gray-400" />
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{cardCounts.fechado}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Fechados</div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-l-4 bg-card dark:bg-card",
              statusFilter === 'atrasado' ? 'ring-2 ring-red-500 border-l-red-500 bg-red-50 dark:bg-red-900/20' : 'border-l-red-400 hover:border-l-red-500'
            )}
            onClick={() => {
              setStatusFilter(statusFilter === 'atrasado' ? 'all' : 'atrasado');
              setShowOnlyExpired(true);
            }}
          >
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-500 dark:text-red-400" />
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">{cardCounts.atrasado}</div>
              <div className="text-sm text-red-600 dark:text-red-400">Atrasados</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'detailed' ? 'compact' : 'detailed')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              {viewMode === 'detailed' ? 'Visão Compacta' : 'Visão Detalhada'}
            </Button>
            
            {/* Link para Kanban separado */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/kanban'}
              className="gap-2"
            >
              <Columns3 className="h-4 w-4" />
              Ver Kanban
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground dark:text-muted-foreground">
            <span>
              {filteredTicketsWithStatus.length} de {tickets.length} tickets
            </span>
            {(searchTerm || statusFilter !== 'all' || criticalityFilter !== 'all' || setorFilter !== 'all') && (
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
                className="text-xs"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground dark:text-muted-foreground">Carregando tickets...</p>
            </div>
          ) : filteredTicketsWithStatus.length === 0 ? (
            <Card className="border-dashed bg-card dark:bg-card">
              <CardContent className="p-8 text-center">
                <InboxIcon className="h-12 w-12 text-muted-foreground dark:text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">
                  {searchTerm || statusFilter !== 'all' || criticalityFilter !== 'all' || setorFilter !== 'all' 
                    ? 'Nenhum ticket encontrado' 
                    : 'Nenhum ticket cadastrado'
                  }
                </h3>
                <p className="text-muted-foreground dark:text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || criticalityFilter !== 'all' || setorFilter !== 'all'
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Quando houver tickets, eles aparecerão aqui.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTicketsWithStatus.map((ticket) => (
              <JiraTicketCard
                key={ticket.id}
                ticket={ticket}
                ticketWithStatus={ticket}
                onOpenDetail={handleOpenTicketDetail}
                onEdit={handleEditTicket}
                onDelete={handleDeleteTicket}
                getCriticalityBadge={getCriticalityBadge}
                getStatusBadge={getStatusBadge}
                getTempoMedioResolucao={getTempoMedioResolucao}
                viewMode={viewMode}
                currentUser={user}
                canEdit={canEdit}
                userRole={userRole}
              />
            ))
          )}
        </div>

        {/* Modals */}
        <TicketDetailModal
          sla={selectedTicket}
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onUpdate={handleTicketUpdate}
          setSelectedSLA={setSelectedTicket}
        />

        <TicketEditModal
          ticket={selectedTicketForEdit}
          isOpen={editModalOpen}
          onClose={handleCloseEditModal}
          onUpdate={handleTicketUpdate}
        />

        <TicketDeleteModal
          ticket={selectedTicketForDelete}
          isOpen={deleteModalOpen}
          onClose={handleCloseDeleteModal}
          onUpdate={handleTicketUpdate}
        />
      </div>
    </div>
  );
}