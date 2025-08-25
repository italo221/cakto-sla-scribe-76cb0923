import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, 
  SortAsc, 
  Users, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  MoreHorizontal,
  Search,
  X,
  Trash2,
  SlidersHorizontal,
  Pin,
  Target,
  GripVertical,
  Download,
  Layers
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import { ptBR } from "date-fns/locale";
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useTags } from '@/hooks/useTags';
import { toast } from '@/hooks/use-toast';
import TicketDetailModal from "@/components/TicketDetailModal";

interface TeamMetrics {
  total_tickets: number;
  tickets_abertos: number;
  tickets_em_andamento: number;
  tickets_resolvidos: number;
  avg_time_to_start_hours: number;
  avg_resolution_time_hours: number;
  sla_compliance_rate: number;
}

interface TeamTicket {
  id: string;
  ticket_number: string;
  titulo: string;
  time_responsavel: string;
  solicitante: string;
  descricao: string;
  responsavel_interno?: string;
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
  setor_id?: string;
  prazo_interno?: string;
  prioridade_operacional?: string;
  tags?: string[];
  age_days: number;
  is_overdue: boolean;
  sla_comentarios_internos?: Array<{ comentario: string }>;
}

interface Setor {
  id: string;
  nome: string;
}

// Sortable Ticket Item Component
function SortableTicketItem({ ticket, onTicketClick, onUnpinClick, isPinned }: {
  ticket: TeamTicket;
  onTicketClick: (ticket: TeamTicket) => void;
  onUnpinClick: (ticketId: string) => void;
  isPinned: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'P0': return 'bg-red-500 text-white';
      case 'P1': return 'bg-orange-500 text-white';
      case 'P2': return 'bg-yellow-500 text-white';
      case 'P3': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'aberto': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'em_andamento': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'resolvido': return 'bg-green-100 text-green-800 border-green-300';
      case 'fechado': return 'bg-slate-100 text-slate-800 border-slate-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'aberto': 'Aberto',
      'em_andamento': 'Em Andamento',
      'resolvido': 'Resolvido',
      'fechado': 'Fechado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all duration-200 relative",
        "hover:shadow-sm hover:bg-muted/50",
        isDragging && "opacity-50 z-10",
        isPinned && "bg-primary/5 border-primary/20"
      )}
    >
      {/* Drag Handle for pinned tickets */}
      {isPinned && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <div 
        className={cn("flex items-start gap-3", isPinned && "ml-6")}
        onClick={() => onTicketClick(ticket)}
      >
        {/* Priority Badge */}
        <Badge className={cn("shrink-0 text-xs", getPriorityBadgeColor(ticket.nivel_criticidade))}>
          {ticket.nivel_criticidade}
        </Badge>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{ticket.titulo}</h4>
              <div className="text-xs text-muted-foreground mt-1 space-x-1">
                <span>{ticket.ticket_number}</span>
                <span>•</span>
                <span>{ticket.solicitante}</span>
                {ticket.setor_id && (
                  <>
                    <span>•</span>
                    <span>Setor</span>
                  </>
                )}
              </div>
              
              {/* Tags */}
              {ticket.tags && ticket.tags.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {ticket.tags.slice(0, 2).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {ticket.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{ticket.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
              {/* SLA Warning */}
              {ticket.is_overdue && (
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>SLA em atraso</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Pin Icon */}
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpinClick(ticket.id);
                    }}
                  >
                    <Pin className={cn("h-3 w-3", isPinned ? "fill-current text-primary" : "text-muted-foreground")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isPinned ? "Desafixar" : "Fixar"}</p>
                </TooltipContent>
              </Tooltip>

              {/* Status and Time */}
              <div className="text-right">
                <Badge className={cn("text-xs mb-1", getStatusBadgeColor(ticket.status))}>
                  {getStatusLabel(ticket.status)}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(ticket.data_criacao), { addSuffix: true, locale: ptBR })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Time() {
  const { user, isSuperAdmin } = useAuth();
  const { userSetores } = usePermissions();
  const { allTags } = useTags();
  
  const [selectedSetor, setSelectedSetor] = useState<string>('');
  const [selectedSetores, setSelectedSetores] = useState<string[]>([]);
  const [allTeamsSelected, setAllTeamsSelected] = useState(true);
  const [groupByTeam, setGroupByTeam] = useState(false);
  const [dateRange, setDateRange] = useState('30');
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('priority');
  const [showOnlyMyTickets, setShowOnlyMyTickets] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [setores, setSetores] = useState<Setor[]>([]);
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [tickets, setTickets] = useState<TeamTicket[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [selectedTicket, setSelectedTicket] = useState<TeamTicket | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Responsive filter sidebar
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  
  // Pinned tickets states
  const [pinnedTickets, setPinnedTickets] = useState<string[]>([]);
  const [showOnlyPinned, setShowOnlyPinned] = useState(false);
  const [pinnedLoading, setPinnedLoading] = useState(false);

  // Carregar setores
  useEffect(() => {
    const loadSetores = async () => {
      try {
        const { data, error } = await supabase
          .from('setores')
          .select('id, nome')
          .eq('ativo', true);
        
        if (error) throw error;
        setSetores(data || []);
        
        // Tentar restaurar seleção salva no localStorage
        const savedSelection = localStorage.getItem('time-page-team-selection');
        const savedAllTeamsSelected = localStorage.getItem('time-page-all-teams-selected');
        
        if (savedSelection && savedAllTeamsSelected !== null) {
          // Restaurar seleção salva
          const parsedSelection = JSON.parse(savedSelection);
          const parsedAllTeams = JSON.parse(savedAllTeamsSelected);
          
          // Verificar se os setores salvos ainda existem
          const validSetorIds = (data || []).map(s => s.id);
          const validSelection = parsedSelection.filter((id: string) => validSetorIds.includes(id));
          
          if (validSelection.length > 0) {
            setSelectedSetores(validSelection);
            setAllTeamsSelected(parsedAllTeams);
          } else {
            // Se nenhum setor salvo é válido, usar configuração padrão
            setDefaultSelection(data || []);
          }
        } else {
          // Configuração inicial padrão
          setDefaultSelection(data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar setores:', error);
      }
    };
    
    const setDefaultSelection = (setoresData: Setor[]) => {
      if (isSuperAdmin) {
        // Super admin: "Todos os times" por padrão
        setAllTeamsSelected(true);
        setSelectedSetores(setoresData.map(s => s.id));
      } else if (userSetores.length > 0) {
        // Usuário comum: apenas seus setores
        const userSetorIds = userSetores.map(us => us.setor?.id).filter(Boolean) as string[];
        setSelectedSetores(userSetorIds);
        setAllTeamsSelected(false);
        // Para compatibilidade com código existente
        if (userSetorIds.length > 0) {
          setSelectedSetor(userSetorIds[0]);
        }
      }
    };
    
    if (user) {
      loadSetores();
    }
  }, [user, isSuperAdmin, userSetores]);

  // Salvar seleção de times no localStorage sempre que mudar
  useEffect(() => {
    if (selectedSetores.length > 0) {
      localStorage.setItem('time-page-team-selection', JSON.stringify(selectedSetores));
      localStorage.setItem('time-page-all-teams-selected', JSON.stringify(allTeamsSelected));
    }
  }, [selectedSetores, allTeamsSelected]);

  // Carregar métricas
  useEffect(() => {
    const loadMetrics = async () => {
      if (selectedSetores.length === 0) return;
      
      setLoading(true);
      try {
        const dateFrom = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
        const dateTo = format(new Date(), 'yyyy-MM-dd');
        
        // Para Super Admin com "Todos os times", não enviar setor_ids (busca todos)
        const sectorIds = isSuperAdmin && allTeamsSelected ? undefined : selectedSetores;
        
        const { data, error } = await supabase.rpc('team_metrics', {
          date_from: dateFrom,
          date_to: dateTo,
          setor_ids: sectorIds
        });
        
        if (error) throw error;
        if (data && typeof data === 'object') {
          setMetrics(data as unknown as TeamMetrics);
        }
      } catch (error) {
        console.error('Erro ao carregar métricas:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar métricas do time",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadMetrics();
  }, [selectedSetores, dateRange, isSuperAdmin, allTeamsSelected]);

  // Carregar tickets
  useEffect(() => {
    const loadTickets = async () => {
      if (selectedSetores.length === 0) return;
      
      try {
        let query = supabase
          .from('sla_demandas')
          .select(`
            id,
            ticket_number,
            titulo,
            time_responsavel,
            solicitante,
            descricao,
            responsavel_interno,
            status,
            nivel_criticidade,
            pontuacao_total,
            pontuacao_financeiro,
            pontuacao_cliente,
            pontuacao_reputacao,
            pontuacao_urgencia,
            pontuacao_operacional,
            data_criacao,
            observacoes,
            setor_id,
            prazo_interno,
            prioridade_operacional,
            tags,
            setores(nome),
            sla_comentarios_internos(comentario)
          `);

        // Filtro por setores selecionados (apenas se não for "Todos os times")
        if (!isSuperAdmin || !allTeamsSelected) {
          query = query.in('setor_id', selectedSetores);
        }

        // Aplicar filtros
        if (priorityFilter.length > 0) {
          query = query.in('nivel_criticidade', priorityFilter);
        }
        
        if (statusFilter.length > 0) {
          query = query.in('status', statusFilter);
        }
        
        if (showOnlyMyTickets && user) {
          query = query.or(`solicitante.eq.${user.email},responsavel_interno.eq.${user.email}`);
        }

        const { data, error } = await query.order('data_criacao', { ascending: false });
        
        if (error) throw error;
        
        // Processar dados
        const processedTickets: TeamTicket[] = (data || []).map(ticket => ({
          ...ticket,
          time_responsavel: ticket.time_responsavel || 'Não definido',
          descricao: ticket.descricao || '',
          pontuacao_total: ticket.pontuacao_total || 0,
          pontuacao_financeiro: ticket.pontuacao_financeiro || 0,
          pontuacao_cliente: ticket.pontuacao_cliente || 0,
          pontuacao_reputacao: ticket.pontuacao_reputacao || 0,
          pontuacao_urgencia: ticket.pontuacao_urgencia || 0,
          pontuacao_operacional: ticket.pontuacao_operacional || 0,
          age_days: Math.floor((new Date().getTime() - new Date(ticket.data_criacao).getTime()) / (1000 * 60 * 60 * 24)),
          is_overdue: ticket.prazo_interno ? new Date(ticket.prazo_interno) < new Date() && !['resolvido', 'fechado'].includes(ticket.status) : false
        }));
        
        setTickets(processedTickets);
      } catch (error) {
        console.error('Erro ao carregar tickets:', error);
      }
    };
    
    loadTickets();
  }, [selectedSetores, priorityFilter, statusFilter, showOnlyMyTickets, user, isSuperAdmin, allTeamsSelected]);

  // Filtrar setores baseado nas permissões
  const availableSetores = useMemo(() => {
    if (isSuperAdmin) {
      return setores;
    }
    return setores.filter(setor => 
      userSetores.some(us => us.setor?.id === setor.id)
    );
  }, [setores, userSetores, isSuperAdmin]);

  // Multi-select handlers para Super Admin
  const handleTeamSelection = (setorId: string, checked: boolean) => {
    if (checked) {
      // Se "Todos os times" estiver selecionado, selecionar apenas este time
      if (allTeamsSelected) {
        setSelectedSetores([setorId]);
        setAllTeamsSelected(false);
      } else {
        // Adicionar este time à seleção existente
        const newSelection = [...selectedSetores, setorId];
        setSelectedSetores(newSelection);
        
        // Verificar se todos estão selecionados
        if (newSelection.length === availableSetores.length) {
          setAllTeamsSelected(true);
        }
      }
    } else {
      // Remover este time da seleção
      const newSelection = selectedSetores.filter(id => id !== setorId);
      
      // Se não sobrar nenhum selecionado, voltar para "Todos os times"
      if (newSelection.length === 0) {
        setSelectedSetores(availableSetores.map(s => s.id));
        setAllTeamsSelected(true);
      } else {
        setSelectedSetores(newSelection);
        setAllTeamsSelected(false);
      }
    }
  };

  const handleAllTeamsToggle = (checked: boolean) => {
    setAllTeamsSelected(checked);
    if (checked) {
      setSelectedSetores(availableSetores.map(s => s.id));
    } else {
      setSelectedSetores([]);
    }
    
    // Salvar explicitamente no localStorage quando o usuário faz uma ação manual
    if (isSuperAdmin) {
      localStorage.setItem('time-page-team-selection', JSON.stringify(checked ? availableSetores.map(s => s.id) : []));
      localStorage.setItem('time-page-all-teams-selected', JSON.stringify(checked));
    }
  };

  // Exportar CSV
  const exportToCSV = () => {
    // Aplicar mesmos filtros da lista
    let filteredTickets = [...tickets];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredTickets = filteredTickets.filter(ticket => {
        // Buscar nos campos do ticket
        const ticketMatch = 
          ticket.titulo.toLowerCase().includes(term) ||
          ticket.ticket_number.toLowerCase().includes(term) ||
          ticket.solicitante.toLowerCase().includes(term) ||
          (ticket.descricao && ticket.descricao.toLowerCase().includes(term)) ||
          (ticket.observacoes && ticket.observacoes.toLowerCase().includes(term)) ||
          (ticket.tags || []).some(tag => tag.toLowerCase().includes(term));
        
        // Buscar nos comentários
        const commentsMatch = ticket.sla_comentarios_internos && 
          ticket.sla_comentarios_internos.some(comment => 
            comment.comentario && comment.comentario.toLowerCase().includes(term)
          );
        
        return ticketMatch || commentsMatch;
      });
    }
    
    if (priorityFilter.length > 0) {
      filteredTickets = filteredTickets.filter(ticket => priorityFilter.includes(ticket.nivel_criticidade));
    }
    
    if (statusFilter.length > 0) {
      filteredTickets = filteredTickets.filter(ticket => statusFilter.includes(ticket.status));
    }
    
    if (tagFilter.length > 0) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.tags && tagFilter.some(tag => ticket.tags!.includes(tag))
      );
    }

    // Criar CSV
    const headers = [
      'Número',
      'Título', 
      'Time',
      'Solicitante',
      'Status',
      'Prioridade',
      'Data Criação',
      'Atrasado'
    ].join(',');

    const rows = filteredTickets.map(ticket => [
      ticket.ticket_number,
      `"${ticket.titulo.replace(/"/g, '""')}"`,
      `"${ticket.time_responsavel.replace(/"/g, '""')}"`,
      `"${ticket.solicitante.replace(/"/g, '""')}"`,
      ticket.status,
      ticket.nivel_criticidade,
      format(new Date(ticket.data_criacao), 'dd/MM/yyyy HH:mm'),
      ticket.is_overdue ? 'Sim' : 'Não'
    ].join(','));

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tickets-time-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  // Separar e filtrar tickets
  const { pinnedTicketsData, regularTicketsData, groupedTicketsData } = useMemo(() => {
    let allFiltered = [...tickets];
    
    // Aplicar busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      allFiltered = allFiltered.filter(ticket => {
        // Buscar nos campos do ticket
        const ticketMatch = 
          ticket.titulo.toLowerCase().includes(term) ||
          ticket.ticket_number.toLowerCase().includes(term) ||
          ticket.solicitante.toLowerCase().includes(term) ||
          (ticket.descricao && ticket.descricao.toLowerCase().includes(term)) ||
          (ticket.observacoes && ticket.observacoes.toLowerCase().includes(term)) ||
          (ticket.tags || []).some(tag => tag.toLowerCase().includes(term));
        
        // Buscar nos comentários
        const commentsMatch = ticket.sla_comentarios_internos && 
          ticket.sla_comentarios_internos.some((comment: any) => 
            comment.comentario && comment.comentario.toLowerCase().includes(term)
          );
        
        return ticketMatch || commentsMatch;
      });
    }
    
    // Aplicar filtros de prioridade
    if (priorityFilter.length > 0) {
      allFiltered = allFiltered.filter(ticket => priorityFilter.includes(ticket.nivel_criticidade));
    }
    
    // Aplicar filtros de status
    if (statusFilter.length > 0) {
      allFiltered = allFiltered.filter(ticket => statusFilter.includes(ticket.status));
    }
    
    // Aplicar filtros de tags
    if (tagFilter.length > 0) {
      allFiltered = allFiltered.filter(ticket => 
        ticket.tags && tagFilter.some(tag => ticket.tags!.includes(tag))
      );
    }
    
    // Separar tickets fixados
    const pinned = pinnedTickets
      .map(pinnedId => allFiltered.find(t => t.id === pinnedId))
      .filter(Boolean) as TeamTicket[];
    
    // Tickets regulares (excluir os fixados)
    const regular = allFiltered.filter(ticket => !pinnedTickets.includes(ticket.id));
    
    // Aplicar ordenação apenas aos tickets regulares
    const sortTickets = (ticketList: TeamTicket[]) => {
      const sorted = [...ticketList];
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };
          sorted.sort((a, b) => 
            (priorityOrder[a.nivel_criticidade as keyof typeof priorityOrder] || 4) - 
            (priorityOrder[b.nivel_criticidade as keyof typeof priorityOrder] || 4)
          );
          break;
        case 'oldest':
          sorted.sort((a, b) => new Date(a.data_criacao).getTime() - new Date(b.data_criacao).getTime());
          break;
        case 'newest':
          sorted.sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime());
          break;
        case 'sla':
          sorted.sort((a, b) => {
            if (a.is_overdue && !b.is_overdue) return -1;
            if (!a.is_overdue && b.is_overdue) return 1;
            return 0;
          });
          break;
      }
      return sorted;
    };
    
    const sortedRegular = sortTickets(regular);
    
    // Agrupamento por time (apenas se o toggle estiver ativo)
    let grouped: Record<string, { setor: Setor; tickets: TeamTicket[]; pinnedTickets: TeamTicket[] }> = {};
    if (groupByTeam && isSuperAdmin) {
      // Criar grupos por setor
      const allTicketsForGrouping = [...pinned, ...sortedRegular];
      
      allTicketsForGrouping.forEach(ticket => {
        if (!ticket.setor_id) return;
        
        const setor = availableSetores.find(s => s.id === ticket.setor_id);
        if (!setor) return;
        
        if (!grouped[ticket.setor_id]) {
          grouped[ticket.setor_id] = {
            setor,
            tickets: [],
            pinnedTickets: []
          };
        }
        
        if (pinnedTickets.includes(ticket.id)) {
          grouped[ticket.setor_id].pinnedTickets.push(ticket);
        } else {
          grouped[ticket.setor_id].tickets.push(ticket);
        }
      });
      
      // Ordenar dentro de cada grupo
      Object.values(grouped).forEach(group => {
        group.tickets = sortTickets(group.tickets);
      });
    }
    
    return {
      pinnedTicketsData: pinned,
      regularTicketsData: sortedRegular,
      groupedTicketsData: grouped
    };
  }, [tickets, searchTerm, priorityFilter, statusFilter, tagFilter, sortBy, pinnedTickets, groupByTeam, isSuperAdmin, availableSetores]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setPriorityFilter([]);
    setStatusFilter([]);
    setTagFilter([]);
    setSortBy('priority');
    setShowOnlyMyTickets(false);
  };

  // Pinned tickets functions
  const loadPinnedTickets = useCallback(async () => {
    // Para múltiplos setores, carregar pins de todos os setores selecionados
    if (selectedSetores.length === 0) return;
    
    try {
      // Se tem múltiplos setores selecionados, carregar pins de todos
      const promises = selectedSetores.map(setorId =>
        supabase
          .from('team_ticket_pins')
          .select('ticket_id, position, team_id')
          .eq('team_id', setorId)
          .order('position')
      );

      const results = await Promise.all(promises);
      const allPins: string[] = [];
      
      results.forEach(({ data, error }) => {
        if (!error && data) {
          allPins.push(...data.map(pin => pin.ticket_id));
        }
      });
      
      setPinnedTickets(allPins);
    } catch (error) {
      console.error('Erro ao carregar tickets fixados:', error);
    }
  }, [selectedSetores]);

  const handlePinTicket = async (ticketId: string) => {
    // Encontrar o setor do ticket para fixar no setor correto
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket?.setor_id) {
      console.error('handlePinTicket: ticket setor_id not found');
      return;
    }
    
    console.log('handlePinTicket: Starting with', { ticketId, setorId: ticket.setor_id });
    
    setPinnedLoading(true);
    try {
      console.log('handlePinTicket: Calling pin_ticket RPC function');
      const { data, error } = await supabase.rpc('pin_ticket', {
        p_team_id: ticket.setor_id,
        p_ticket_id: ticketId
      });
      
      console.log('handlePinTicket: RPC response', { data, error });
      
      if (error) {
        console.error('handlePinTicket: Supabase RPC error', error);
        throw error;
      }
      
      if (data === false) {
        console.log('handlePinTicket: Limit reached');
        toast({
          title: "Limite atingido",
          description: "Limite de 5 fixados por time. Desafixe um para adicionar outro.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('handlePinTicket: Success, reloading pinned tickets');
      await loadPinnedTickets();
      toast({
        title: "Ticket fixado",
        description: "Ticket foi fixado no topo da lista."
      });
    } catch (error) {
      console.error('handlePinTicket: Caught error', error);
      toast({
        title: "Erro",
        description: `Erro ao fixar ticket: ${error.message || error}`,
        variant: "destructive"
      });
    } finally {
      setPinnedLoading(false);
    }
  };

  const handleUnpinTicket = async (ticketId: string) => {
    // Encontrar o setor do ticket para desafixar do setor correto
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket?.setor_id) return;
    
    setPinnedLoading(true);
    try {
      const { error } = await supabase.rpc('unpin_ticket', {
        p_team_id: ticket.setor_id,
        p_ticket_id: ticketId
      });
      
      if (error) throw error;
      
      await loadPinnedTickets();
      toast({
        title: "Ticket desafixado",
        description: "Ticket foi removido dos fixados."
      });
    } catch (error) {
      console.error('Erro ao desafixar ticket:', error);
      toast({
        title: "Erro",
        description: "Erro ao desafixar ticket",
        variant: "destructive"
      });
    } finally {
      setPinnedLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    setPinnedTickets((items) => {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      
      return arrayMove(items, oldIndex, newIndex);
    });
    
    // Persist reorder with debounce
    const reorderedIds = arrayMove(pinnedTickets, 
      pinnedTickets.indexOf(active.id as string), 
      pinnedTickets.indexOf(over.id as string)
    );
    
    try {
      // Para reordenar, usar o primeiro setor selecionado como referência
      const teamId = selectedSetores[0];
      if (!teamId) return;
      
      const { error } = await supabase.rpc('reorder_pins', {
        p_team_id: teamId,
        p_ticket_ids: reorderedIds
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao reordenar pins:', error);
      // Revert on error
      await loadPinnedTickets();
    }
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load pinned tickets when setor changes
  useEffect(() => {
    loadPinnedTickets();
  }, [loadPinnedTickets]);

  const handleTicketClick = (ticket: TeamTicket) => {
    setSelectedTicket(ticket);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedTicket(null);
  };

  const handleTicketUpdate = () => {
    // Recarregar dados após atualização
    const loadTickets = async () => {
      if (selectedSetores.length === 0) return;
      
      try {
        let query = supabase
          .from('sla_demandas')
          .select(`
            id,
            ticket_number,
            titulo,
            time_responsavel,
            solicitante,
            descricao,
            responsavel_interno,
            status,
            nivel_criticidade,
            pontuacao_total,
            pontuacao_financeiro,
            pontuacao_cliente,
            pontuacao_reputacao,
            pontuacao_urgencia,
            pontuacao_operacional,
            data_criacao,
            observacoes,
            setor_id,
            prazo_interno,
            prioridade_operacional,
            tags
          `);

        // Filtro por setores selecionados (apenas se não for "Todos os times")
        if (!isSuperAdmin || !allTeamsSelected) {
          query = query.in('setor_id', selectedSetores);
        }

        // Aplicar filtros
        if (priorityFilter.length > 0) {
          query = query.in('nivel_criticidade', priorityFilter);
        }
        
        if (statusFilter.length > 0) {
          query = query.in('status', statusFilter);
        }
        
        if (showOnlyMyTickets && user) {
          query = query.or(`solicitante.eq.${user.email},responsavel_interno.eq.${user.email}`);
        }

        const { data, error } = await query.order('data_criacao', { ascending: false });
        
        if (error) throw error;
        
        // Processar dados
        const processedTickets: TeamTicket[] = (data || []).map(ticket => ({
          ...ticket,
          time_responsavel: ticket.time_responsavel || 'Não definido',
          descricao: ticket.descricao || '',
          pontuacao_total: ticket.pontuacao_total || 0,
          pontuacao_financeiro: ticket.pontuacao_financeiro || 0,
          pontuacao_cliente: ticket.pontuacao_cliente || 0,
          pontuacao_reputacao: ticket.pontuacao_reputacao || 0,
          pontuacao_urgencia: ticket.pontuacao_urgencia || 0,
          pontuacao_operacional: ticket.pontuacao_operacional || 0,
          age_days: Math.floor((new Date().getTime() - new Date(ticket.data_criacao).getTime()) / (1000 * 60 * 60 * 24)),
          is_overdue: ticket.prazo_interno ? new Date(ticket.prazo_interno) < new Date() && !['resolvido', 'fechado'].includes(ticket.status) : false
        }));
        
        setTickets(processedTickets);
      } catch (error) {
        console.error('Erro ao carregar tickets:', error);
      }
    };
    
    loadTickets();
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'aberto': 'Aberto',
      'em_andamento': 'Em Andamento',
      'resolvido': 'Resolvido',
      'fechado': 'Fechado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  // Filter Sidebar Component
  const FilterSidebar = ({ isMobile = false }) => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Filtros</h3>
        
        {/* Seletor de Times (Multi-select para Super Admin) */}
        {isSuperAdmin ? (
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Times</Label>
              <Button
                variant="ghost" 
                size="sm"
                onClick={exportToCSV}
                className="h-7 px-2"
              >
                <Download className="h-3 w-3 mr-1" />
                CSV
              </Button>
            </div>
            
            {/* Multi-select dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {allTeamsSelected 
                    ? "Todos os times"
                    : selectedSetores.length === 0 
                      ? "Selecione times"
                      : `${selectedSetores.length} selecionados`
                  }
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                {/* Opção "Todos os times" */}
                <DropdownMenuCheckboxItem
                  checked={allTeamsSelected}
                  onCheckedChange={handleAllTeamsToggle}
                  className="font-medium"
                >
                  Todos os times
                </DropdownMenuCheckboxItem>
                <Separator />
                
                {/* Lista de setores */}
                {availableSetores.map(setor => (
                  <DropdownMenuCheckboxItem
                    key={setor.id}
                    checked={selectedSetores.includes(setor.id) && !allTeamsSelected}
                    onCheckedChange={(checked) => handleTeamSelection(setor.id, checked)}
                  >
                    {setor.nome}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Chips dos selecionados */}
            {!allTeamsSelected && selectedSetores.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedSetores.map(setorId => {
                  const setor = availableSetores.find(s => s.id === setorId);
                  return setor ? (
                    <Badge 
                      key={setorId} 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleTeamSelection(setorId, false)}
                    >
                      {setor.nome}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ) : null;
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-xs px-2"
                  onClick={() => setSelectedSetores([])}
                >
                  Limpar
                </Button>
              </div>
            )}

            {/* Toggle "Agrupar por time" */}
            <div className="flex items-center space-x-2">
              <Switch
                id="group-by-team"
                checked={groupByTeam}
                onCheckedChange={setGroupByTeam}
              />
              <Label htmlFor="group-by-team" className="text-sm">
                <Layers className="h-3 w-3 inline mr-1" />
                Agrupar por time
              </Label>
            </div>
          </div>
        ) : (
          /* Seletor único para usuários comuns */
          <div className="space-y-2 mb-4">
            <Label className="text-sm font-medium">Time</Label>
            <Select value={selectedSetor} onValueChange={setSelectedSetor}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um time" />
              </SelectTrigger>
              <SelectContent>
                {availableSetores.map(setor => (
                  <SelectItem key={setor.id} value={setor.id}>
                    {setor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Período */}
        <div className="space-y-2 mb-4">
          <Label className="text-sm font-medium">Período</Label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ordenação */}
        <div className="space-y-2 mb-4">
          <Label className="text-sm font-medium">Ordenar por</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Prioridade</SelectItem>
              <SelectItem value="oldest">Mais antigo</SelectItem>
              <SelectItem value="newest">Mais recente</SelectItem>
              <SelectItem value="sla">Próximo do SLA</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2 mb-4">
          <Label className="text-sm font-medium">Status</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {statusFilter.length > 0 ? `${statusFilter.length} selecionados` : 'Todos os status'}
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              {['aberto', 'em_andamento', 'resolvido', 'fechado'].map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter.includes(status)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setStatusFilter([...statusFilter, status]);
                    } else {
                      setStatusFilter(statusFilter.filter(s => s !== status));
                    }
                  }}
                >
                  {getStatusLabel(status)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Priority Filter */}
        <div className="space-y-2 mb-4">
          <Label className="text-sm font-medium">Prioridade</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {priorityFilter.length > 0 ? `${priorityFilter.length} selecionados` : 'Todas as prioridades'}
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              {['P0', 'P1', 'P2', 'P3'].map(priority => (
                <DropdownMenuCheckboxItem
                  key={priority}
                  checked={priorityFilter.includes(priority)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setPriorityFilter([...priorityFilter, priority]);
                    } else {
                      setPriorityFilter(priorityFilter.filter(p => p !== priority));
                    }
                  }}
                >
                  {priority}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tags Filter */}
        <div className="space-y-2 mb-4">
          <Label className="text-sm font-medium">Tags</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {tagFilter.length > 0 ? `${tagFilter.length} selecionadas` : 'Todas as tags'}
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              {allTags.map(tag => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={tagFilter.includes(tag)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setTagFilter([...tagFilter, tag]);
                    } else {
                      setTagFilter(tagFilter.filter(t => t !== tag));
                    }
                  }}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Toggle "Só meus tickets" */}
        <div className="flex items-center space-x-2 mb-4">
          <Switch
            id="my-tickets"
            checked={showOnlyMyTickets}
            onCheckedChange={setShowOnlyMyTickets}
          />
          <Label htmlFor="my-tickets" className="text-sm">Só meus tickets</Label>
        </div>

        {/* Toggle "Só fixados" */}
        <div className="flex items-center space-x-2 mb-4">
          <Switch
            id="pinned-only"
            checked={showOnlyPinned}
            onCheckedChange={setShowOnlyPinned}
          />
          <Label htmlFor="pinned-only" className="text-sm">Só fixados</Label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button 
          onClick={clearAllFilters} 
          variant="outline" 
          className="w-full"
          size="sm"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Limpar Filtros
        </Button>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Centralized Container */}
        <div className="mx-auto px-6 py-6 pb-12" style={{ maxWidth: 'clamp(1120px, 90vw, 1320px)' }}>
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Time</h1>
                <p className="text-sm text-muted-foreground">Operação e métricas do time</p>
              </div>
              {/* Mobile Filter Toggle */}
              <div className="lg:hidden">
                <Sheet open={isFilterSidebarOpen} onOpenChange={setIsFilterSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filtros
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                      <SheetDescription>
                        Configure os filtros para a lista de tickets
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterSidebar isMobile />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          {/* Search Bar - Full Width */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, número ou solicitante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid lg:grid-cols-[2fr_1fr] gap-7 lg:gap-7">
            {/* Ticket List - Left Column */}
            <div className="min-w-0">
              <ScrollArea 
                className="rounded-lg border bg-card"
                style={{ 
                  height: 'calc(100vh - var(--header-height, 80px) - 120px)',
                  minWidth: '560px',
                  maxWidth: '760px'
                }}
              >
                <div className="space-y-3 p-3">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando tickets...
                    </div>
                  ) : (
                    <>
                      {/* Pinned Tickets Section */}
                      {!showOnlyPinned && pinnedTicketsData.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3 px-2">
                            <Target className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">
                              Fixados ({pinnedTicketsData.length}/5)
                            </h3>
                          </div>
                          
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={pinnedTickets}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2">
                                {pinnedTicketsData.map(ticket => (
                                  <SortableTicketItem
                                    key={ticket.id}
                                    ticket={ticket}
                                    onTicketClick={handleTicketClick}
                                    onUnpinClick={handleUnpinTicket}
                                    isPinned={true}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        </div>
                      )}

                      {/* Regular Tickets, Pinned Only, ou Agrupados por Time */}
                      {showOnlyPinned ? (
                        pinnedTicketsData.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2">Nenhum ticket fixado ainda</p>
                            <p className="text-sm">
                              Clique no ícone de pin em um ticket para destacar aqui.
                            </p>
                          </div>
                        ) : (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={pinnedTickets}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2">
                                {pinnedTicketsData.map(ticket => (
                                  <SortableTicketItem
                                    key={ticket.id}
                                    ticket={ticket}
                                    onTicketClick={handleTicketClick}
                                    onUnpinClick={handleUnpinTicket}
                                    isPinned={true}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )
                      ) : groupByTeam && isSuperAdmin ? (
                        /* Modo agrupado por time */
                        Object.keys(groupedTicketsData).length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Nenhum ticket encontrado
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {Object.entries(groupedTicketsData).map(([setorId, group]) => (
                              <div key={setorId} className="space-y-3">
                                {/* Cabeçalho do grupo */}
                                <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded">
                                  <Users className="h-4 w-4 text-primary" />
                                  <h4 className="font-semibold text-sm">{group.setor.nome}</h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {group.tickets.length + group.pinnedTickets.length}
                                  </Badge>
                                </div>
                                
                                {/* Tickets fixados do grupo */}
                                {group.pinnedTickets.length > 0 && (
                                  <div className="ml-4">
                                    <div className="flex items-center gap-1 mb-2">
                                      <Pin className="h-3 w-3 text-primary" />
                                      <span className="text-xs text-muted-foreground">Fixados</span>
                                    </div>
                                    <div className="space-y-2">
                                      {group.pinnedTickets.map(ticket => (
                                        <SortableTicketItem
                                          key={ticket.id}
                                          ticket={ticket}
                                          onTicketClick={handleTicketClick}
                                          onUnpinClick={handleUnpinTicket}
                                          isPinned={true}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Tickets regulares do grupo */}
                                {group.tickets.length > 0 && (
                                  <div className="ml-4 space-y-2">
                                    {group.tickets.map(ticket => (
                                      <SortableTicketItem
                                        key={ticket.id}
                                        ticket={ticket}
                                        onTicketClick={handleTicketClick}
                                        onUnpinClick={handlePinTicket}
                                        isPinned={false}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        /* Modo lista única */
                        regularTicketsData.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Nenhum ticket encontrado
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {regularTicketsData.map(ticket => (
                              <SortableTicketItem
                                key={ticket.id}
                                ticket={ticket}
                                onTicketClick={handleTicketClick}
                                onUnpinClick={handlePinTicket}
                                isPinned={false}
                              />
                            ))}
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Filters Sidebar - Right Column */}
            <div className="hidden lg:block">
              <div 
                className="sticky rounded-lg border bg-card p-4"
                style={{ 
                  top: '16px',
                  width: 'clamp(320px, 26vw, 360px)'
                }}
              >
                <FilterSidebar />
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <TicketDetailModal
            sla={selectedTicket}
            isOpen={modalOpen}
            onClose={handleModalClose}
            onUpdate={handleTicketUpdate}
          />
        )}
      </div>
    </TooltipProvider>
  );
}