import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  TrendingDown,
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Calendar as CalendarIcon,
  Filter,
  Download,
  Eye,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertCircle,
  Target,
  Activity,
  BarChart3,
  Lightbulb,
  Zap,
  Monitor,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  Bar,
  ComposedChart,
  Area,
  AreaChart
} from "recharts";

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
  tempoMedioResolucao: Record<string, number>;
  // Dados para comparação com período anterior
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

interface CriticalSLA {
  id: string;
  titulo: string;
  nivel_criticidade: string;
  time_responsavel: string;
  diasAtrasado: number;
}

const COLORS = {
  P0: '#dc2626', // red-600
  P1: '#ea580c', // orange-600  
  P2: '#eab308', // yellow-500
  P3: '#16a34a'  // green-600
};

const STATUS_COLORS = {
  'aberto': '#dc2626',
  'em_andamento': '#ea580c',
  'pausado': '#eab308',
  'resolvido': '#16a34a',
  'fechado': '#6b7280'
};

const PRIORITY_LABELS = {
  'P0': 'Crítico',
  'P1': 'Alto', 
  'P2': 'Médio',
  'P3': 'Baixo'
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
    tempoMedioResolucao: {},
    previousTotal: 0,
    previousResolvidos: 0,
    previousAtrasados: 0,
    previousCumprimento: 0
  });
  
  const [slaData, setSlaData] = useState<SLAData[]>([]);
  const [previousSlaData, setPreviousSlaData] = useState<SLAData[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros avançados
  const [selectedRange, setSelectedRange] = useState<DateRange>('30dias');
  const [customDateFrom, setCustomDateFrom] = useState<Date>();
  const [customDateTo, setCustomDateTo] = useState<Date>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('todos');
  
  // Visualizações
  const [viewType, setViewType] = useState<ViewType>('global');
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [compareSelectedTimes, setCompareSelectedTimes] = useState<string[]>([]);
  
  // Modo TV
  const [isTVMode, setIsTVMode] = useState(false);
  const [tvCurrentView, setTvCurrentView] = useState<'overview' | 'teams'>('overview');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [viewRotationInterval, setViewRotationInterval] = useState<NodeJS.Timeout | null>(null);

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
  }, [user, selectedRange, customDateFrom, customDateTo, statusFilter, priorityFilter, viewType, selectedTime, compareSelectedTimes, setores]);

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
      console.error('Erro ao buscar times:', error);
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

      // Query para período anterior (comparação)
      let previousQuery = supabase
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

      setSlaData(currentSlas);
      setPreviousSlaData(previousSlas);

      // Calcular métricas do período atual
      const total = currentSlas.length;
      const abertos = currentSlas.filter(sla => sla.status === 'aberto').length;
      const resolvidos = currentSlas.filter(sla => sla.status === 'resolvido').length;
      const fechados = currentSlas.filter(sla => sla.status === 'fechado').length;
      const emAndamento = currentSlas.filter(sla => sla.status === 'em_andamento').length;
      const pausados = currentSlas.filter(sla => sla.status === 'pausado').length;
      
      // Calcular métricas do período anterior
      const previousTotal = previousSlas.length;
      const previousResolvidos = previousSlas.filter(sla => sla.status === 'resolvido' || sla.status === 'fechado').length;
      
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

      const previousAtrasados = previousSlas.filter(sla => {
        if (sla.status === 'resolvido' || sla.status === 'fechado') return false;
        
        if (sla.prazo_interno) {
          return new Date(sla.prazo_interno) < new Date(previousEnd);
        }
        
        const dataCriacao = new Date(sla.data_criacao);
        const horasLimite = {
          'P0': 24,
          'P1': 24, 
          'P2': 72,
          'P3': 168
        }[sla.nivel_criticidade] || 24;
        
        const prazoCalculado = new Date(dataCriacao.getTime() + horasLimite * 60 * 60 * 1000);
        return prazoCalculado < new Date(previousEnd);
      }).length;

      const totalResolvidos = resolvidos + fechados;
      const cumprimento = total > 0 ? (totalResolvidos / total) * 100 : 0;
      const previousCumprimento = previousTotal > 0 ? (previousResolvidos / previousTotal) * 100 : 0;

      // Calcular tempo médio de resolução por prioridade
      const tempoMedioResolucao: Record<string, number> = {};
      const slasFechados = currentSlas.filter(sla => sla.status === 'resolvido' || sla.status === 'fechado');
      
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
        tempoMedioResolucao,
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

  // Componente para indicador de tendência
  const TrendIndicator = ({ current, previous, suffix = '', isPercentage = false }: {
    current: number;
    previous: number;
    suffix?: string;
    isPercentage?: boolean;
  }) => {
    if (previous === 0) return null;
    
    const change = current - previous;
    const percentChange = (change / previous) * 100;
    const isPositive = change > 0;
    const isNeutral = change === 0;
    
    const IconComponent = isNeutral ? Minus : isPositive ? ArrowUp : ArrowDown;
    const colorClass = isNeutral ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className={`flex items-center gap-1 text-xs ${colorClass}`}>
        <IconComponent className="w-3 h-3" />
        {isPercentage ? 
          `${Math.abs(percentChange).toFixed(1)}%` : 
          `${Math.abs(change)}${suffix}`
        }
      </div>
    );
  };

  // Mini gráfico sparkline
  const Sparkline = ({ data, color = 'hsl(var(--primary))' }: { data: number[], color?: string }) => {
    const sparklineData = data.map((value, index) => ({ x: index, y: value }));
    
    return (
      <div className="w-16 h-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparklineData}>
            <Line 
              type="monotone" 
              dataKey="y" 
              stroke={color} 
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
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
    const insights: string[] = [];
    const criticosAtrasados = getCriticalSLAs().length;
    
    // Insight de cumprimento
    if (metrics.cumprimento >= 95) {
      insights.push(`✅ Excelente performance! ${metrics.cumprimento.toFixed(1)}% de cumprimento de SLA.`);
    } else if (metrics.cumprimento >= 80) {
      insights.push(`⚠️ Performance boa, mas pode melhorar: ${metrics.cumprimento.toFixed(1)}% de cumprimento.`);
    } else {
      insights.push(`🚨 Atenção necessária: apenas ${metrics.cumprimento.toFixed(1)}% de cumprimento de SLA.`);
    }
    
    // Insight de SLAs críticos
    if (criticosAtrasados === 0) {
      insights.push(`✅ Nenhum SLA crítico (P0/P1) em atraso.`);
    } else {
      insights.push(`🚨 ${criticosAtrasados} SLA${criticosAtrasados > 1 ? 's' : ''} crítico${criticosAtrasados > 1 ? 's' : ''} em atraso.`);
    }
    
    // Insight de tendência
    const trendChange = metrics.cumprimento - metrics.previousCumprimento;
    if (Math.abs(trendChange) > 5) {
      if (trendChange > 0) {
        insights.push(`📈 Melhoria de ${trendChange.toFixed(1)}% no cumprimento vs período anterior.`);
      } else {
        insights.push(`📉 Queda de ${Math.abs(trendChange).toFixed(1)}% no cumprimento vs período anterior.`);
      }
    }
    
    return insights;
  };

  // ... Resto das funções de dados (getCriticalityData, getStatusData, etc.)
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
    const { start } = getDateRange();
    const dailyCount: Record<string, number> = {};
    
    const diffTime = Math.abs(new Date().getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    for (let i = diffDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyCount[dateStr] = 0;
    }
    
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
      .slice(0, 8);
  };

  // Função específica para dados detalhados por time no modo TV
  const getDetailedTimeData = () => {
    const timeStats = slaData.reduce((acc, sla) => {
      const time = sla.time_responsavel;
      if (!acc[time]) {
        acc[time] = {
          time,
          total: 0,
          abertos: 0,
          resolvidos: 0,
          atrasados: 0,
          cumprimento: 0
        };
      }
      
      acc[time].total++;
      
      if (sla.status === 'resolvido' || sla.status === 'fechado') {
        acc[time].resolvidos++;
      } else {
        acc[time].abertos++;
      }
      
      // Verificar se está atrasado
      if (sla.prazo_interno && new Date(sla.prazo_interno) < new Date() && sla.status !== 'resolvido' && sla.status !== 'fechado') {
        acc[time].atrasados++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calcular percentual de cumprimento para cada time
    Object.values(timeStats).forEach((time: any) => {
      time.cumprimento = time.total > 0 ? (time.resolvidos / time.total) * 100 : 0;
    });

    return Object.values(timeStats)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 6);
  };

  const getComparisonData = () => {
    if (viewType !== 'comparativo' || compareSelectedTimes.length === 0) return [];
    
    return compareSelectedTimes.map(timeId => {
      const time = setores.find(s => s.id === timeId);
      const timeSlas = slaData.filter(sla => sla.setor_id === timeId);
      const resolvidos = timeSlas.filter(sla => sla.status === 'resolvido' || sla.status === 'fechado').length;
      const cumprimento = timeSlas.length > 0 ? (resolvidos / timeSlas.length) * 100 : 0;
      
      return {
        name: time?.nome || 'Desconhecido',
        total: timeSlas.length,
        resolvidos,
        cumprimento: cumprimento.toFixed(1),
        atrasados: timeSlas.filter(sla => {
          if (sla.status === 'resolvido' || sla.status === 'fechado') return false;
          
          const agora = new Date();
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
        }).length
      };
    });
  };

  const exportData = () => {
    try {
      const csvData = slaData.map(sla => ({
        'Ticket': sla.titulo,
        'Status': sla.status,
        'Prioridade': sla.nivel_criticidade,
        'Time Responsável': sla.time_responsavel,
        'Data Criação': new Date(sla.data_criacao).toLocaleDateString('pt-BR'),
        'Time': setores.find(s => s.id === sla.setor_id)?.nome || 'N/A'
      }));

      const csv = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sla-dashboard-${getRangeLabel().toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
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
      <div className="space-y-6 p-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Filtros skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-scale-in">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Render do Modo TV
  if (isTVMode) {
    return (
      <div className="fixed inset-0 bg-gray-900 text-white overflow-hidden">
        {/* Botão para sair do modo TV */}
        <button
          onClick={toggleTVMode}
          className="absolute top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Faixa de alerta para tickets críticos */}
        {getCriticalSLAs().length > 0 && (
          <div className="bg-red-600 text-white p-4 text-center animate-pulse">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold">
              <AlertTriangle className="w-8 h-8" />
              ATENÇÃO: {getCriticalSLAs().length} TICKET{getCriticalSLAs().length > 1 ? 'S' : ''} CRÍTICO{getCriticalSLAs().length > 1 ? 'S' : ''}
              <AlertTriangle className="w-8 h-8" />
            </div>
          </div>
        )}

        {/* Conteúdo principal do modo TV */}
        <div className="p-8 h-full">
          {tvCurrentView === 'overview' ? (
            // Visão Geral
            <div className="h-full flex flex-col">
              <h1 className="text-6xl font-bold text-center mb-8 text-blue-400">
                Dashboard SLA - Visão Geral
              </h1>
              
              {/* KPIs principais */}
              <div className="grid grid-cols-4 gap-8 mb-8">
                <div className="bg-gray-800 p-8 rounded-lg text-center border-l-4 border-blue-500">
                  <div className="text-5xl font-bold text-blue-400 mb-2">{metrics.total}</div>
                  <div className="text-2xl text-gray-300">Total SLAs</div>
                </div>
                <div className="bg-gray-800 p-8 rounded-lg text-center border-l-4 border-green-500">
                  <div className="text-5xl font-bold text-green-400 mb-2">{metrics.resolvidos}</div>
                  <div className="text-2xl text-gray-300">Resolvidos</div>
                </div>
                <div className="bg-gray-800 p-8 rounded-lg text-center border-l-4 border-yellow-500">
                  <div className="text-5xl font-bold text-yellow-400 mb-2">{metrics.abertos}</div>
                  <div className="text-2xl text-gray-300">Em Aberto</div>
                </div>
                <div className="bg-gray-800 p-8 rounded-lg text-center border-l-4 border-red-500">
                  <div className="text-5xl font-bold text-red-400 mb-2">{metrics.atrasados}</div>
                  <div className="text-2xl text-gray-300">Atrasados</div>
                </div>
              </div>

              {/* Cumprimento de SLA */}
              <div className="bg-gray-800 p-8 rounded-lg text-center mb-8">
                <div className="text-4xl font-bold mb-4 text-gray-300">Cumprimento de SLA</div>
                <div className={`text-7xl font-bold ${metrics.cumprimento >= 80 ? 'text-green-400' : metrics.cumprimento >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {metrics.cumprimento.toFixed(1)}%
                </div>
              </div>

              {/* Tickets críticos em destaque */}
              {getCriticalSLAs().length > 0 && (
                <div className="bg-red-900 p-6 rounded-lg">
                  <h3 className="text-3xl font-bold mb-4 text-red-300">Tickets Críticos</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {getCriticalSLAs().slice(0, 4).map((sla) => (
                      <div key={sla.id} className="bg-red-800 p-4 rounded-lg">
                        <div className="text-xl font-semibold text-white">{sla.titulo}</div>
                        <div className="text-lg text-red-200">Time: {sla.time_responsavel}</div>
                        <div className="text-lg text-red-200">Criticidade: {sla.nivel_criticidade}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Visão por Times
            <div className="h-full flex flex-col">
              <h1 className="text-6xl font-bold text-center mb-8 text-blue-400">
                Dashboard SLA - Visão por Times
              </h1>
              
              <div className="grid grid-cols-2 gap-8 flex-1">
                {getDetailedTimeData().map((time, index) => (
                  <div key={time.time} className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-3xl font-bold mb-4 text-blue-300">{time.time}</h3>
                    <div className="grid grid-cols-2 gap-4 text-xl">
                      <div>
                        <div className="text-gray-300">Total:</div>
                        <div className="text-3xl font-bold text-blue-400">{time.total}</div>
                      </div>
                      <div>
                        <div className="text-gray-300">Resolvidos:</div>
                        <div className="text-3xl font-bold text-green-400">{time.resolvidos}</div>
                      </div>
                      <div>
                        <div className="text-gray-300">Abertos:</div>
                        <div className="text-3xl font-bold text-yellow-400">{time.abertos}</div>
                      </div>
                      <div>
                        <div className="text-gray-300">Atrasados:</div>
                        <div className="text-3xl font-bold text-red-400">{time.atrasados}</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="text-gray-300">SLA:</div>
                      <div className={`text-3xl font-bold ${time.cumprimento >= 80 ? 'text-green-400' : time.cumprimento >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {time.cumprimento.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Indicador de auto-refresh */}
          <div className="absolute bottom-4 left-4 text-gray-400 text-lg">
            🔄 Atualização automática ativa
          </div>
          
          {/* Indicador da view atual */}
          <div className="absolute bottom-4 right-4 text-gray-400 text-lg">
            {tvCurrentView === 'overview' ? '📊 Visão Geral' : '👥 Visão por Times'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 sm:h-8 sm:w-8" />
            Dashboard SLA - {getFilteredTimeName()}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Acompanhe métricas, tendências e insights dos SLAs por time
            {!isSuperAdmin && " (acesso limitado aos seus times)"}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={exportData} className="hover-scale">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          )}
          <Button 
            variant={isTVMode ? "default" : "outline"} 
            size="sm" 
            onClick={toggleTVMode} 
            className="hover-scale"
          >
            {isTVMode ? <X className="w-4 h-4 mr-2" /> : <Monitor className="w-4 h-4 mr-2" />}
            {isTVMode ? 'Sair TV' : '🖥 Modo TV'}
          </Button>
          <Badge variant="secondary" className="text-xs sm:text-sm">
            <Eye className="w-3 h-3 mr-1" />
            {isSuperAdmin ? 'Super Admin' : canEdit ? 'Operador' : 'Viewer'}
          </Badge>
        </div>
      </div>

      {/* Barra de Filtros Avançados */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros Avançados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro de Período */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Período</Label>
              <Select value={selectedRange} onValueChange={(value) => setSelectedRange(value as DateRange)}>
                <SelectTrigger className="transition-all hover:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-md">
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="mes_anterior">Mês anterior</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedRange === 'personalizado' && (
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateFrom ? format(customDateFrom, 'dd/MM/yyyy') : 'De'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover border shadow-md">
                      <Calendar
                        mode="single"
                        selected={customDateFrom}
                        onSelect={setCustomDateFrom}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateTo ? format(customDateTo, 'dd/MM/yyyy') : 'Até'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover border shadow-md">
                      <Calendar
                        mode="single"
                        selected={customDateTo}
                        onSelect={setCustomDateTo}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Filtro de Prioridade */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prioridade</Label>
              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as PriorityFilter)}>
                <SelectTrigger className="transition-all hover:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-md">
                  <SelectItem value="todos">Todas as prioridades</SelectItem>
                  <SelectItem value="P0">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.P0 }}></div>
                      P0 - Crítico
                    </div>
                  </SelectItem>
                  <SelectItem value="P1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.P1 }}></div>
                      P1 - Alto
                    </div>
                  </SelectItem>
                  <SelectItem value="P2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.P2 }}></div>
                      P2 - Médio
                    </div>
                  </SelectItem>
                  <SelectItem value="P3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.P3 }}></div>
                      P3 - Baixo
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="transition-all hover:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-md">
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="abertos">Abertos</SelectItem>
                  <SelectItem value="resolvidos">Resolvidos</SelectItem>
                  <SelectItem value="atrasados">Atrasados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Visualização */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Visualização</Label>
              <Tabs value={viewType} onValueChange={(value) => setViewType(value as ViewType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="global" className="text-xs">Geral</TabsTrigger>
                  <TabsTrigger value="time" className="text-xs">Time</TabsTrigger>
                  <TabsTrigger value="comparativo" className="text-xs">Comparar</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Filtros específicos por tipo de visualização */}
          {viewType === 'time' && (
            <div className="pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selecionar Time</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger className="transition-all hover:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md">
                      <SelectItem value="all">Todos os Times</SelectItem>
                      {getAvailableTimes().map(time => (
                        <SelectItem key={time.id} value={time.id}>
                          {time.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {viewType === 'comparativo' && (
            <div className="pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selecionar Times para Comparar (máx. 4)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {getAvailableTimes().map(time => (
                    <Button
                      key={time.id}
                      variant={compareSelectedTimes.includes(time.id) ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        if (compareSelectedTimes.includes(time.id)) {
                          setCompareSelectedTimes(prev => prev.filter(id => id !== time.id));
                        } else if (compareSelectedTimes.length < 4) {
                          setCompareSelectedTimes(prev => [...prev, time.id]);
                        }
                      }}
                    >
                      {time.nome}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <Badge variant="secondary" className="text-xs">
              <CalendarIcon className="w-3 h-3 mr-1" />
              {getRangeLabel()}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {slaData.length} SLA{slaData.length !== 1 ? 's' : ''} encontrado{slaData.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SLAs Críticos em Destaque */}
      {getCriticalSLAs.length > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20 animate-scale-in">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              SLAs Críticos em Atraso ({getCriticalSLAs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getCriticalSLAs().slice(0, 4).map(sla => (
                <div 
                  key={sla.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 hover:shadow-md transition-all cursor-pointer hover-scale"
                  onClick={() => {
                    // Implementar navegação para o ticket específico
                    toast({
                      title: "Navegando para SLA",
                      description: `Abrindo SLA: ${sla.titulo}`
                    });
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="destructive" 
                        className="text-xs"
                        style={{ backgroundColor: COLORS[sla.nivel_criticidade as keyof typeof COLORS] }}
                      >
                        {sla.nivel_criticidade}
                      </Badge>
                      <span className="text-sm font-medium truncate">{sla.titulo}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {sla.time_responsavel} • {sla.diasAtrasado} dia{sla.diasAtrasado !== 1 ? 's' : ''} de atraso
                    </div>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                </div>
              ))}
            </div>
            {getCriticalSLAs.length > 4 && (
              <div className="mt-3 text-center">
                <Button variant="outline" size="sm" className="text-xs">
                  Ver todos os {getCriticalSLAs.length} SLAs críticos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Insights Automáticos */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20 animate-scale-in">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Lightbulb className="h-5 w-5" />
            Insights Automáticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getAutomatedInsights().map((insight, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border hover:shadow-md transition-all"
              >
                <Zap className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{insight}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métricas principais com tendências */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="hover:shadow-lg transition-all duration-300 hover-scale animate-scale-in">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total SLAs</p>
                <p className="text-xl sm:text-2xl font-bold">{metrics.total}</p>
                <TrendIndicator current={metrics.total} previous={metrics.previousTotal} />
              </div>
              <div className="flex flex-col items-end gap-2">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                <Sparkline data={getDailyData().map(d => d.count)} color="#2563eb" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover-scale animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Resolvidos</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {metrics.resolvidos + metrics.fechados}
                </p>
                <TrendIndicator 
                  current={metrics.resolvidos + metrics.fechados} 
                  previous={metrics.previousResolvidos} 
                />
              </div>
              <div className="flex flex-col items-end gap-2">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                <Sparkline 
                  data={getDailyData().map(d => Math.floor(d.count * 0.8))} 
                  color="#16a34a" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover-scale animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Em Aberto</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">
                  {metrics.abertos + metrics.emAndamento + metrics.pausados}
                </p>
                <TrendIndicator 
                  current={metrics.abertos + metrics.emAndamento + metrics.pausados} 
                  previous={metrics.previousTotal - metrics.previousResolvidos} 
                />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                <Sparkline 
                  data={getDailyData().map(d => Math.floor(d.count * 0.3))} 
                  color="#ea580c" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover-scale animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Atrasados</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{metrics.atrasados}</p>
                <TrendIndicator 
                  current={metrics.atrasados} 
                  previous={metrics.previousAtrasados} 
                />
              </div>
              <div className="flex flex-col items-end gap-2">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                <Sparkline 
                  data={getDailyData().map(d => Math.floor(d.count * 0.1))} 
                  color="#dc2626" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumprimento de SLA com destaque */}
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Cumprimento de SLA
            <TrendIndicator 
              current={metrics.cumprimento} 
              previous={metrics.previousCumprimento} 
              isPercentage 
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl sm:text-5xl font-bold text-green-600 mb-2">
              {metrics.cumprimento.toFixed(1)}%
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              {metrics.resolvidos + metrics.fechados} de {metrics.total} SLAs resolvidos
            </p>
            <div className="w-full bg-muted rounded-full h-3 mb-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(metrics.cumprimento, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>Meta: 95%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modo Comparativo */}
      {viewType === 'comparativo' && compareSelectedTimes.length > 0 && (
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Comparação entre Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getComparisonData()}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Total SLAs" />
                  <Bar dataKey="resolvidos" fill="#16a34a" name="Resolvidos" />
                  <Bar dataKey="atrasados" fill="#dc2626" name="Atrasados" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tempo Médio de Resolução por Prioridade */}
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tempo Médio de Resolução por Prioridade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {['P0', 'P1', 'P2', 'P3'].map((prioridade, index) => {
              const tempo = metrics.tempoMedioResolucao[prioridade] || 0;
              const tempoFormatado = tempo > 24 
                ? `${(tempo / 24).toFixed(1)}d`
                : `${tempo.toFixed(1)}h`;

              return (
                <div 
                  key={prioridade} 
                  className="text-center p-4 bg-gradient-to-br from-muted/30 to-muted/60 rounded-lg hover:shadow-md transition-all hover-scale animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: COLORS[prioridade as keyof typeof COLORS] }}
                    ></div>
                    <span className="font-medium text-sm">{prioridade}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold mb-1">{tempoFormatado}</div>
                  <div className="text-xs text-muted-foreground">
                    {PRIORITY_LABELS[prioridade as keyof typeof PRIORITY_LABELS]}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Temporal dos SLAs */}
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            SLAs Criados por Dia - {getRangeLabel()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={getDailyData()}>
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
                <Area
                  type="monotone"
                  dataKey="count"
                  fill="url(#colorGradient)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos em Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* SLAs por Criticidade */}
        <Card className="animate-scale-in">
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
        <Card className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
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
      </div>

      {/* SLAs por Time */}
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            SLAs por Time (Top 8)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {getTimeData().map((item, index) => (
              <div 
                key={item.name} 
                className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/60 rounded-lg hover:shadow-md transition-all cursor-pointer hover-scale animate-scale-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium text-sm sm:text-base truncate">{item.name}</span>
                </div>
                <Badge variant="outline" className="text-xs font-medium">
                  {item.value} SLA{item.value !== 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
            {getTimeData().length === 0 && (
              <p className="text-center text-muted-foreground py-8 col-span-2">
                Nenhum dado disponível para o período selecionado
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}