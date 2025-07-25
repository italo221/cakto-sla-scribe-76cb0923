import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
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
  Minus,
  Filter,
  Calendar as CalendarIcon,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Info,
  Monitor,
  X,
  Download,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type DateRange = '7dias' | '30dias' | 'mes_anterior' | 'personalizado';
type ViewType = 'global' | 'time' | 'comparativo';
type StatusFilter = 'todos' | 'abertos' | 'resolvidos' | 'atrasados';
type PriorityFilter = 'todos' | 'P0' | 'P1' | 'P2' | 'P3';

interface SLAMetrics {
  total: number;
  abertos: number;
  resolvidos: number;
  emAndamento: number;
  pausados: number;
  fechados: number;
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

interface CriticalSLA {
  id: string;
  titulo: string;
  nivel_criticidade: string;
  time_responsavel: string;
  diasAtrasado: number;
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
          <Badge 
            variant="outline" 
            className="shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200"
          >
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
    pausados: 0,
    fechados: 0,
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
  
  // Filtros avançados
  const [selectedRange, setSelectedRange] = useState<DateRange>('30dias');
  const [customDateFrom, setCustomDateFrom] = useState<Date>();
  const [customDateTo, setCustomDateTo] = useState<Date>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('todos');
  const [viewType, setViewType] = useState<ViewType>('global');
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [compareSelectedTimes, setCompareSelectedTimes] = useState<string[]>([]);
  
  // Modo TV
  const [isTVMode, setIsTVMode] = useState(false);
  const [tvCurrentView, setTvCurrentView] = useState<'overview' | 'teams'>('overview');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [viewRotationInterval, setViewRotationInterval] = useState<NodeJS.Timeout | null>(null);

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
  }, [user]);

  // Efeito para controlar auto-refresh e rotação no modo TV
  useEffect(() => {
    if (isTVMode) {
      // Auto-refresh a cada 30 segundos
      const refreshTimer = setInterval(() => {
        if (user && setores.length > 0) {
          fetchSLAMetrics();
        }
      }, 30000);
      setAutoRefreshInterval(refreshTimer);

      // Rotação entre views a cada 15 segundos
      const rotationTimer = setInterval(() => {
        setTvCurrentView(prev => prev === 'overview' ? 'teams' : 'overview');
      }, 15000);
      setViewRotationInterval(rotationTimer);

      return () => {
        if (refreshTimer) clearInterval(refreshTimer);
        if (rotationTimer) clearInterval(rotationTimer);
      };
    } else {
      // Limpar timers quando sair do modo TV
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        setAutoRefreshInterval(null);
      }
      if (viewRotationInterval) {
        clearInterval(viewRotationInterval);
        setViewRotationInterval(null);
      }
    }
  }, [isTVMode, user, setores]);

  // Função para entrar/sair do modo TV
  const toggleTVMode = () => {
    if (!isTVMode) {
      // Entrar em fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
      setIsTVMode(true);
    } else {
      // Sair do fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsTVMode(false);
    }
  };

  // Limpar timers ao desmontar componente
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) clearInterval(autoRefreshInterval);
      if (viewRotationInterval) clearInterval(viewRotationInterval);
    };
  }, []);

  useEffect(() => {
    if (user && setores.length > 0) {
      fetchSLAMetrics();
    }
  }, [user, selectedRange, customDateFrom, customDateTo, statusFilter, priorityFilter, viewType, selectedTime, compareSelectedTimes]);

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
      
      case 'mes_anterior':
        const inicioMesAtual = new Date(now.getFullYear(), now.getMonth(), 1);
        const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { 
          start: inicioMesAnterior, 
          end: inicioMesAtual,
          previousStart: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          previousEnd: inicioMesAnterior
        };
      
      case 'personalizado':
        if (customDateFrom && customDateTo) {
          const diffTime = customDateTo.getTime() - customDateFrom.getTime();
          const previousStart = new Date(customDateFrom.getTime() - diffTime);
          return { 
            start: customDateFrom, 
            end: customDateTo,
            previousStart,
            previousEnd: customDateFrom
          };
        }
        return { 
          start: today, 
          end: now,
          previousStart: new Date(today.getTime() - 24 * 60 * 60 * 1000),
          previousEnd: today
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

  const getRangeLabel = () => {
    switch (selectedRange) {
      case '7dias': return 'Últimos 7 dias';
      case '30dias': return 'Últimos 30 dias';
      case 'mes_anterior': return 'Mês anterior';
      case 'personalizado': 
        if (customDateFrom && customDateTo) {
          return `${format(customDateFrom, 'dd/MM')} - ${format(customDateTo, 'dd/MM')}`;
        }
        return 'Período personalizado';
    }
  };

  const getFilteredTimeName = () => {
    if (viewType === 'global') return 'Visão Geral';
    if (viewType === 'comparativo') return 'Modo Comparativo';
    if (selectedTime === 'all') return 'Todos os Times';
    const timeSetor = setores.find(s => s.id === selectedTime);
    return timeSetor ? timeSetor.nome : 'Time Desconhecido';
  };

  const canAccessTime = (setorId: string) => {
    if (isSuperAdmin) return true;
    return userSetores.some(us => us.setor_id === setorId);
  };

  const getAvailableTimes = () => {
    if (isSuperAdmin) return setores;
    return setores.filter(s => canAccessTime(s.id));
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

      // Aplicar filtros de time
      if (viewType === 'time' && selectedTime !== 'all') {
        currentQuery = currentQuery.eq('setor_id', selectedTime);
        previousQuery = previousQuery.eq('setor_id', selectedTime);
      } else if (viewType === 'comparativo' && compareSelectedTimes.length > 0) {
        currentQuery = currentQuery.in('setor_id', compareSelectedTimes);
        previousQuery = previousQuery.in('setor_id', compareSelectedTimes);
      } else if (!isSuperAdmin) {
        const timeIds = userSetores.map(us => us.setor_id);
        if (timeIds.length > 0) {
          currentQuery = currentQuery.in('setor_id', timeIds);
          previousQuery = previousQuery.in('setor_id', timeIds);
        } else {
          currentQuery = currentQuery.eq('setor_id', 'none');
          previousQuery = previousQuery.eq('setor_id', 'none');
        }
      }

      // Aplicar filtro de prioridade
      if (priorityFilter !== 'todos') {
        currentQuery = currentQuery.eq('nivel_criticidade', priorityFilter);
        previousQuery = previousQuery.eq('nivel_criticidade', priorityFilter);
      }

      const [currentResult, previousResult] = await Promise.all([
        currentQuery,
        previousQuery
      ]);

      if (currentResult.error) throw currentResult.error;
      if (previousResult.error) throw previousResult.error;

      let currentSlas = currentResult.data || [];
      const previousSlas = previousResult.data || [];

      // Aplicar filtro de status
      if (statusFilter !== 'todos') {
        if (statusFilter === 'abertos') {
          currentSlas = currentSlas.filter(sla => sla.status === 'aberto' || sla.status === 'em_andamento' || sla.status === 'pausado');
        } else if (statusFilter === 'resolvidos') {
          currentSlas = currentSlas.filter(sla => sla.status === 'resolvido' || sla.status === 'fechado');
        } else if (statusFilter === 'atrasados') {
          const agora = new Date();
          currentSlas = currentSlas.filter(sla => {
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
          });
        }
      }

      // Calcular métricas
      const total = currentSlas.length;
      const abertos = currentSlas.filter(sla => sla.status === 'aberto').length;
      const resolvidos = currentSlas.filter(sla => sla.status === 'resolvido').length;
      const fechados = currentSlas.filter(sla => sla.status === 'fechado').length;
      const emAndamento = currentSlas.filter(sla => sla.status === 'em_andamento').length;
      const pausados = currentSlas.filter(sla => sla.status === 'pausado').length;
      
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
        pausados,
        fechados,
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

  // SLAs críticos em destaque
  const getCriticalSLAs = (): CriticalSLA[] => {
    const agora = new Date();
    return slaData
      .filter(sla => {
        if (sla.status === 'resolvido' || sla.status === 'fechado') return false;
        if (sla.nivel_criticidade !== 'P0' && sla.nivel_criticidade !== 'P1') return false;
        
        if (sla.prazo_interno) {
          return new Date(sla.prazo_interno) < agora;
        }
        
        const dataCriacao = new Date(sla.data_criacao);
        const prazoCalculado = new Date(dataCriacao.getTime() + 24 * 60 * 60 * 1000);
        return prazoCalculado < agora;
      })
      .map(sla => {
        const dataCriacao = new Date(sla.data_criacao);
        const diasAtrasado = Math.floor((agora.getTime() - dataCriacao.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: sla.id,
          titulo: sla.titulo,
          nivel_criticidade: sla.nivel_criticidade,
          time_responsavel: sla.time_responsavel,
          diasAtrasado
        };
      })
      .sort((a, b) => b.diasAtrasado - a.diasAtrasado);
  };

  // Insights automáticos
  const getAutomatedInsights = () => {
    const insights: Array<{
      type: 'success' | 'warning' | 'error' | 'info';
      icon: any;
      message: string;
    }> = [];
    
    const criticosAtrasados = getCriticalSLAs().length;
    
    // Insight de cumprimento
    if (metrics.cumprimento >= 95) {
      insights.push({
        type: 'success',
        icon: CheckCircle,
        message: `Excelente performance! ${metrics.cumprimento.toFixed(1)}% de cumprimento de SLA.`
      });
    } else if (metrics.cumprimento >= 80) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        message: `Performance boa, mas pode melhorar: ${metrics.cumprimento.toFixed(1)}% de cumprimento.`
      });
    } else {
      insights.push({
        type: 'error',
        icon: AlertCircle,
        message: `Atenção necessária: apenas ${metrics.cumprimento.toFixed(1)}% de cumprimento de SLA.`
      });
    }
    
    // Insight de SLAs críticos
    if (criticosAtrasados === 0) {
      insights.push({
        type: 'success',
        icon: Shield,
        message: `Nenhum SLA crítico (P0/P1) em atraso.`
      });
    } else {
      insights.push({
        type: 'error',
        icon: AlertTriangle,
        message: `${criticosAtrasados} SLA${criticosAtrasados > 1 ? 's' : ''} crítico${criticosAtrasados > 1 ? 's' : ''} em atraso.`
      });
    }
    
    // Insight de tendência
    const trendChange = metrics.cumprimento - metrics.previousCumprimento;
    if (Math.abs(trendChange) > 5) {
      if (trendChange > 0) {
        insights.push({
          type: 'success',
          icon: TrendingUp,
          message: `Melhoria de ${trendChange.toFixed(1)}% no cumprimento vs período anterior.`
        });
      } else {
        insights.push({
          type: 'warning',
          icon: TrendingDown,
          message: `Queda de ${Math.abs(trendChange).toFixed(1)}% no cumprimento vs período anterior.`
        });
      }
    }
    
    return insights;
  };

  // Função para exportar para Excel
  const exportToExcel = () => {
    try {
      // Preparar dados do resumo
      const summaryData = [
        ['Métrica', 'Valor'],
        ['Total de SLAs', metrics.total],
        ['Resolvidos', metrics.resolvidos],
        ['Em Aberto', metrics.abertos + metrics.emAndamento],
        ['Atrasados', metrics.atrasados],
        ['Taxa de Cumprimento (%)', metrics.cumprimento.toFixed(1)],
        ['', ''],
        ['Período', getRangeLabel()],
        ['Filtros', getFilteredTimeName()],
        ['Data de Geração', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })]
      ];

      // Preparar dados detalhados dos SLAs
      const detailedData = [
        ['ID', 'Título', 'Status', 'Prioridade', 'Time Responsável', 'Data Criação', 'Setor']
      ];
      
      slaData.forEach(sla => {
        const setor = setores.find(s => s.id === sla.setor_id);
        detailedData.push([
          sla.id,
          sla.titulo,
          sla.status,
          sla.nivel_criticidade,
          sla.time_responsavel,
          format(new Date(sla.data_criacao), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          setor?.nome || 'N/A'
        ]);
      });

      // Preparar dados dos times
      const teamData = [['Time', 'Quantidade de SLAs']];
      getTeamData().forEach(team => {
        teamData.push([team.team, team.count.toString()]);
      });

      // Criar workbook
      const wb = XLSX.utils.book_new();
      
      // Adicionar planilhas
      const wsResumo = XLSX.utils.aoa_to_sheet(summaryData);
      const wsDetalhado = XLSX.utils.aoa_to_sheet(detailedData);
      const wsTeams = XLSX.utils.aoa_to_sheet(teamData);
      
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
      XLSX.utils.book_append_sheet(wb, wsDetalhado, 'SLAs Detalhados');
      XLSX.utils.book_append_sheet(wb, wsTeams, 'Times');

      // Salvar arquivo
      const fileName = `dashboard-sla-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Exportação concluída",
        description: "Dashboard exportado para Excel com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar para Excel.",
        variant: "destructive"
      });
    }
  };

  // Função para exportar para PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Dashboard SLA - Relatório', 20, 20);
      
      // Informações do relatório
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 20, 30);
      doc.text(`Período: ${getRangeLabel()}`, 20, 35);
      doc.text(`Filtros: ${getFilteredTimeName()}`, 20, 40);
      
      // Métricas principais
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Métricas Principais', 20, 55);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const metricsData = [
        ['Métrica', 'Valor'],
        ['Total de SLAs', metrics.total.toString()],
        ['Resolvidos', metrics.resolvidos.toString()],
        ['Em Aberto', (metrics.abertos + metrics.emAndamento).toString()],
        ['Atrasados', metrics.atrasados.toString()],
        ['Taxa de Cumprimento', `${metrics.cumprimento.toFixed(1)}%`]
      ];

      (doc as any).autoTable({
        startY: 60,
        head: [metricsData[0]],
        body: metricsData.slice(1),
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9 }
      });

      // Times responsáveis
      let currentY = (doc as any).lastAutoTable.finalY + 20;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Times Responsáveis', 20, currentY);
      
      const teamData = [['Time', 'Quantidade']];
      getTeamData().forEach(team => {
        teamData.push([team.team, team.count.toString()]);
      });

      (doc as any).autoTable({
        startY: currentY + 5,
        head: [teamData[0]],
        body: teamData.slice(1),
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9 }
      });

      // SLAs detalhados (limitado para não quebrar o PDF)
      currentY = (doc as any).lastAutoTable.finalY + 20;
      
      if (currentY < 250) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('SLAs Recentes (Últimos 10)', 20, currentY);
        
        const slaDetails = [['Título', 'Status', 'Prioridade', 'Time']];
        slaData.slice(0, 10).forEach(sla => {
          slaDetails.push([
            sla.titulo.length > 30 ? sla.titulo.substring(0, 30) + '...' : sla.titulo,
            sla.status,
            sla.nivel_criticidade,
            sla.time_responsavel.length > 15 ? sla.time_responsavel.substring(0, 15) + '...' : sla.time_responsavel
          ]);
        });

        (doc as any).autoTable({
          startY: currentY + 5,
          head: [slaDetails[0]],
          body: slaDetails.slice(1),
          margin: { left: 20, right: 20 },
          styles: { fontSize: 8 }
        });
      }

      // Salvar
      const fileName = `dashboard-sla-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      doc.save(fileName);

      toast({
        title: "Exportação concluída",
        description: "Dashboard exportado para PDF com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar para PDF:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar para PDF.",
        variant: "destructive"
      });
    }
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
            <div className="flex items-center gap-3">
              <Button 
                onClick={exportToExcel}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Excel
              </Button>
              <Button 
                onClick={exportToPDF}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                PDF
              </Button>
              <Button 
                onClick={toggleTVMode}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                Modo TV
              </Button>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-primary/20 via-primary/40 to-transparent" />
        </div>

        {/* Filtros Avançados */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5 text-primary" />
              Filtros Avançados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {/* Período */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Período</Label>
                <Select value={selectedRange} onValueChange={(value: DateRange) => setSelectedRange(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                    <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                    <SelectItem value="mes_anterior">Mês anterior</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data customizada */}
              {selectedRange === 'personalizado' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Data inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !customDateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDateFrom ? format(customDateFrom, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customDateFrom}
                          onSelect={setCustomDateFrom}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Data final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !customDateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDateTo ? format(customDateTo, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customDateTo}
                          onSelect={setCustomDateTo}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="abertos">Abertos</SelectItem>
                    <SelectItem value="resolvidos">Resolvidos</SelectItem>
                    <SelectItem value="atrasados">Atrasados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Prioridade */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Prioridade</Label>
                <Select value={priorityFilter} onValueChange={(value: PriorityFilter) => setPriorityFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="P0">P0 - Crítico</SelectItem>
                    <SelectItem value="P1">P1 - Alto</SelectItem>
                    <SelectItem value="P2">P2 - Médio</SelectItem>
                    <SelectItem value="P3">P3 - Baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Visualização */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Visualização</Label>
                <Select value={viewType} onValueChange={(value: ViewType) => setViewType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Visão Geral</SelectItem>
                    <SelectItem value="time">Por Time</SelectItem>
                    <SelectItem value="comparativo">Comparativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filtros condicionais por visualização */}
            {viewType === 'time' && (
              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selecionar Time</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Times</SelectItem>
                      {getAvailableTimes().map(setor => (
                        <SelectItem key={setor.id} value={setor.id}>
                          {setor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {viewType === 'comparativo' && (
              <div className="pt-4 border-t">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Times para Comparar</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {getAvailableTimes().map(setor => (
                      <label key={setor.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compareSelectedTimes.includes(setor.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCompareSelectedTimes([...compareSelectedTimes, setor.id]);
                            } else {
                              setCompareSelectedTimes(compareSelectedTimes.filter(id => id !== setor.id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{setor.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
              <span>Filtros ativos: {getRangeLabel()} • {getFilteredTimeName()}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRange('30dias');
                  setStatusFilter('todos');
                  setPriorityFilter('todos');
                  setViewType('global');
                  setSelectedTime('all');
                  setCompareSelectedTimes([]);
                  setCustomDateFrom(undefined);
                  setCustomDateTo(undefined);
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Insights Automáticos */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-primary" />
              Insights Automáticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {getAutomatedInsights().map((insight, index) => {
                  const IconComponent = insight.icon;
                  const colorClasses = {
                    success: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                    warning: 'text-amber-600 bg-amber-50 border-amber-200',
                    error: 'text-red-600 bg-red-50 border-red-200',
                    info: 'text-blue-600 bg-blue-50 border-blue-200'
                  };

                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border transition-all hover:shadow-sm",
                        colorClasses[insight.type]
                      )}
                    >
                      <IconComponent className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-medium">{insight.message}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

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