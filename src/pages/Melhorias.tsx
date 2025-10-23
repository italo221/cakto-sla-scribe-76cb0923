import { useState, useEffect, useMemo } from "react";
import { useOptimizedTickets } from "@/hooks/useOptimizedTickets";
import { useTicketStats } from "@/hooks/useTicketStats";
import MelhoriaKanban from "@/components/MelhoriaKanban";
import TicketDetailModal from "@/components/TicketDetailModal";
import TicketEditModal from "@/components/TicketEditModal";
import MelhoriaTicketCreator from "@/components/MelhoriaTicketCreator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Lightbulb, TrendingUp, Clock, AlertTriangle, Search, Filter, Building2, Activity, CheckCircle, Circle, Plus, X } from "lucide-react";

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

export default function MelhoriasPage() {
  const {
    tickets,
    ticketsWithStatus,
    loading,
    reloadTickets,
    loadMoreTickets,
    hasMore,
    totalCount
  } = useOptimizedTickets({
    enableRealtime: true,
    batchSize: 200
  });

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTicketForEdit, setSelectedTicketForEdit] = useState<Ticket | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [setores, setSetores] = useState<Setor[]>([]);
  const [usuarios, setUsuarios] = useState<Array<{ email: string; nome_completo: string }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [setorFilter, setSetorFilter] = useState('all');
  const [usuarioFilter, setUsuarioFilter] = useState('all');
  const [criticalityFilter, setCriticalityFilter] = useState('all');

  const { user, canEdit, profile } = useAuth();
  const { toast } = useToast();

  // Filtrar APENAS tickets de melhoria (incluindo excluídos para stats)
  const melhoriaTicketsAll = useMemo(() => {
    const filtered = tickets.filter(ticket => 
      ticket.tipo_ticket === 'feedback_sugestao' || 
      ticket.tipo_ticket === 'atualizacao_projeto'
    );
    console.log('📊 Total de tickets:', tickets.length);
    console.log('🎯 Tickets de melhoria filtrados:', filtered.length);
    console.log('🎯 Tipos encontrados:', tickets.map(t => t.tipo_ticket).filter((v, i, a) => a.indexOf(v) === i));
    return filtered;
  }, [tickets]);

  // Filtrar tickets excluídos para o Kanban
  const melhoriaTickets = useMemo(() => {
    return melhoriaTicketsAll.filter(t => t.status !== 'excluido');
  }, [melhoriaTicketsAll]);

  // Calcular estatísticas personalizadas para melhorias (usando todos os tickets incluindo excluídos)
  const melhoriaStats = useMemo(() => {
    const total = melhoriaTicketsAll.length;
    const abertos = melhoriaTicketsAll.filter(t => t.status === 'aberto').length;
    const em_andamento = melhoriaTicketsAll.filter(t => t.status === 'em_andamento').length;
    const resolvidos = melhoriaTicketsAll.filter(t => t.status === 'resolvido').length;
    const excluidos = melhoriaTicketsAll.filter(t => t.status === 'excluido').length;

    return {
      total,
      abertos,
      em_andamento,
      resolvidos,
      excluidos
    };
  }, [melhoriaTicketsAll]);

  useEffect(() => {
    loadSetores();
    loadUsuarios();
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
      description: "O ticket de melhoria foi atualizado com sucesso."
    });
  };

  const handleTicketCreated = () => {
    setCreateModalOpen(false);
    reloadTickets();
    toast({
      title: "Ticket criado!",
      description: "O ticket de melhoria foi criado com sucesso."
    });
  };

  const filteredTickets = useMemo(() => {
    let filtered = melhoriaTickets;

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.titulo.toLowerCase().includes(lowerTerm) || 
        ticket.solicitante.toLowerCase().includes(lowerTerm) || 
        ticket.time_responsavel.toLowerCase().includes(lowerTerm) || 
        ticket.ticket_number?.toLowerCase().includes(lowerTerm) || 
        ticket.descricao.toLowerCase().includes(lowerTerm)
      );
    }

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

    if (usuarioFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.solicitante === usuarioFilter);
    }

    if (criticalityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.nivel_criticidade === criticalityFilter);
    }

    return filtered;
  }, [melhoriaTickets, searchTerm, setorFilter, usuarioFilter, criticalityFilter, setores]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Lightbulb className="h-8 w-8 text-primary" />
                Melhorias
              </h1>
              <p className="text-muted-foreground">
                Gerencie feedbacks, sugestões e atualizações de projetos
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button onClick={() => setCreateModalOpen(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nova Melhoria
              </Button>
              
              <Button onClick={reloadTickets} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Filtros
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Título, solicitante, número..." 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                      className="pl-10" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Setor</label>
                  <Select value={setorFilter} onValueChange={setSetorFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os setores" />
                    </SelectTrigger>
                    <SelectContent className="dropdown-filter">
                      <SelectItem value="all">Todos os setores</SelectItem>
                      {setores.map(setor => (
                        <SelectItem key={setor.id} value={setor.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {setor.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="cursor-pointer transition-colors duration-150 bg-card border border-border/10 rounded-xl hover:bg-muted/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total</span>
                <Activity className="text-muted-foreground w-4 h-4" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{melhoriaStats.total}</h2>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-colors duration-150 bg-card border border-border/10 rounded-xl hover:bg-muted/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Abertos</span>
                <Circle className="text-muted-foreground w-4 h-4" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{melhoriaStats.abertos}</h2>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-colors duration-150 bg-card border border-border/10 rounded-xl hover:bg-muted/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Em Andamento</span>
                <Activity className="text-muted-foreground w-4 h-4" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{melhoriaStats.em_andamento}</h2>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-colors duration-150 bg-card border border-border/10 rounded-xl hover:bg-muted/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Finalizado</span>
                <CheckCircle className="text-muted-foreground w-4 h-4" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{melhoriaStats.resolvidos}</h2>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-colors duration-150 bg-card border border-border/10 rounded-xl hover:bg-muted/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Excluídos</span>
                <X className="text-muted-foreground w-4 h-4" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{melhoriaStats.excluidos}</h2>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          {loading && filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Carregando tickets de melhoria...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum ticket de melhoria encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie um novo ticket de melhoria para começar
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Melhoria
              </Button>
            </div>
          ) : (
            <MelhoriaKanban 
              tickets={filteredTickets}
              onOpenDetail={handleOpenTicketDetail}
              onEditTicket={handleEditTicket}
              onTicketUpdate={handleTicketUpdate}
              userRole={canEdit ? 'operador' : 'viewer'}
            />
          )}
        </div>

        {hasMore && !loading && (
          <div className="flex justify-center">
            <Button onClick={loadMoreTickets} variant="outline">
              Carregar mais tickets
            </Button>
          </div>
        )}
      </div>

      <TicketDetailModal 
        sla={selectedTicket}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpdate={handleTicketUpdate}
      />

      <TicketEditModal 
        ticket={selectedTicketForEdit}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onUpdate={handleTicketUpdate}
      />

      <MelhoriaTicketCreator 
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleTicketCreated}
      />
    </div>
  );
}
