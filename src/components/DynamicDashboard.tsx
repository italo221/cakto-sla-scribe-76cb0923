import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { DashboardCustomizer } from "./DashboardCustomizer";
import TagTrendChart from "./TagTrendChart";
import { TagAnalyticsChart } from "./TagAnalyticsChart";
import { SLAResolutionTimeChart } from "./SLAResolutionTimeChart";
import {
  Settings,
  BarChart3,
  PieChart,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Target,
  Activity,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Palette,
  TrendingDown,
  Minus,
  Monitor,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { GlassTooltip } from "@/components/ui/glass-tooltip";

interface DashboardWidget {
  id: string;
  name: string;
  type: 'kpi' | 'chart' | 'table';
  icon: any;
  visible: boolean;
  position: number;
}

interface DashboardData {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  overdueTickets: number;
  slaCompliance: number;
  statusData: Array<{ name: string; value: number; color: string }>;
  priorityData: Array<{ name: string; value: number; color: string }>;
  teamData: Array<{ name: string; tickets: number; color: string }>;
}

const defaultWidgets: DashboardWidget[] = [
  { id: 'total-tickets', name: 'Total de Tickets', type: 'kpi', icon: Activity, visible: true, position: 0 },
  { id: 'open-tickets', name: 'Tickets Abertos', type: 'kpi', icon: AlertTriangle, visible: true, position: 1 },
  { id: 'sla-compliance', name: 'Cumprimento SLA', type: 'kpi', icon: Target, visible: true, position: 2 },
  { id: 'overdue-tickets', name: 'Tickets Atrasados', type: 'kpi', icon: Clock, visible: true, position: 3 },
  { id: 'tag-analytics', name: 'Tags – Volume de Tickets', type: 'chart', icon: Activity, visible: true, position: 4 },
  { id: 'sla-resolution-time', name: 'Tempo de Resolução do SLA', type: 'chart', icon: Clock, visible: true, position: 5 },
  { id: 'status-chart', name: 'Distribuição por Status', type: 'chart', icon: PieChart, visible: true, position: 6 },
  { id: 'priority-chart', name: 'Tickets por Prioridade', type: 'chart', icon: BarChart3, visible: true, position: 7 },
  { id: 'team-chart', name: 'Gráfico por Equipe', type: 'chart', icon: Users, visible: false, position: 8 },
];

export default function DynamicDashboard() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    overdueTickets: 0,
    slaCompliance: 0,
    statusData: [],
    priorityData: [],
    teamData: []
  });
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<Array<{setor_id: string; p0_hours: number; p1_hours: number; p2_hours: number; p3_hours: number}>>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [dateFilter, setDateFilter] = useState('30days');
  const [teamDateFilter, setTeamDateFilter] = useState('30days');
  const [teamData, setTeamData] = useState<Array<{ name: string; tickets: number; color: string }>>([]);
  const [slaTrend, setSlaTrend] = useState<number>(0);

  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();


  useEffect(() => {
    loadSLAPolicies();
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadUserPreferences();
  }, [dateFilter, policies]);

  useEffect(() => {
    loadTeamData();
  }, [teamDateFilter]);

  const loadSLAPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('sla_policies')
        .select('setor_id, p0_hours, p1_hours, p2_hours, p3_hours');

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error('Erro ao carregar políticas SLA:', error);
    }
  };

  // Função para calcular tendência SLA
  const calculateSLATrend = useCallback(async () => {
    try {
      if (policies.length === 0) return;
      
      const endDate = new Date();
      const startCurrentPeriod = new Date();
      startCurrentPeriod.setDate(endDate.getDate() - 30); // Últimos 30 dias
      
      const startPreviousPeriod = new Date(startCurrentPeriod);
      startPreviousPeriod.setDate(startCurrentPeriod.getDate() - 30); // 30 dias anteriores
      const endPreviousPeriod = new Date(startCurrentPeriod);

      // Buscar tickets do período anterior
      const { data: previousTickets } = await supabase
        .from('sla_demandas')
        .select('*')
        .gte('data_criacao', startPreviousPeriod.toISOString())
        .lt('data_criacao', endPreviousPeriod.toISOString());

      if (previousTickets && previousTickets.length > 0) {
        // Calcular SLA compliance do período anterior usando a mesma lógica
        const previousResolvedTickets = previousTickets.filter(t => 
          ['resolvido', 'fechado'].includes(t.status?.toString()?.toLowerCase())
        );
        
        if (previousResolvedTickets.length > 0) {
          const previousOnTimeTickets = previousResolvedTickets.filter(t => {
            const createdAt = new Date(t.data_criacao);
            const resolvedAt = new Date(t.updated_at);
            
            if (t.prazo_interno) {
              return resolvedAt <= new Date(t.prazo_interno);
            }
            
            const setorPolicy = policies.find(p => p.setor_id === t.setor_id);
            let slaHours = 168;
            
            if (setorPolicy) {
              slaHours = {
                'P0': setorPolicy.p0_hours,
                'P1': setorPolicy.p1_hours,
                'P2': setorPolicy.p2_hours,
                'P3': setorPolicy.p3_hours
              }[t.nivel_criticidade] || setorPolicy.p3_hours;
            } else {
              slaHours = {
                'P0': 4, 'P1': 24, 'P2': 72, 'P3': 168
              }[t.nivel_criticidade] || 168;
            }
            
            const slaDeadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
            return resolvedAt <= slaDeadline;
          });
          
          const previousSLACompliance = (previousOnTimeTickets.length / previousResolvedTickets.length) * 100;
          const currentSLACompliance = dashboardData.slaCompliance;
          const trend = currentSLACompliance - previousSLACompliance;
          
          setSlaTrend(Math.round(trend * 10) / 10);
        }
      }
    } catch (error) {
      console.error('Erro ao calcular tendência SLA:', error);
      setSlaTrend(0);
    }
  }, [policies, dashboardData.slaCompliance]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const now = new Date();
      const daysAgo = dateFilter === '7days' ? 7 : dateFilter === '30days' ? 30 : 90;
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const { data: tickets, error } = await supabase
        .from('sla_demandas')
        .select('*')
        .gte('data_criacao', startDate.toISOString());

      if (error) throw error;

      // Process data
      const totalTickets = tickets?.length || 0;
      const openTickets = tickets?.filter(t => t.status === 'aberto').length || 0;
      const inProgressTickets = tickets?.filter(t => t.status === 'em_andamento').length || 0;
      const resolvedTickets = tickets?.filter(t => t.status === 'resolvido').length || 0;
      const closedTickets = tickets?.filter(t => t.status === 'fechado').length || 0;
      
      // Calculate overdue tickets (simplified logic)
      const overdueTickets = tickets?.filter(t => {
        if (t.status === 'resolvido' || t.status === 'fechado') return false;
        
        // Verificar se há prazo interno definido
        if (t.prazo_interno) {
          return new Date(t.prazo_interno) < now;
        }
        
        // Senão, usar políticas SLA por setor e criticidade
        const createdAt = new Date(t.data_criacao);
        const hoursOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
        // Buscar política SLA do setor específico
        const setorPolicy = policies.find(p => p.setor_id === t.setor_id);
        let slaHours = 168; // padrão P3
        
        if (setorPolicy) {
          slaHours = {
            'P0': setorPolicy.p0_hours,
            'P1': setorPolicy.p1_hours,
            'P2': setorPolicy.p2_hours,
            'P3': setorPolicy.p3_hours
          }[t.nivel_criticidade] || setorPolicy.p3_hours;
        } else {
          // Padrões gerais se não houver política específica
          slaHours = {
            'P0': 4,   // Crítico: 4 horas
            'P1': 24,  // Alto: 24 horas
            'P2': 72,  // Médio: 72 horas
            'P3': 168  // Baixo: 168 horas
          }[t.nivel_criticidade] || 168;
        }
        
        return hoursOld > slaHours;
      }).length || 0;

      // Calcular tickets resolvidos dentro do prazo para SLA correto
      const resolvedTicketsOnTime = tickets?.filter(t => {
        if (t.status !== 'resolvido' && t.status !== 'fechado') return false;
        if (!t.updated_at) return false; // Sem data de resolução
        
        const createdAt = new Date(t.data_criacao);
        const resolvedAt = new Date(t.updated_at);
        
        // Verificar se há prazo interno definido
        if (t.prazo_interno) {
          return resolvedAt <= new Date(t.prazo_interno);
        }
        
        // Buscar política SLA do setor específico
        const setorPolicy = policies.find(p => p.setor_id === t.setor_id);
        let slaHours = 168; // padrão P3
        
        if (setorPolicy) {
          slaHours = {
            'P0': setorPolicy.p0_hours,
            'P1': setorPolicy.p1_hours,
            'P2': setorPolicy.p2_hours,
            'P3': setorPolicy.p3_hours
          }[t.nivel_criticidade] || setorPolicy.p3_hours;
        } else {
          // Padrões gerais se não houver política específica
          slaHours = {
            'P0': 4,   // Crítico: 4 horas
            'P1': 24,  // Alto: 24 horas
            'P2': 72,  // Médio: 72 horas
            'P3': 168  // Baixo: 168 horas
          }[t.nivel_criticidade] || 168;
        }
        
        const slaDeadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
        return resolvedAt <= slaDeadline;
      }).length || 0;

      // SLA Compliance = tickets resolvidos dentro do prazo / total de tickets resolvidos
      // Essa é a fórmula padrão para cumprimento de SLA
      const totalResolvedTickets = resolvedTickets + closedTickets;
      
      let slaCompliance;
      if (totalResolvedTickets > 0) {
        // Calcula a porcentagem dos tickets resolvidos que foram resolvidos dentro do prazo
        slaCompliance = (resolvedTicketsOnTime / totalResolvedTickets) * 100;
      } else {
        // Se não há tickets resolvidos, considera SLA como 0% (não há dados para calcular)
        slaCompliance = 0;
      }
      
      // Log para debug das métricas de SLA
      console.log('📊 DynamicDashboard SLA Debug:', {
        ticketsLength: tickets?.length || 0,
        totalTickets,
        totalResolvedTickets,
        resolvedTicketsOnTime,
        slaCompliance: slaCompliance.toFixed(1) + '%',
        overdueTickets,
        dateFilter: 'não filtrado por data',
        setor: 'todos'
      });


      // Status data with padronized colors as requested
      const statusData = [
        { name: 'Abertos', value: openTickets, color: 'hsl(0 0% 100%)' }, // branco
        { name: 'Em Andamento', value: inProgressTickets, color: 'hsl(221 83% 53%)' }, // azul
        { name: 'Resolvidos', value: resolvedTickets, color: 'hsl(142 76% 36%)' }, // verde
        { name: 'Fechados', value: closedTickets, color: 'hsl(215 28% 17%)' }, // tom escuro (cinza/charcoal)
        { name: 'Atrasados', value: overdueTickets, color: 'hsl(0 84% 60%)' }, // vermelho
      ].filter(item => item.value > 0);

      // Priority data with semantic colors
      const priorityData = [
        { name: 'P0 - Crítico', value: tickets?.filter(t => t.nivel_criticidade === 'P0').length || 0, color: 'hsl(var(--kpi-critical))' },
        { name: 'P1 - Alto', value: tickets?.filter(t => t.nivel_criticidade === 'P1').length || 0, color: 'hsl(var(--kpi-overdue))' },
        { name: 'P2 - Médio', value: tickets?.filter(t => t.nivel_criticidade === 'P2').length || 0, color: 'hsl(var(--kpi-progress))' },
        { name: 'P3 - Baixo', value: tickets?.filter(t => t.nivel_criticidade === 'P3').length || 0, color: 'hsl(var(--kpi-resolved))' },
      ].filter(item => item.value > 0);

      // Team data with semantic colors and date filtering
      const teamCounts = tickets?.reduce((acc, ticket) => {
        const team = ticket.time_responsavel || 'Não Atribuído';
        acc[team] = (acc[team] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const chartColors = [
        'hsl(var(--chart-color-1))',
        'hsl(var(--chart-color-2))',
        'hsl(var(--chart-color-3))',
        'hsl(var(--chart-color-4))',
        'hsl(var(--chart-color-5))'
      ];

      const teamData = Object.entries(teamCounts).map(([name, tickets], index) => ({
        name,
        tickets,
        color: chartColors[index % chartColors.length]
      }));

      setDashboardData({
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        overdueTickets,
        slaCompliance,
        statusData,
        priorityData,
        teamData
      });

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Houve um problema ao carregar os dados do dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Usar useEffect para calcular tendência quando dados mudarem
  useEffect(() => {
    if (policies.length > 0 && dashboardData.slaCompliance >= 0) {
      calculateSLATrend();
    }
  }, [calculateSLATrend]);

  const loadTeamData = async () => {
    try {
      // Calculate date range for team chart
      const now = new Date();
      const daysAgo = teamDateFilter === '7days' ? 7 : teamDateFilter === '30days' ? 30 : 90;
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const { data: tickets, error } = await supabase
        .from('sla_demandas')
        .select('time_responsavel')
        .gte('data_criacao', startDate.toISOString());

      if (error) throw error;

      // Team data with semantic colors
      const teamCounts = tickets?.reduce((acc, ticket) => {
        const team = ticket.time_responsavel || 'Não Atribuído';
        acc[team] = (acc[team] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const chartColors = [
        'hsl(var(--chart-color-1))',
        'hsl(var(--chart-color-2))',
        'hsl(var(--chart-color-3))',
        'hsl(var(--chart-color-4))',
        'hsl(var(--chart-color-5))'
      ];

      const teamDataResult = Object.entries(teamCounts).map(([name, tickets], index) => ({
        name,
        tickets,
        color: chartColors[index % chartColors.length]
      }));

      setTeamData(teamDataResult);

    } catch (error) {
      console.error('Erro ao carregar dados da equipe:', error);
    }
  };

  const loadUserPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', `dashboard_widgets_${user.id}`)
        .single();

      if (!error && data) {
        const savedWidgets = data.setting_value as any;
        if (Array.isArray(savedWidgets)) {
          // Merge saved preferences with default widgets to restore icon components
          const mergedWidgets = defaultWidgets.map(defaultWidget => {
            const savedWidget = savedWidgets.find(sw => sw.id === defaultWidget.id);
            return savedWidget 
              ? { ...defaultWidget, ...savedWidget, icon: defaultWidget.icon }
              : defaultWidget;
          });
          setWidgets(mergedWidgets);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.log('Nenhuma preferência salva encontrada');
    }
  };

  const saveUserPreferences = async () => {
    if (!user) return;

    try {
      const widgetsData = widgets.map(w => ({
        id: w.id,
        name: w.name,
        type: w.type,
        visible: w.visible,
        position: w.position
      }));

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: `dashboard_widgets_${user.id}`,
          setting_value: widgetsData as any,
          created_by: user.id,
          updated_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Preferências salvas",
        description: "Suas preferências de dashboard foram salvas.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas preferências.",
        variant: "destructive",
      });
    }
  };

  const toggleWidget = (widgetId: string) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    ));
  };

  const visibleWidgets = widgets.filter(w => w.visible).sort((a, b) => a.position - b.position);

  const renderKPICard = (widget: DashboardWidget) => {
    let value: number | string = 0;
    let iconColorClass = 'text-gray-400';
    let cardAccentClass = '';
    
    switch (widget.id) {
      case 'total-tickets':
        value = dashboardData.totalTickets;
        iconColorClass = 'text-gray-400';
        cardAccentClass = '';
        break;
      case 'open-tickets':
        value = dashboardData.openTickets;
        iconColorClass = 'text-blue-400';
        cardAccentClass = 'bg-blue-500/5 border-blue-500/20';
        break;
      case 'sla-compliance':
        value = Math.round(dashboardData.slaCompliance);
        if (value < 80) {
          iconColorClass = 'text-red-400';
          cardAccentClass = 'bg-red-500/5 border-red-500/20';
        } else {
          iconColorClass = 'text-green-400';
          cardAccentClass = 'bg-green-500/5 border-green-500/20';
        }
        break;
      case 'overdue-tickets':
        const overduePercentage = dashboardData.totalTickets > 0 
          ? ((dashboardData.overdueTickets / dashboardData.totalTickets) * 100).toFixed(1) 
          : '0';
        value = overduePercentage;
        iconColorClass = 'text-red-400';
        cardAccentClass = 'bg-red-500/5 border-red-500/20';
        break;
    }

    const IconComponent = widget.icon;

    return (
      <MetricCard
        key={widget.id}
        label={widget.name}
        value={widget.id === 'sla-compliance' || widget.id === 'overdue-tickets' ? `${value}%` : value.toLocaleString()}
        icon={IconComponent}
      />
    );
  };

  const renderChart = (widget: DashboardWidget) => {
    switch (widget.id) {
      case 'tag-analytics':
        return (
          <div key={widget.id} className="col-span-full">
            <TagAnalyticsChart 
              dateFilter={dateFilter}
              selectedSetor={undefined}
              setores={[]}
            />
          </div>
        );

      case 'sla-resolution-time':
        return (
          <SLAResolutionTimeChart 
            key={widget.id}
            dateFilter={dateFilter}
            selectedSetor={undefined}
            setores={[]}
          />
        );

      case 'status-chart':
        return (
          <div 
            key={widget.id} 
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-8"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-1">Distribuição por status</h3>
              <p className="text-sm text-gray-400">
                Visualização dos tickets por status atual
              </p>
            </div>
            
            <div className="min-h-[300px]">
              <ResponsiveContainer width="100%" height={isMobile ? 280 : 320}>
                <RechartsPieChart>
                  <Pie
                    data={dashboardData.statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 80 : 100}
                    innerRadius={isMobile ? 50 : 65}
                    paddingAngle={2}
                    strokeWidth={0}
                    label={false}
                    labelLine={false}
                    animationBegin={0}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {dashboardData.statusData.map((entry, index) => {
                      // Cores refinadas para status
                      const statusColors: Record<string, string> = {
                        'Abertos': '#6b7280',
                        'Atrasados': '#ef4444',
                        'Em Andamento': '#3b82f6',
                        'Fechados': '#374151',
                        'Resolvidos': '#22c55e',
                      };
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={statusColors[entry.name] || entry.color}
                          opacity={0.9}
                          className="transition-opacity duration-200 hover:opacity-100 cursor-pointer"
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      fontSize: '12px',
                      padding: '8px 12px',
                    }}
                    itemStyle={{ color: '#e5e7eb' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={48}
                    formatter={(value) => (
                      <span className="text-xs text-gray-400" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                        {value}
                      </span>
                    )}
                    wrapperStyle={{ paddingTop: '16px' }}
                    iconType="square"
                    iconSize={12}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'priority-chart':
        return (
          <div 
            key={widget.id} 
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-8"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-1">Tickets por prioridade</h3>
              <p className="text-sm text-gray-400">
                Distribuição por nível de criticidade
              </p>
            </div>
            
            <div className="min-h-[320px]">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dashboardData.priorityData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }} maxBarSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9ca3af"
                    fontSize={13}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#d1d5db', fontWeight: 500 }}
                    style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#9ca3af' }}
                    label={{ 
                      value: 'Quantidade de tickets', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: '#6b7280', fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif" }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      fontSize: '12px',
                      padding: '8px 12px',
                    }}
                    itemStyle={{ color: '#e5e7eb' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[6, 6, 0, 0]}
                    animationBegin={100}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {dashboardData.priorityData.map((entry, index) => {
                      // Cores para prioridades
                      const priorityColors: Record<string, string> = {
                        'P0 - Crítico': '#ef4444',
                        'P1 - Alto': '#f87171',
                        'P2 - Médio': '#eab308',
                        'P3 - Baixo': '#22c55e',
                      };
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={priorityColors[entry.name] || '#6b7280'}
                          className="transition-opacity duration-200 hover:opacity-80 cursor-pointer"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'team-chart':
        return (
          <div key={widget.id} className="col-span-full bg-gradient-to-br from-card to-card/50 rounded-2xl p-6 shadow-lg border border-border/50 backdrop-blur-sm">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{widget.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Distribuição de tickets por equipe responsável
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Período:</Label>
                  <Select value={teamDateFilter} onValueChange={setTeamDateFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7days">Últimos 7 dias</SelectItem>
                      <SelectItem value="30days">Últimos 30 dias</SelectItem>
                      <SelectItem value="90days">Últimos 90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="bg-background/30 rounded-xl p-4 backdrop-blur-sm">
               <ResponsiveContainer width="100%" height={300}>
                 <BarChart data={teamData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                   <XAxis 
                     dataKey="name" 
                     stroke="hsl(var(--foreground))"
                     fontSize={12}
                     tickLine={false}
                     axisLine={false}
                   />
                   <YAxis 
                     stroke="hsl(var(--foreground))"
                     fontSize={12}
                     tickLine={false}
                     axisLine={false}
                   />
                   <Tooltip 
                     content={<GlassTooltip />}
                     cursor={{
                       fill: 'hsl(var(--primary))',
                       fillOpacity: 0.1,
                       strokeWidth: 2,
                       stroke: 'hsl(var(--primary))'
                     }}
                     animationDuration={200}
                   />
                     <Bar 
                       dataKey="tickets" 
                       radius={[6, 6, 0, 0]}
                       animationBegin={0}
                       animationDuration={1200}
                       className="transition-all duration-300 ease-out hover:brightness-110 cursor-pointer drop-shadow-sm"
                     >
                        {teamData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            className="transition-all duration-300 ease-out hover:brightness-125"
                          />
                        ))}
                     </Bar>
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header com controles estilo Resend */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Dashboard dinâmico</h2>
          <p className="text-sm text-gray-400">Configure e visualize suas métricas principais</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="h-10 px-4 bg-gray-900/50 border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="90days">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          
          {isSuperAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowCustomizer(true)}
                className="h-10 px-4 bg-gray-900/50 border-gray-800 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all duration-200"
              >
                <Palette className="h-4 w-4 mr-2" />
                Editar dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSettings(!showSettings)}
                className="h-10 px-4 bg-gray-900/50 border-gray-800 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all duration-200"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </>
          )}
          
          <Button 
            onClick={() => window.open('/dashboard/tv', '_blank')}
            variant="outline"
            className="h-10 px-4 bg-gray-900/50 border-gray-800 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all duration-200"
          >
            <Monitor className="h-4 w-4 mr-2" />
            Modo TV
          </Button>
          
          <Button 
            onClick={loadDashboardData} 
            variant="outline" 
            disabled={loading}
            className="h-10 px-4 bg-gray-900/50 border-gray-800 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all duration-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Settings Panel - estilo Resend */}
      {showSettings && (
        <div 
          className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-8 animate-in fade-in duration-300"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-1">Configurar widgets</h3>
            <p className="text-sm text-gray-400">
              Escolha quais widgets deseja exibir no seu dashboard
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {widgets.map((widget) => (
                <div 
                  key={widget.id} 
                  className="flex items-center space-x-3 p-4 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-all duration-200 border border-gray-800/50"
                >
                  <Checkbox
                    id={widget.id}
                    checked={widget.visible}
                    onCheckedChange={() => toggleWidget(widget.id)}
                    className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                  <Label htmlFor={widget.id} className="flex items-center gap-3 cursor-pointer text-sm flex-1">
                    <widget.icon className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-300 font-medium">{widget.name}</span>
                    {widget.visible ? (
                      <Eye className="w-4 h-4 text-green-400 shrink-0 ml-auto" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-500 shrink-0 ml-auto" />
                    )}
                  </Label>
                </div>
              ))}
            </div>
            <Separator className="bg-gray-800" />
            <div className="flex justify-end">
              <Button 
                onClick={saveUserPreferences} 
                className="h-10 px-5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-all duration-200"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar preferências
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className="min-h-[160px] p-8 rounded-xl bg-gray-900/50 border border-gray-800/50"
            >
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                <div className="h-10 bg-gray-800 rounded w-1/2 mt-8"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards - Grid com espaçamento Resend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {visibleWidgets.filter(w => w.type === 'kpi').map((widget) => renderKPICard(widget))}
          </div>

          {/* SLA Resolution Time Chart */}
          {visibleWidgets.find(w => w.id === 'sla-resolution-time')?.visible && (
            <div className="mb-8">
              {renderChart(visibleWidgets.find(w => w.id === 'sla-resolution-time')!)}
            </div>
          )}

          {/* Tag Analytics Chart */}
          {visibleWidgets.find(w => w.id === 'tag-analytics')?.visible && (
            <div className="mb-8">
              {renderChart(visibleWidgets.find(w => w.id === 'tag-analytics')!)}
            </div>
          )}

          {/* Status and Priority charts lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {visibleWidgets.filter(w => w.type === 'chart' && ['status-chart', 'priority-chart'].includes(w.id)).map((widget) => renderChart(widget))}
          </div>
        </>
      )}

      {/* Dashboard Customizer */}
      <DashboardCustomizer 
        isOpen={showCustomizer} 
        onOpenChange={setShowCustomizer} 
      />
    </div>
  );
}