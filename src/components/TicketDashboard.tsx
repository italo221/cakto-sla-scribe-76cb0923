import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Calendar,
  Filter,
  Building2,
  Download,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";

type DateRange = '30dias' | '7dias' | 'hoje' | 'ontem';
type ViewType = 'global' | 'setor';

interface SLAMetrics {
  total: number;
  abertos: number;
  resolvidos: number;
  emAndamento: number;
  pausados: number;
  fechados: number;
  atrasados: number;
  cumprimento: number;
  tempoMedioResolucao: Record<string, number>;
}

interface SLAData {
  id: string;
  titulo: string;
  status: string;
  nivel_criticidade: string;
  time_responsavel: string;
  data_criacao: string;
  updated_at?: string;
  setor_id: string;
  prazo_interno?: string;
}

interface Setor {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

const COLORS = {
  P0: '#dc2626', // red-600
  P1: '#ea580c', // orange-600  
  P2: '#d97706', // yellow-600
  P3: '#16a34a'  // green-600
};

const STATUS_COLORS = {
  'aberto': '#dc2626',
  'em_andamento': '#ea580c',
  'pausado': '#d97706',
  'resolvido': '#16a34a',
  'fechado': '#6b7280'
};

export default function SLADashboard() {
  const { user, isSuperAdmin, canEdit, setores: userSetores } = useAuth();
  const [metrics, setMetrics] = useState<SLAMetrics>({
    total: 0,
    abertos: 0,
    resolvidos: 0,
    emAndamento: 0,
    pausados: 0,
    fechados: 0,
    atrasados: 0,
    cumprimento: 0,
    tempoMedioResolucao: {}
  });
  
  const [slaData, setSlaData] = useState<SLAData[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<DateRange>('30dias');
  const [viewType, setViewType] = useState<ViewType>('global');
  const [selectedSetor, setSelectedSetor] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchSetores();
      fetchSLAMetrics();
    }
  }, [user]);

  useEffect(() => {
    if (user && setores.length > 0) {
      fetchSLAMetrics();
    }
  }, [user, selectedRange, viewType, selectedSetor, setores]);

  const fetchSetores = async () => {
    try {
      const { data, error } = await supabase
        .from('setores')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setSetores(data || []);
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
    }
  };

  const getDateRange = (range: DateRange) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
      case '30dias':
        const trintaDiasAtras = new Date(today);
        trintaDiasAtras.setDate(today.getDate() - 30);
        return { start: trintaDiasAtras, end: now };
      
      case '7dias':
        const seteDiasAtras = new Date(today);
        seteDiasAtras.setDate(today.getDate() - 7);
        return { start: seteDiasAtras, end: now };
      
      case 'hoje':
        const fimDodia = new Date(today);
        fimDodia.setHours(23, 59, 59, 999);
        return { start: today, end: fimDodia };
      
      case 'ontem':
        const ontem = new Date(today);
        ontem.setDate(today.getDate() - 1);
        const fimOntem = new Date(ontem);
        fimOntem.setHours(23, 59, 59, 999);
        return { start: ontem, end: fimOntem };
      
      default:
        return { start: today, end: now };
    }
  };

  const getRangeLabel = (range: DateRange) => {
    switch (range) {
      case '30dias': return 'Últimos 30 dias';
      case '7dias': return 'Últimos 7 dias'; 
      case 'hoje': return 'Hoje';
      case 'ontem': return 'Ontem';
    }
  };

  const getFilteredSetorName = () => {
    if (viewType === 'global') return 'Visão Geral';
    if (selectedSetor === 'all') return 'Todos os Setores';
    const setor = setores.find(s => s.id === selectedSetor);
    return setor ? setor.nome : 'Setor Desconhecido';
  };

  const canAccessSetor = (setorId: string) => {
    if (isSuperAdmin) return true;
    return userSetores.some(us => us.setor_id === setorId);
  };

  const getAvailableSetores = () => {
    if (isSuperAdmin) return setores;
    return setores.filter(s => canAccessSetor(s.id));
  };

  const fetchSLAMetrics = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { start, end } = getDateRange(selectedRange);
      
      let query = supabase
        .from('sla_demandas')
        .select(`
          id, 
          titulo, 
          status, 
          nivel_criticidade, 
          time_responsavel, 
          data_criacao,
          updated_at,
          setor_id,
          prazo_interno
        `)
        .gte('data_criacao', start.toISOString())
        .lte('data_criacao', end.toISOString());

      // Aplicar filtros de setor
      if (viewType === 'setor' && selectedSetor !== 'all') {
        query = query.eq('setor_id', selectedSetor);
      } else if (!isSuperAdmin) {
        // Para não super admins, filtrar apenas pelos setores que têm acesso
        const setorIds = userSetores.map(us => us.setor_id);
        if (setorIds.length > 0) {
          query = query.in('setor_id', setorIds);
        } else {
          // Se não tem acesso a nenhum setor, não mostrar nada
          query = query.eq('setor_id', 'none');
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const slas = data || [];
      setSlaData(slas);

      // Calcular métricas
      const total = slas.length;
      const abertos = slas.filter(sla => sla.status === 'aberto').length;
      const resolvidos = slas.filter(sla => sla.status === 'resolvido').length;
      const fechados = slas.filter(sla => sla.status === 'fechado').length;
      const emAndamento = slas.filter(sla => sla.status === 'em_andamento').length;
      const pausados = slas.filter(sla => sla.status === 'pausado').length;
      
      // Calcular atrasos baseado em prazo interno ou regras de prioridade
      const agora = new Date();
      const atrasados = slas.filter(sla => {
        if (sla.status === 'resolvido' || sla.status === 'fechado') return false;
        
        if (sla.prazo_interno) {
          return new Date(sla.prazo_interno) < agora;
        }
        
        // Regra padrão: P0/P1 = 1 dia, P2 = 3 dias, P3 = 7 dias
        const dataCriacao = new Date(sla.data_criacao);
        const horasLimite = {
          'P0': 24,
          'P1': 24, 
          'P2': 72,
          'P3': 168
        }[sla.nivel_criticidade] || 24;
        
        const prazoCalculado = new Date(dataCriacao.getTime() + horasLimite * 60 * 60 * 1000);
        return prazoCalculado < agora;
      }).length;

      const totalResolvidos = resolvidos + fechados;
      const cumprimento = total > 0 ? (totalResolvidos / total) * 100 : 0;

      // Calcular tempo médio de resolução por prioridade
      const tempoMedioResolucao: Record<string, number> = {};
      const slasFechados = slas.filter(sla => sla.status === 'resolvido' || sla.status === 'fechado');
      
      ['P0', 'P1', 'P2', 'P3'].forEach(prioridade => {
        const slasPrioridade = slasFechados.filter(sla => sla.nivel_criticidade === prioridade);
        if (slasPrioridade.length > 0) {
          const tempoTotal = slasPrioridade.reduce((acc, sla) => {
            const dataCriacao = new Date(sla.data_criacao);
            const dataResolucao = new Date(sla.updated_at || sla.data_criacao);
            const tempoResolucaoHoras = (dataResolucao.getTime() - dataCriacao.getTime()) / (1000 * 60 * 60);
            return acc + tempoResolucaoHoras;
          }, 0);
          tempoMedioResolucao[prioridade] = tempoTotal / slasPrioridade.length;
        } else {
          tempoMedioResolucao[prioridade] = 0;
        }
      });

      setMetrics({
        total,
        abertos,
        resolvidos,
        emAndamento,
        pausados,
        fechados,
        atrasados,
        cumprimento,
        tempoMedioResolucao
      });

    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as métricas do dashboard.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCriticalityData = () => {
    const criticidadeCount = slaData.reduce((acc, sla) => {
      acc[sla.nivel_criticidade] = (acc[sla.nivel_criticidade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(criticidadeCount).map(([nivel, count]) => ({
      name: nivel,
      value: count,
      color: COLORS[nivel as keyof typeof COLORS]
    }));
  };

  const getStatusData = () => {
    const statusCount = slaData.reduce((acc, sla) => {
      acc[sla.status] = (acc[sla.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusLabels = {
      'aberto': 'Aberto',
      'em_andamento': 'Em Andamento',
      'pausado': 'Pausado',
      'resolvido': 'Resolvido',
      'fechado': 'Fechado'
    };

    return Object.entries(statusCount).map(([status, count]) => ({
      name: statusLabels[status as keyof typeof statusLabels] || status,
      value: count,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6b7280'
    }));
  };

  const getDailyData = () => {
    const { start } = getDateRange(selectedRange);
    const dailyCount: Record<string, number> = {};
    
    // Calcular número de dias no período
    const diffTime = Math.abs(new Date().getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Inicializar período com 0
    for (let i = diffDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyCount[dateStr] = 0;
    }
    
    // Contar SLAs por dia
    slaData.forEach(sla => {
      const dateStr = sla.data_criacao.split('T')[0];
      if (dailyCount.hasOwnProperty(dateStr)) {
        dailyCount[dateStr]++;
      }
    });
    
    return Object.entries(dailyCount).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      }),
      fullDate: date,
      count
    }));
  };

  const getTimeData = () => {
    const timeCount = slaData.reduce((acc, sla) => {
      acc[sla.time_responsavel] = (acc[sla.time_responsavel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(timeCount)
      .map(([time, count]) => ({ name: time, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  };

  const getSetorData = () => {
    if (viewType !== 'global') return [];
    
    const setorCount = slaData.reduce((acc, sla) => {
      if (sla.setor_id) {
        const setor = setores.find(s => s.id === sla.setor_id);
        const setorNome = setor?.nome || 'Setor Desconhecido';
        acc[setorNome] = (acc[setorNome] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(setorCount)
      .map(([setor, count]) => ({ name: setor, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  const exportData = () => {
    try {
      const csvData = slaData.map(sla => ({
        'Ticket': sla.titulo,
        'Status': sla.status,
        'Prioridade': sla.nivel_criticidade,
        'Time Responsável': sla.time_responsavel,
        'Data Criação': new Date(sla.data_criacao).toLocaleDateString('pt-BR'),
        'Setor': setores.find(s => s.id === sla.setor_id)?.nome || 'N/A'
      }));

      const csv = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sla-dashboard-${getRangeLabel(selectedRange).toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Dados exportados",
        description: "O arquivo CSV foi baixado com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Header com filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8" />
              Dashboard SLA - {getFilteredSetorName()}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Acompanhe as métricas e desempenho dos SLAs
              {!isSuperAdmin && " (acesso limitado aos seus setores)"}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            )}
            <Badge variant="secondary" className="text-xs sm:text-sm">
              <Eye className="w-3 h-3 mr-1" />
              {isSuperAdmin ? 'Super Admin' : canEdit ? 'Operador' : 'Viewer'}
            </Badge>
          </div>
        </div>

        {/* Controles de filtro */}
        <div className="flex flex-col lg:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Seletor de tipo de visualização */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Visualização:</label>
              <Tabs value={viewType} onValueChange={(value) => setViewType(value as ViewType)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="global">Visão Geral</TabsTrigger>
                  <TabsTrigger value="setor">Por Setor</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Seletor de setor (apenas para visualização por setor) */}
            {viewType === 'setor' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Setor:</label>
                <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Setores</SelectItem>
                    {getAvailableSetores().map(setor => (
                      <SelectItem key={setor.id} value={setor.id}>
                        {setor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Seletor de período */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Período:</label>
              <div className="grid grid-cols-2 sm:flex gap-2">
                {(['30dias', '7dias', 'hoje', 'ontem'] as DateRange[]).map((range) => (
                  <Button
                    key={range}
                    variant={selectedRange === range ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedRange(range)}
                    className="text-xs"
                  >
                    {getRangeLabel(range)}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-end">
            <Badge variant="secondary" className="text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              {getRangeLabel(selectedRange)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total SLAs</p>
                <p className="text-xl sm:text-2xl font-bold">{metrics.total}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Resolvidos</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {metrics.resolvidos + metrics.fechados}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Em Aberto</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">
                  {metrics.abertos + metrics.emAndamento + metrics.pausados}
                </p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Atrasados</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{metrics.atrasados}</p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumprimento de SLA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cumprimento de SLA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-green-600 mb-2">
              {metrics.cumprimento.toFixed(1)}%
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
              {metrics.resolvidos + metrics.fechados} de {metrics.total} SLAs resolvidos
            </p>
            <div className="w-full bg-muted rounded-full h-2 mt-4">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(metrics.cumprimento, 100)}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tempo Médio de Resolução por Prioridade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tempo Médio de Resolução por Prioridade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {['P0', 'P1', 'P2', 'P3'].map((prioridade) => {
              const tempo = metrics.tempoMedioResolucao[prioridade] || 0;
              const tempoFormatado = tempo > 24 
                ? `${(tempo / 24).toFixed(1)}d`
                : `${tempo.toFixed(1)}h`;
              
              const priorityLabels = {
                'P0': 'Crítico',
                'P1': 'Alto', 
                'P2': 'Médio',
                'P3': 'Baixo'
              };

              return (
                <div key={prioridade} className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[prioridade as keyof typeof COLORS] }}
                    ></div>
                    <span className="font-medium text-xs sm:text-sm">{prioridade}</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">{tempoFormatado}</div>
                  <div className="text-xs text-muted-foreground">
                    {priorityLabels[prioridade as keyof typeof priorityLabels]}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Temporal dos SLAs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            SLAs Criados por Dia - {getRangeLabel(selectedRange)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getDailyData()}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return new Date(payload[0].payload.fullDate).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      });
                    }
                    return label;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos em Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* SLAs por Criticidade */}
        <Card>
          <CardHeader>
            <CardTitle>SLAs por Criticidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getCriticalityData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => 
                      `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                    }
                    outerRadius={window.innerWidth < 640 ? 60 : 80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getCriticalityData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* SLAs por Status */}
        <Card>
          <CardHeader>
            <CardTitle>SLAs por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getStatusData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => 
                      `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                    }
                    outerRadius={window.innerWidth < 640 ? 60 : 80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getStatusData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* SLAs por Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              SLAs por Time (Top 6)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {getTimeData().map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium text-sm sm:text-base truncate">{item.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{item.value} SLAs</Badge>
                </div>
              ))}
              {getTimeData().length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado disponível para o período selecionado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SLAs por Setor (apenas na visão global) */}
        {viewType === 'global' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                SLAs por Setor (Top 8)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {getSetorData().map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium text-sm sm:text-base truncate">{item.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{item.value} SLAs</Badge>
                  </div>
                ))}
                {getSetorData().length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum dado disponível para o período selecionado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}