import { useState, useEffect, useMemo } from 'react';
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
  SlidersHorizontal
} from 'lucide-react';
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
  time_responsavel?: string;
  solicitante: string;
  descricao?: string;
  responsavel_interno?: string;
  status: string;
  nivel_criticidade: string;
  pontuacao_total?: number;
  pontuacao_financeiro?: number;
  pontuacao_cliente?: number;
  pontuacao_reputacao?: number;
  pontuacao_urgencia?: number;
  pontuacao_operacional?: number;
  data_criacao: string;
  observacoes?: string;
  setor_id?: string;
  prazo_interno?: string;
  prioridade_operacional?: string;
  tags?: string[];
  age_days: number;
  is_overdue: boolean;
}

interface Setor {
  id: string;
  nome: string;
}

export default function Time() {
  const { user, isSuperAdmin } = useAuth();
  const { userSetores } = usePermissions();
  const { allTags } = useTags();
  
  const [selectedSetor, setSelectedSetor] = useState<string>('');
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
        
        // Se não é super admin, pegar primeiro setor do usuário
        if (!isSuperAdmin && userSetores.length > 0) {
          const userSetor = userSetores[0];
          if (userSetor.setor) {
            setSelectedSetor(userSetor.setor.id);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar setores:', error);
      }
    };
    
    if (user) {
      loadSetores();
    }
  }, [user, isSuperAdmin, userSetores]);

  // Carregar métricas
  useEffect(() => {
    const loadMetrics = async () => {
      if (!selectedSetor) return;
      
      setLoading(true);
      try {
        const dateFrom = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
        const dateTo = format(new Date(), 'yyyy-MM-dd');
        
        const { data, error } = await supabase.rpc('team_metrics', {
          date_from: dateFrom,
          date_to: dateTo,
          setor_ids: [selectedSetor]
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
  }, [selectedSetor, dateRange]);

  // Carregar tickets
  useEffect(() => {
    const loadTickets = async () => {
      if (!selectedSetor) return;
      
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
          `)
          .eq('setor_id', selectedSetor);

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
          age_days: Math.floor((new Date().getTime() - new Date(ticket.data_criacao).getTime()) / (1000 * 60 * 60 * 24)),
          is_overdue: ticket.prazo_interno ? new Date(ticket.prazo_interno) < new Date() && !['resolvido', 'fechado'].includes(ticket.status) : false
        }));
        
        setTickets(processedTickets);
      } catch (error) {
        console.error('Erro ao carregar tickets:', error);
      }
    };
    
    loadTickets();
  }, [selectedSetor, priorityFilter, statusFilter, showOnlyMyTickets, user]);

  // Filtrar setores baseado nas permissões
  const availableSetores = useMemo(() => {
    if (isSuperAdmin) {
      return setores;
    }
    return setores.filter(setor => 
      userSetores.some(us => us.setor?.id === setor.id)
    );
  }, [setores, userSetores, isSuperAdmin]);

  // Filtrar e ordenar tickets
  const filteredAndSortedTickets = useMemo(() => {
    let filtered = [...tickets];
    
    // Aplicar busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.titulo.toLowerCase().includes(term) ||
        ticket.ticket_number.toLowerCase().includes(term) ||
        ticket.solicitante.toLowerCase().includes(term) ||
        (ticket.tags || []).some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    // Aplicar filtros de prioridade
    if (priorityFilter.length > 0) {
      filtered = filtered.filter(ticket => priorityFilter.includes(ticket.nivel_criticidade));
    }
    
    // Aplicar filtros de status
    if (statusFilter.length > 0) {
      filtered = filtered.filter(ticket => statusFilter.includes(ticket.status));
    }
    
    // Aplicar filtros de tags
    if (tagFilter.length > 0) {
      filtered = filtered.filter(ticket => 
        ticket.tags && tagFilter.some(tag => ticket.tags!.includes(tag))
      );
    }
    
    // Aplicar ordenação
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };
        filtered.sort((a, b) => 
          (priorityOrder[a.nivel_criticidade as keyof typeof priorityOrder] || 4) - 
          (priorityOrder[b.nivel_criticidade as keyof typeof priorityOrder] || 4)
        );
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.data_criacao).getTime() - new Date(b.data_criacao).getTime());
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime());
        break;
      case 'sla':
        filtered.sort((a, b) => {
          if (a.is_overdue && !b.is_overdue) return -1;
          if (!a.is_overdue && b.is_overdue) return 1;
          return 0;
        });
        break;
    }
    
    return filtered;
  }, [tickets, searchTerm, priorityFilter, statusFilter, tagFilter, sortBy]);

  // Helper functions
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

  const clearAllFilters = () => {
    setSearchTerm('');
    setPriorityFilter([]);
    setStatusFilter([]);
    setTagFilter([]);
    setSortBy('priority');
    setShowOnlyMyTickets(false);
  };

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
      if (!selectedSetor) return;
      
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
          `)
          .eq('setor_id', selectedSetor);

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

  // Filter Sidebar Component
  const FilterSidebar = ({ isMobile = false }) => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Filtros</h3>
        
        {/* Seletor de Time (apenas para Super Admin) */}
        {isSuperAdmin && (
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
                ) : filteredAndSortedTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum ticket encontrado
                  </div>
                ) : (
                  filteredAndSortedTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => handleTicketClick(ticket)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all duration-200",
                        "hover:shadow-sm hover:bg-muted/50",
                        "active:scale-[0.99]",
                        selectedTicket?.id === ticket.id && "bg-muted border-primary"
                      )}
                      style={{ padding: '12px 16px' }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Priority Badge */}
                        <Badge className={cn("shrink-0 text-xs", getPriorityBadgeColor(ticket.nivel_criticidade))}>
                          {ticket.nivel_criticidade}
                        </Badge>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm line-clamp-1 text-foreground">
                              {ticket.titulo}
                            </h4>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(ticket.data_criacao), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </div>
                            </div>
                          </div>
                          
                          {/* Sub-line */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <span>{ticket.ticket_number}</span>
                            <span>•</span>
                            <span className="truncate">{ticket.solicitante}</span>
                          </div>
                          
                          {/* Bottom row */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              {ticket.is_overdue && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                              {/* Tags - show max 2 */}
                              {ticket.tags && ticket.tags.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {ticket.tags.slice(0, 2).map(tag => (
                                    <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                                      {tag}
                                    </span>
                                  ))}
                                  {ticket.tags.length > 2 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{ticket.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", getStatusBadgeColor(ticket.status))}
                            >
                              {getStatusLabel(ticket.status)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Filter Sidebar - Right Column (Desktop only) */}
          <div className="hidden lg:block">
            <div 
              className="rounded-lg border bg-card"
              style={{ 
                width: 'clamp(320px, 26vw, 360px)',
                position: 'sticky',
                top: '16px'
              }}
            >
              <ScrollArea className="h-full max-h-[calc(100vh-120px)]">
                <div className="p-6">
                  <FilterSidebar />
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        sla={selectedTicket ? {
          id: selectedTicket.id,
          titulo: selectedTicket.titulo,
          time_responsavel: selectedTicket.time_responsavel || '',
          solicitante: selectedTicket.solicitante,
          descricao: selectedTicket.descricao || '',
          status: selectedTicket.status,
          nivel_criticidade: selectedTicket.nivel_criticidade,
          pontuacao_total: selectedTicket.pontuacao_total || 0,
          pontuacao_financeiro: selectedTicket.pontuacao_financeiro || 0,
          pontuacao_cliente: selectedTicket.pontuacao_cliente || 0,
          pontuacao_reputacao: selectedTicket.pontuacao_reputacao || 0,
          pontuacao_urgencia: selectedTicket.pontuacao_urgencia || 0,
          pontuacao_operacional: selectedTicket.pontuacao_operacional || 0,
          data_criacao: selectedTicket.data_criacao,
          observacoes: selectedTicket.observacoes,
          setor_id: selectedTicket.setor_id,
          tags: selectedTicket.tags,
          ticket_number: selectedTicket.ticket_number,
          responsavel_interno: selectedTicket.responsavel_interno,
          prazo_interno: selectedTicket.prazo_interno,
          prioridade_operacional: selectedTicket.prioridade_operacional
        } : null}
        isOpen={modalOpen}
        onClose={handleModalClose}
        onUpdate={handleTicketUpdate}
      />
    </div>
  );
}