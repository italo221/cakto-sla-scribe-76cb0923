import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3,
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Briefcase,
  Shield,
  Zap,
  RefreshCw,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { cn } from "@/lib/utils";

interface SLAMetrics {
  total: number;
  abertos: number;
  resolvidos: number;
  emAndamento: number;
  atrasados: number;
  cumprimento: number;
  previousTotal: number;
  previousResolvidos: number;
  previousAtrasados: number;
  previousCumprimento: number;
}

interface SLAData {
  id: string;
  titulo: string;
  status: string;
  nivel_criticidade: string;
  time_responsavel: string;
  data_criacao: string;
  setor_id: string;
  prazo_interno?: string;
}

interface Setor {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

const PRIORITY_COLORS = {
  P0: 'hsl(0 84% 60%)', // red
  P1: 'hsl(25 95% 53%)', // orange
  P2: 'hsl(48 96% 53%)', // yellow
  P3: 'hsl(142 76% 36%)' // green
};

const STATUS_COLORS = {
  'aberto': 'hsl(0 84% 60%)',
  'em_andamento': 'hsl(25 95% 53%)',
  'pausado': 'hsl(48 96% 53%)',
  'resolvido': 'hsl(142 76% 36%)',
  'fechado': 'hsl(220 13% 69%)'
};

// Componente para indicadores de tendência
const TrendIndicator = ({ current, previous, isGoodTrend = true }: {
  current: number;
  previous: number;
  isGoodTrend?: boolean;
}) => {
  if (previous === 0) return null;
  
  const change = current - previous;
  const percentChange = Math.abs((change / previous) * 100);
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  let IconComponent = Minus;
  let colorClass = 'text-muted-foreground';
  
  if (!isNeutral) {
    const isTrendGood = isGoodTrend ? isPositive : !isPositive;
    IconComponent = isPositive ? ArrowUp : ArrowDown;
    colorClass = isTrendGood ? 'text-emerald-600' : 'text-red-600';
  }
  
  return (
    <div className={cn("flex items-center gap-1 text-xs font-medium", colorClass)}>
      <IconComponent className="w-3 h-3" />
      {percentChange.toFixed(1)}%
    </div>
  );
};

// Componente de KPI moderno
const ModernKPICard = ({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  iconColor,
  trend,
  isLoading = false 
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  iconColor: string;
  trend?: React.ReactNode;
  isLoading?: boolean;
}) => {
  if (isLoading) {
    return (
      <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-foreground tracking-tight">{value}</h3>
              {trend}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div 
            className="p-3 rounded-xl transition-transform group-hover:scale-110"
            style={{ backgroundColor: iconColor + '20' }}
          >
            <Icon className="w-6 h-6" style={{ color: iconColor }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de barra de progresso moderna
const ModernProgressBar = ({ value, label, isLoading = false }: {
  value: number;
  label: string;
  isLoading?: boolean;
}) => {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-8 w-20" />
        </CardContent>
      </Card>
    );
  }

  const getColorForValue = (val: number) => {
    if (val >= 95) return 'hsl(142 76% 36%)'; // green
    if (val >= 80) return 'hsl(48 96% 53%)'; // yellow
    return 'hsl(0 84% 60%)'; // red
  };

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{label}</h3>
          <Target className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Progresso em relação à meta de 95%</span>
            <span className="text-2xl font-bold" style={{ color: getColorForValue(value) }}>
              {value.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ 
                width: `${Math.min(value, 100)}%`,
                background: `linear-gradient(90deg, ${getColorForValue(value)}, ${getColorForValue(value)}90)`
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de card de time moderno
const ModernTeamCard = ({ 
  teamName, 
  count, 
  icon: Icon, 
  iconColor,
  isLoading = false 
}: {
  teamName: string;
  count: number;
  icon: any;
  iconColor: string;
  isLoading?: boolean;
}) => {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-6 w-8 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg transition-transform group-hover:scale-110"
            style={{ backgroundColor: iconColor + '20' }}
          >
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground truncate">{teamName}</p>
            <p className="text-xs text-muted-foreground">Time responsável</p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {count}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default function ModernSLADashboard() {
  const { user, isSuperAdmin, setores: userSetores } = useAuth();
  const [metrics, setMetrics] = useState<SLAMetrics>({
    total: 0,
    abertos: 0,
    resolvidos: 0,
    emAndamento: 0,
    atrasados: 0,
    cumprimento: 0,
    previousTotal: 0,
    previousResolvidos: 0,
    previousAtrasados: 0,
    previousCumprimento: 0
  });
  
  const [slaData, setSlaData] = useState<SLAData[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<string>('30dias');

  // Ícones para diferentes times
  const getTeamIcon = (teamName: string) => {
    const name = teamName.toLowerCase();
    if (name.includes('compliance') || name.includes('legal')) return Shield;
    if (name.includes('juridico') || name.includes('jurídico')) return Briefcase;
    if (name.includes('ti') || name.includes('tech')) return Zap;
    if (name.includes('rh') || name.includes('pessoas')) return Users;
    return Activity;
  };

  const getTeamColor = (index: number) => {
    const colors = [
      'hsl(142 76% 36%)', // green
      'hsl(221 83% 53%)', // blue
      'hsl(262 83% 58%)', // purple
      'hsl(25 95% 53%)', // orange
      'hsl(346 87% 43%)', // pink
      'hsl(173 80% 40%)' // teal
    ];
    return colors[index % colors.length];
  };

  useEffect(() => {
    if (user) {
      fetchSetores();
      fetchSLAMetrics();
    }
  }, [user, selectedRange]);

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

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (selectedRange) {
      case '7dias':
        const seteDiasAtras = new Date(today);
        seteDiasAtras.setDate(today.getDate() - 7);
        return { 
          start: seteDiasAtras, 
          end: now,
          previousStart: new Date(seteDiasAtras.getTime() - 7 * 24 * 60 * 60 * 1000),
          previousEnd: seteDiasAtras
        };
      
      case '30dias':
        const trintaDiasAtras = new Date(today);
        trintaDiasAtras.setDate(today.getDate() - 30);
        return { 
          start: trintaDiasAtras, 
          end: now,
          previousStart: new Date(trintaDiasAtras.getTime() - 30 * 24 * 60 * 60 * 1000),
          previousEnd: trintaDiasAtras
        };
      
      default:
        return { 
          start: today, 
          end: now,
          previousStart: new Date(today.getTime() - 24 * 60 * 60 * 1000),
          previousEnd: today
        };
    }
  };

  const fetchSLAMetrics = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { start, end, previousStart, previousEnd } = getDateRange();
      
      // Query para período atual
      let currentQuery = supabase
        .from('sla_demandas')
        .select('*')
        .gte('data_criacao', start.toISOString())
        .lte('data_criacao', end.toISOString());

      // Query para período anterior
      let previousQuery = supabase
        .from('sla_demandas')
        .select('*')
        .gte('data_criacao', previousStart.toISOString())
        .lte('data_criacao', previousEnd.toISOString());

      // Aplicar filtros de acesso para não super admins
      if (!isSuperAdmin) {
        const timeIds = userSetores.map(us => us.setor_id);
        if (timeIds.length > 0) {
          currentQuery = currentQuery.in('setor_id', timeIds);
          previousQuery = previousQuery.in('setor_id', timeIds);
        }
      }

      const [currentResult, previousResult] = await Promise.all([
        currentQuery,
        previousQuery
      ]);

      if (currentResult.error) throw currentResult.error;
      if (previousResult.error) throw previousResult.error;

      const currentSlas = currentResult.data || [];
      const previousSlas = previousResult.data || [];

      // Calcular métricas
      const total = currentSlas.length;
      const abertos = currentSlas.filter(sla => sla.status === 'aberto').length;
      const resolvidos = currentSlas.filter(sla => sla.status === 'resolvido').length;
      const emAndamento = currentSlas.filter(sla => sla.status === 'em_andamento').length;
      
      // Calcular atrasos
      const agora = new Date();
      const atrasados = currentSlas.filter(sla => {
        if (sla.status === 'resolvido' || sla.status === 'fechado') return false;
        
        if (sla.prazo_interno) {
          return new Date(sla.prazo_interno) < agora;
        }
        
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

      const totalResolvidos = currentSlas.filter(sla => sla.status === 'resolvido' || sla.status === 'fechado').length;
      const cumprimento = total > 0 ? (totalResolvidos / total) * 100 : 0;

      // Métricas do período anterior
      const previousTotal = previousSlas.length;
      const previousResolvidos = previousSlas.filter(sla => sla.status === 'resolvido' || sla.status === 'fechado').length;
      const previousAtrasados = previousSlas.filter(sla => sla.status !== 'resolvido' && sla.status !== 'fechado').length;
      const previousCumprimento = previousTotal > 0 ? (previousResolvidos / previousTotal) * 100 : 0;

      setSlaData(currentSlas);
      setMetrics({
        total,
        abertos,
        resolvidos,
        emAndamento,
        atrasados,
        cumprimento,
        previousTotal,
        previousResolvidos,
        previousAtrasados,
        previousCumprimento
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

  const getPriorityData = () => {
    const priorityCount = slaData.reduce((acc, sla) => {
      acc[sla.nivel_criticidade] = (acc[sla.nivel_criticidade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(priorityCount).map(([priority, count]) => ({
      name: priority,
      value: count,
      color: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS]
    }));
  };

  const getTeamData = () => {
    const teamCount = slaData.reduce((acc, sla) => {
      acc[sla.time_responsavel] = (acc[sla.time_responsavel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(teamCount)
      .map(([team, count]) => ({ team, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header com hierarquia visual clara */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground tracking-tight">
                Dashboard SLA
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                Monitoramento em tempo real dos acordos de nível de serviço
              </p>
            </div>
            <Select value={selectedRange} onValueChange={setSelectedRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="h-px bg-gradient-to-r from-primary/20 via-primary/40 to-transparent" />
        </div>

        {/* KPIs principais */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-1">Métricas Principais</h2>
            <p className="text-sm text-muted-foreground">Indicadores-chave de performance do sistema</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ModernKPICard
              title="Total de SLAs"
              value={metrics.total}
              subtitle="Tickets cadastrados no período"
              icon={BarChart3}
              iconColor="hsl(221 83% 53%)"
              trend={<TrendIndicator current={metrics.total} previous={metrics.previousTotal} />}
              isLoading={loading}
            />
            
            <ModernKPICard
              title="Resolvidos"
              value={metrics.resolvidos}
              subtitle="Tickets finalizados com sucesso"
              icon={CheckCircle2}
              iconColor="hsl(142 76% 36%)"
              trend={<TrendIndicator current={metrics.resolvidos} previous={metrics.previousResolvidos} />}
              isLoading={loading}
            />
            
            <ModernKPICard
              title="Em Aberto"
              value={metrics.abertos + metrics.emAndamento}
              subtitle="Aguardando resolução"
              icon={Clock}
              iconColor="hsl(48 96% 53%)"
              trend={<TrendIndicator current={metrics.abertos} previous={metrics.previousTotal - metrics.previousResolvidos} isGoodTrend={false} />}
              isLoading={loading}
            />
            
            <ModernKPICard
              title="Atrasados"
              value={metrics.atrasados}
              subtitle="Fora do prazo estabelecido"
              icon={AlertTriangle}
              iconColor="hsl(0 84% 60%)"
              trend={<TrendIndicator current={metrics.atrasados} previous={metrics.previousAtrasados} isGoodTrend={false} />}
              isLoading={loading}
            />
          </div>
        </div>

        {/* Gráficos e análises */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cumprimento de SLA */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Cumprimento de SLA</h2>
                <p className="text-sm text-muted-foreground">Performance atual do sistema</p>
              </div>
              <ModernProgressBar 
                value={metrics.cumprimento} 
                label="Taxa de Sucesso"
                isLoading={loading}
              />
            </div>
          </div>

          {/* Gráfico de Prioridades */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Distribuição por Prioridade</h2>
              <p className="text-sm text-muted-foreground">Classificação dos tickets por nível de criticidade</p>
            </div>
            
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getPriorityData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {getPriorityData().map((entry, index) => (
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SLAs por Time */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">Times Responsáveis</h2>
            <p className="text-sm text-muted-foreground">Distribuição de tickets por equipe</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <ModernTeamCard
                  key={i}
                  teamName=""
                  count={0}
                  icon={Users}
                  iconColor=""
                  isLoading={true}
                />
              ))
            ) : (
              getTeamData().map((team, index) => (
                <ModernTeamCard
                  key={team.team}
                  teamName={team.team}
                  count={team.count}
                  icon={getTeamIcon(team.team)}
                  iconColor={getTeamColor(index)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}