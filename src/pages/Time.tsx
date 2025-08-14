import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Calendar, 
  Filter, 
  SortAsc, 
  Users, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  MoreHorizontal,
  TrendingUp,
  Target,
  Timer
} from 'lucide-react';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/hooks/use-toast';

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
  solicitante: string;
  responsavel_interno?: string;
  status: string;
  nivel_criticidade: string;
  data_criacao: string;
  prazo_interno?: string;
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
  
  const [selectedSetor, setSelectedSetor] = useState<string>('');
  const [dateRange, setDateRange] = useState('30');
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('priority');
  const [showOnlyMyTickets, setShowOnlyMyTickets] = useState(false);
  
  const [setores, setSetores] = useState<Setor[]>([]);
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [tickets, setTickets] = useState<TeamTicket[]>([]);
  const [loading, setLoading] = useState(false);

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
            solicitante,
            responsavel_interno,
            status,
            nivel_criticidade,
            data_criacao,
            prazo_interno,
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

  // Ordenar tickets
  const sortedTickets = useMemo(() => {
    const sorted = [...tickets];
    
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
  }, [tickets, sortBy]);

  const MetricCard = ({ title, value, subtitle, icon: Icon, trend }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="h-8 w-8 text-muted-foreground">
            <Icon className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container-responsive space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Time</h1>
          <p className="text-muted-foreground">Operação e métricas do time</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Seletor de Time (apenas para Super Admin) */}
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>Time</Label>
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
            <div className="space-y-2">
              <Label>Período</Label>
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
            <div className="space-y-2">
              <Label>Ordenar por</Label>
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

            {/* Toggle "Só meus tickets" */}
            <div className="space-y-2">
              <Label>Filtros avançados</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="my-tickets"
                  checked={showOnlyMyTickets}
                  onCheckedChange={setShowOnlyMyTickets}
                />
                <Label htmlFor="my-tickets" className="text-sm">Só meus tickets</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total de Tickets"
            value={metrics.total_tickets}
            subtitle={`Últimos ${dateRange} dias`}
            icon={Users}
          />
          <MetricCard
            title="Em Andamento"
            value={metrics.tickets_em_andamento}
            subtitle={`${metrics.tickets_abertos} abertos`}
            icon={Clock}
          />
          <MetricCard
            title="Resolvidos"
            value={metrics.tickets_resolvidos}
            icon={CheckCircle}
          />
          <MetricCard
            title="Conformidade SLA"
            value={`${Math.round(metrics.sla_compliance_rate)}%`}
            icon={Target}
          />
        </div>
      )}

      {/* Tempos médios */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Tempo Médio para Iniciar"
            value={`${Math.round(metrics.avg_time_to_start_hours)}h`}
            icon={Timer}
          />
          <MetricCard
            title="Tempo Médio de Resolução"
            value={`${Math.round(metrics.avg_resolution_time_hours)}h`}
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Lista de Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Trabalho do Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedTickets.map(ticket => (
              <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <Badge variant={
                    ticket.nivel_criticidade === 'P0' ? 'destructive' :
                    ticket.nivel_criticidade === 'P1' ? 'destructive' :
                    ticket.nivel_criticidade === 'P2' ? 'default' : 'secondary'
                  }>
                    {ticket.nivel_criticidade}
                  </Badge>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ticket.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.ticket_number} • {ticket.solicitante}
                    </p>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.data_criacao), { addSuffix: true })}
                  </div>
                  
                  {ticket.is_overdue && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  
                  <Badge variant="outline">
                    {ticket.status}
                  </Badge>
                </div>
                
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {sortedTickets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum ticket encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}