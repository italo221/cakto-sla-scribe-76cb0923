import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Filter, Clock, AlertCircle, CheckCircle, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Navigation from "@/components/Navigation";
import SLADetailModal from "@/components/SLADetailModal";
import SupabaseStatus from "@/components/SupabaseStatus";
import { SLACountdown } from "@/components/SLACountdown";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

interface SLA {
  id: string;
  ticket_number: string;
  titulo: string;
  time_responsavel: string;
  solicitante: string;
  descricao: string;
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

export default function Inbox() {
  const [slas, setSlas] = useState<SLA[]>([]);
  const [filteredSlas, setFilteredSlas] = useState<SLA[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [criticalityFilter, setCriticalityFilter] = useState('all');
  const [selectedSLA, setSelectedSLA] = useState<SLA | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadSLAs();
  }, []);

  useEffect(() => {
    filterSLAs();
  }, [slas, searchTerm, statusFilter, criticalityFilter]);

  const loadSLAs = async () => {
    try {
      const { data, error } = await supabase
        .from('sla_demandas')
        .select('*')
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      setSlas(data || []);
    } catch (error) {
      console.error('Erro ao carregar SLAs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSLAs = () => {
    let filtered = slas;

    // Filtro por termo de busca (incluindo tags)
    if (searchTerm) {
      filtered = filtered.filter(sla => 
        sla.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sla.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sla.solicitante.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sla.time_responsavel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sla.ticket_number && sla.ticket_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sla.tags && sla.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sla => sla.status === statusFilter);
    }

    // Filtro por criticidade
    if (criticalityFilter !== 'all') {
      filtered = filtered.filter(sla => sla.nivel_criticidade === criticalityFilter);
    }

    setFilteredSlas(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'aberto': { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
      'em_andamento': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      'resolvido': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      'fechado': { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: X }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.aberto;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon size={12} />
        {status.replace('_', ' ')}
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

  const handleOpenSLADetail = (sla: SLA) => {
    setSelectedSLA(sla);
    setModalOpen(true);
  };

  const handleCloseSLADetail = () => {
    setSelectedSLA(null);
    setModalOpen(false);
  };

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
                Caixa de Entrada - SLAs
                <Badge variant="secondary" className="ml-3 text-lg font-mono">
                  {filteredSlas.length}
                </Badge>
              </h1>
              <p className="text-muted-foreground">Gerencie todas as demandas e acompanhe o status dos SLAs</p>
            </div>
            
            {/* Indicadores de urgência */}
            <div className="flex gap-2">
              {filteredSlas.filter(s => s.status !== 'resolvido' && s.status !== 'fechado').length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {filteredSlas.filter(s => s.status !== 'resolvido' && s.status !== 'fechado').length} ativos
                </Badge>
              )}
              {filteredSlas.filter(s => s.nivel_criticidade === 'P0' && s.status !== 'resolvido' && s.status !== 'fechado').length > 0 && (
                <Badge variant="destructive" className="animate-glow-pulse">
                  🚨 {filteredSlas.filter(s => s.nivel_criticidade === 'P0' && s.status !== 'resolvido' && s.status !== 'fechado').length} críticos
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter size={20} />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ticket, título, descrição, tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por criticidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as criticidades</SelectItem>
                  <SelectItem value="P0">P0 - Crítico</SelectItem>
                  <SelectItem value="P1">P1 - Alto</SelectItem>
                  <SelectItem value="P2">P2 - Médio</SelectItem>
                  <SelectItem value="P3">P3 - Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-red-600">{slas.filter(s => s.status === 'aberto').length}</div>
              <p className="text-sm text-muted-foreground">Abertos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-yellow-600">{slas.filter(s => s.status === 'em_andamento').length}</div>
              <p className="text-sm text-muted-foreground">Em Andamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">{slas.filter(s => s.status === 'resolvido').length}</div>
              <p className="text-sm text-muted-foreground">Resolvidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-600">{slas.filter(s => s.status === 'fechado').length}</div>
              <p className="text-sm text-muted-foreground">Fechados</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de SLAs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                SLAs 
                <Badge variant="outline" className="font-mono">
                  {filteredSlas.length} total
                </Badge>
                {filteredSlas.filter(s => s.status === 'aberto').length > 0 && (
                  <Badge variant="destructive">
                    <Clock className="w-3 h-3 mr-1" />
                    {filteredSlas.filter(s => s.status === 'aberto').length} abertos
                  </Badge>
                )}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Atualizado em tempo real
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {filteredSlas.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhum SLA encontrado</h3>
                  <p className="text-muted-foreground">Tente ajustar os filtros ou criar um novo SLA.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSlas.map((sla) => (
                    <Card key={sla.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="font-mono text-xs">
                                {sla.ticket_number || `#${sla.id.slice(0, 8)}`}
                              </Badge>
                              <h3 className="font-semibold text-lg">{sla.titulo}</h3>
                            </div>
                            {getStatusBadge(sla.status)}
                            {getCriticalityBadge(sla.nivel_criticidade)}
                            <SLACountdown 
                              dataCriacao={sla.data_criacao}
                              criticidade={sla.nivel_criticidade}
                              status={sla.status}
                              compact
                            />
                            {sla.tags && sla.tags.length > 0 && (
                              <div className="flex gap-1">
                                {sla.tags.slice(0, 3).map((tag: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    🏷️ {tag}
                                  </Badge>
                                ))}
                                {sla.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{sla.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <p className="text-muted-foreground mb-3">{sla.descricao}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Solicitante:</span>
                              <p className="text-muted-foreground">{sla.solicitante}</p>
                            </div>
                            <div>
                              <span className="font-medium">Time Responsável:</span>
                              <p className="text-muted-foreground">{sla.time_responsavel}</p>
                            </div>
                            <div>
                              <span className="font-medium">Pontuação:</span>
                              <p className="text-muted-foreground">{sla.pontuacao_total} pontos</p>
                            </div>
                            <div>
                              <span className="font-medium">Tempo Médio:</span>
                              <p className="text-muted-foreground">{getTempoMedioResolucao(sla.nivel_criticidade)}</p>
                            </div>
                          </div>
                          
                          <div className="mt-3 text-xs text-muted-foreground">
                            Criado em {format(new Date(sla.data_criacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenSLADetail(sla)}
                          >
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Modal de Detalhes do SLA */}
      <SLADetailModal
        sla={selectedSLA}
        isOpen={modalOpen}
        onClose={handleCloseSLADetail}
        onUpdate={loadSLAs}
      />
    </div>
  );
}