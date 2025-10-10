import { useState, useEffect, useMemo } from "react";
import { useOptimizedTickets } from "@/hooks/useOptimizedTickets";
import { useTicketStats } from "@/hooks/useTicketStats";
import TicketKanban from "@/components/TicketKanban";
import TicketKanbanTags from "@/components/TicketKanbanTags";
import TicketDetailModal from "@/components/TicketDetailModal";
import TicketEditModal from "@/components/TicketEditModal";
import SetorValidationAlert from "@/components/SetorValidationAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTags } from "@/hooks/useTags";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { RefreshCw, Kanban as KanbanIcon, TrendingUp, Clock, AlertTriangle, Search, Filter, Building2, Tags, BarChart3, Activity, CheckCircle, X, Circle } from "lucide-react";
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
}
interface Setor {
  id: string;
  nome: string;
}
export default function KanbanPage() {
  // Usar hook otimizado para tickets
  const {
    tickets,
    ticketsWithStatus,
    loading,
    reloadTickets,
    loadMoreTickets,
    hasMore,
    totalCount
  } = useOptimizedTickets({
    enableRealtime: false,
    // Desabilitado devido a queries lentas
    batchSize: 200 // Aumentado para mostrar mais tickets no kanban
  });

  // Usar hook centralizado para estatísticas sincronizadas sem duplicar consultas
  const {
    stats
  } = useTicketStats(ticketsWithStatus);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTicketForEdit, setSelectedTicketForEdit] = useState<Ticket | null>(null);

  // Estados do filtro do Kanban
  const [setores, setSetores] = useState<Setor[]>([]);
  const [usuarios, setUsuarios] = useState<Array<{ email: string; nome_completo: string }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [setorFilter, setSetorFilter] = useState('all');
  const [usuarioFilter, setUsuarioFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('todas');
  const [criticalityFilter, setCriticalityFilter] = useState('all');
  const [infoIncompletaFilter, setInfoIncompletaFilter] = useState(false);

  // Estados específicos do modo Tags
  const [viewMode, setViewMode] = useState<'status' | 'tags'>(() => {
    const saved = localStorage.getItem('kanbanViewMode');
    return saved === 'tags' ? 'tags' : 'status';
  });
  const [tagRanking, setTagRanking] = useState<'all' | 'top10' | 'top25'>('all');
  const [tagSearch, setTagSearch] = useState('');
  const {
    user,
    canEdit
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    allTags
  } = useTags();

  // Persistir modo de visualização
  useEffect(() => {
    localStorage.setItem('kanbanViewMode', viewMode);
  }, [viewMode]);
  const handleOpenTicketDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setModalOpen(true);
  };
  const handleEditTicket = (ticket: Ticket) => {
    setSelectedTicketForEdit(ticket);
    setEditModalOpen(true);
  };
  const handleTicketUpdate = () => {
    reloadTickets();
    toast({
      title: "Ticket atualizado",
      description: "O status do ticket foi atualizado com sucesso."
    });
  };

  // Carregar setores e usuários
  useEffect(() => {
    loadSetores();
    loadUsuarios();
  }, []);
  
  const loadSetores = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('setores').select('id, nome').eq('ativo', true).order('nome');
      if (error) throw error;
      setSetores(data || []);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    }
  };

  const loadUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, nome_completo')
        .eq('ativo', true)
        .order('nome_completo');
      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  // Filtrar tickets para o Kanban
  const filteredTickets = useMemo(() => {
    let filtered = tickets;

    // Busca por termo
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(ticket => ticket.titulo.toLowerCase().includes(lowerTerm) || ticket.solicitante.toLowerCase().includes(lowerTerm) || ticket.time_responsavel.toLowerCase().includes(lowerTerm) || ticket.ticket_number?.toLowerCase().includes(lowerTerm) || ticket.descricao.toLowerCase().includes(lowerTerm));
    }

    // Filtro por setor
    if (setorFilter !== 'all') {
      filtered = filtered.filter(ticket => {
        const setorSelecionado = setores.find(s => s.id === setorFilter);
        if (!setorSelecionado) return false;
        const timeResponsavel = ticket.time_responsavel?.trim();
        const nomeSetor = setorSelecionado.nome?.trim();
        if (timeResponsavel === nomeSetor) {
          return true;
        }
        if (!timeResponsavel && ticket.setor_id === setorFilter) {
          return true;
        }
        return false;
      });
    }

    // Filtro por usuário (solicitante)
    if (usuarioFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.solicitante === usuarioFilter);
    }

    // Filtro por tag (apenas no modo status)
    if (viewMode === 'status' && tagFilter !== 'todas') {
      filtered = filtered.filter(ticket => {
        const ticketTags = Array.isArray(ticket.tags) ? ticket.tags : [];
        return ticketTags.some(tag => tag && typeof tag === 'string' && tag.trim().toLowerCase() === tagFilter.trim().toLowerCase());
      });
    }

    // Filtro por criticidade
    if (criticalityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.nivel_criticidade === criticalityFilter);
    }

    // Filtro por informação incompleta
    if (infoIncompletaFilter) {
      filtered = filtered.filter(ticket => ticket.tags?.includes("info-incompleta"));
    }
    return filtered;
  }, [tickets, searchTerm, setorFilter, usuarioFilter, tagFilter, criticalityFilter, infoIncompletaFilter, setores, viewMode]);
  return <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-6 space-y-6">
        {/* Alerta de validação de setor */}
        <SetorValidationAlert />

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <KanbanIcon className="h-8 w-8 text-primary" />
                Kanban Board
              </h1>
              <p className="text-muted-foreground">
                Visualize e gerencie o fluxo de trabalho dos tickets
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Alternador de Modo */}
              <ToggleGroup type="single" value={viewMode} onValueChange={value => value && setViewMode(value as 'status' | 'tags')} className="bg-muted p-1 rounded-lg">
                <ToggleGroupItem value="status" aria-label="Visualizar por Status" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Status
                </ToggleGroupItem>
                <ToggleGroupItem value="tags" aria-label="Visualizar por Tags" className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Tags
                </ToggleGroupItem>
              </ToggleGroup>

              <Button onClick={reloadTickets} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Filtros do Kanban */}
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Filtros do Kanban - {viewMode === 'status' ? 'Por Status' : 'Por Tags'}
                </span>
              </div>
              
              {viewMode === 'status' ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 justify-items-center">
                  {/* Busca */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Buscar</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Título, solicitante, número..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                  </div>

                  {/* Filtro por Setor */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Setor</label>
                    <Select value={setorFilter} onValueChange={setSetorFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os setores" />
                      </SelectTrigger>
                      <SelectContent className="dropdown-filter">
                        <SelectItem value="all">Todos os setores</SelectItem>
                        {setores.map(setor => <SelectItem key={setor.id} value={setor.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {setor.nome}
                            </div>
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro por Usuário */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Usuário</label>
                    <Select value={usuarioFilter} onValueChange={setUsuarioFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os usuários" />
                      </SelectTrigger>
                      <SelectContent className="dropdown-filter">
                        <SelectItem value="all">Todos os usuários</SelectItem>
                        {usuarios.map(usuario => (
                          <SelectItem key={usuario.email} value={usuario.email}>
                            {usuario.nome_completo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro por Tag */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Tag</label>
                    <Select value={tagFilter} onValueChange={setTagFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as tags" />
                      </SelectTrigger>
                      <SelectContent className="dropdown-filter">
                        <SelectItem value="todas">Todas as tags</SelectItem>
                        {allTags.map(tag => <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro por Criticidade */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Prioridade</label>
                    <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as prioridades" />
                      </SelectTrigger>
                      <SelectContent className="dropdown-filter">
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="P0">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            P0 - Crítico
                          </div>
                        </SelectItem>
                        <SelectItem value="P1">P1 - Alto</SelectItem>
                        <SelectItem value="P2">P2 - Médio</SelectItem>
                        <SelectItem value="P3">P3 - Baixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro por Informação Incompleta */}
                  
                </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Filtro por Setor */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Setor</label>
                    <Select value={setorFilter} onValueChange={setSetorFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os setores" />
                      </SelectTrigger>
                      <SelectContent className="dropdown-filter">
                        <SelectItem value="all">Todos os setores</SelectItem>
                        {setores.map(setor => <SelectItem key={setor.id} value={setor.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {setor.nome}
                            </div>
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ranking de Tags */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Ranking de Tags</label>
                    <Select value={tagRanking} onValueChange={value => setTagRanking(value as 'all' | 'top10' | 'top25')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Ranking" />
                      </SelectTrigger>
                      <SelectContent className="dropdown-filter">
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="top10">Top 10</SelectItem>
                        <SelectItem value="top25">Top 25</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Busca por Tag */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Buscar Tag</label>
                    <div className="relative">
                      <Tags className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Nome da tag..." value={tagSearch} onChange={e => setTagSearch(e.target.value)} className="pl-10" />
                    </div>
                  </div>

                  {/* Filtro por Criticidade */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Prioridade</label>
                    <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as prioridades" />
                      </SelectTrigger>
                      <SelectContent className="dropdown-filter">
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="P0">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            P0 - Crítico
                          </div>
                        </SelectItem>
                        <SelectItem value="P1">P1 - Alto</SelectItem>
                        <SelectItem value="P2">P2 - Médio</SelectItem>
                        <SelectItem value="P3">P3 - Baixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>}
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards - Usando dados centralizados */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className={cn("cursor-pointer transition-colors duration-150 bg-card border border-border/10 rounded-xl hover:bg-muted/60 border-l-[2px] border-l-blue-500/30")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Abertos</span>
                <Circle className="text-muted-foreground w-4 h-4" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{stats.abertos}</h2>
            </CardContent>
          </Card>

          <Card className={cn("cursor-pointer transition-colors duration-150 bg-card border border-border/10 rounded-xl hover:bg-muted/60 border-l-[2px] border-l-blue-400/30")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Em Andamento</span>
                <Activity className="text-muted-foreground w-4 h-4" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{stats.em_andamento}</h2>
            </CardContent>
          </Card>

          <Card className={cn("cursor-pointer transition-colors duration-150 bg-card border border-border/10 rounded-xl hover:bg-muted/60 border-l-[2px] border-l-green-500/30")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Resolvidos</span>
                <CheckCircle className="text-muted-foreground w-4 h-4" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{stats.resolvidos}</h2>
            </CardContent>
          </Card>

          <Card className={cn("cursor-pointer transition-colors duration-150 bg-card border border-border/10 rounded-xl hover:bg-muted/60 border-l-[2px] border-l-neutral-500/20")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Fechados</span>
                <X className="text-muted-foreground w-4 h-4" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{stats.fechados}</h2>
            </CardContent>
          </Card>

          <Card className={cn("cursor-pointer transition-colors duration-150 bg-card border border-border/10 rounded-xl hover:bg-muted/60 border-l-[2px] border-l-red-600/35")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Críticos</span>
                <AlertTriangle className="text-muted-foreground w-4 h-4" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{stats.criticos}</h2>
            </CardContent>
          </Card>

          <Card className={cn("cursor-pointer transition-colors duration-150 bg-card border border-border/10 rounded-xl hover:bg-muted/60 border-l-[2px] border-l-red-500/30")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Atrasados</span>
                <Clock className="text-muted-foreground w-4 h-4" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{stats.atrasados}</h2>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        <Card className="bg-card">
          <CardContent className="p-0">
            {loading ? <div className="flex items-center justify-center h-96">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div> : viewMode === 'status' ? <TicketKanban tickets={filteredTickets} onOpenDetail={handleOpenTicketDetail} onEditTicket={handleEditTicket} onTicketUpdate={handleTicketUpdate} userRole={canEdit ? 'operador' : 'viewer'} /> : <TicketKanbanTags tickets={filteredTickets} onOpenDetail={handleOpenTicketDetail} onEditTicket={handleEditTicket} rankingMode={tagRanking} searchTag={tagSearch} />}
          </CardContent>
        </Card>

        {hasMore && !loading && <div className="flex flex-col items-center mt-4">
            <Button onClick={loadMoreTickets} variant="outline" size="sm">
              Carregar mais
            </Button>
            <span className="mt-2 text-xs text-muted-foreground">
              {tickets.length} de {totalCount}
            </span>
          </div>}

        {/* Ticket Detail Modal */}
        {selectedTicket && <TicketDetailModal sla={selectedTicket} isOpen={modalOpen} onClose={() => {
        setModalOpen(false);
        setSelectedTicket(null);
      }} onUpdate={reloadTickets} />}

        {/* Ticket Edit Modal */}
        {selectedTicketForEdit && <TicketEditModal ticket={selectedTicketForEdit} isOpen={editModalOpen} onClose={() => {
        setEditModalOpen(false);
        setSelectedTicketForEdit(null);
      }} onUpdate={handleTicketUpdate} />}
      </div>
    </div>;
}