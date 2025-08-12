import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Minus
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
  { id: 'status-chart', name: 'Gráfico por Status', type: 'chart', icon: PieChart, visible: true, position: 4 },
  { id: 'priority-chart', name: 'Gráfico por Prioridade', type: 'chart', icon: BarChart3, visible: true, position: 5 },
  { id: 'team-chart', name: 'Gráfico por Equipe', type: 'chart', icon: Users, visible: false, position: 6 },
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
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [dateFilter, setDateFilter] = useState('30days');
  const [teamDateFilter, setTeamDateFilter] = useState('30days');
  const [teamData, setTeamData] = useState<Array<{ name: string; tickets: number; color: string }>>([]);
  const [showPieLabels, setShowPieLabels] = useState(true);

  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    loadDashboardData();
    loadUserPreferences();
  }, [dateFilter]);

  useEffect(() => {
    loadTeamData();
  }, [teamDateFilter]);

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
        const createdAt = new Date(t.data_criacao);
        const hoursOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        const slaHours = {
          'P0': 4,   // Crítico: 4 horas
          'P1': 24,  // Alto: 24 horas
          'P2': 72,  // Médio: 72 horas
          'P3': 168  // Baixo: 168 horas
        }[t.nivel_criticidade] || 24;
        return hoursOld > slaHours;
      }).length || 0;

      // Calcular tickets resolvidos dentro do prazo para SLA correto
      const resolvedTicketsOnTime = tickets?.filter(t => {
        if (t.status !== 'resolvido' && t.status !== 'fechado') return false;
        
        const createdAt = new Date(t.data_criacao);
        
        // Usar padrões SLA corretos por prioridade (horas)
        const slaHours = {
          'P0': 4,   // Crítico: 4 horas
          'P1': 24,  // Alto: 24 horas
          'P2': 72,  // Médio: 72 horas
          'P3': 168  // Baixo: 168 horas
        }[t.nivel_criticidade] || 24;
        
        const slaDeadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
        
        // Assumindo que o ticket foi resolvido no momento atual (simplificado)
        return new Date() <= slaDeadline;
      }).length || 0;

      // SLA Compliance = tickets resolvidos dentro do prazo / total de tickets resolvidos
      // Se não há tickets resolvidos, mostra 100% (meta alcançada)
      const totalResolvedTickets = resolvedTickets + closedTickets;
      const slaCompliance = totalResolvedTickets > 0 ? (resolvedTicketsOnTime / totalResolvedTickets) * 100 : 100;

      // Status data with semantic colors
      const statusData = [
        { name: 'Abertos', value: openTickets, color: 'hsl(var(--kpi-open))' },
        { name: 'Em Andamento', value: inProgressTickets, color: 'hsl(var(--kpi-progress))' },
        { name: 'Resolvidos', value: resolvedTickets, color: 'hsl(var(--kpi-resolved))' },
        { name: 'Fechados', value: closedTickets, color: 'hsl(var(--dashboard-neutral))' },
        { name: 'Atrasados', value: overdueTickets, color: 'hsl(var(--kpi-overdue))' },
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
    let value = 0;
    let subtitle = '';
    let trend = null;
    let glowColor = '';
    let accentColor = '';
    let shadowColor = '';
    
    // Generate mock trend data (replace with real data when available)
    const trendValue = Math.random() > 0.5 ? Math.floor(Math.random() * 15) + 1 : -(Math.floor(Math.random() * 15) + 1);
    const isPositive = trendValue > 0;

    switch (widget.id) {
      case 'total-tickets':
        value = dashboardData.totalTickets;
        subtitle = 'Total de tickets no período';
        glowColor = 'total';
        accentColor = 'from-kpi-total/20 via-kpi-total/10 to-transparent';
        shadowColor = 'shadow-kpi-total/10';
        break;
      case 'open-tickets':
        value = dashboardData.openTickets;
        subtitle = 'Tickets em aberto';
        glowColor = 'open';
        accentColor = 'from-kpi-open/20 via-kpi-open/10 to-transparent';
        shadowColor = 'shadow-kpi-open/10';
        break;
      case 'sla-compliance':
        value = Math.round(dashboardData.slaCompliance);
        const totalResolvedForSubtitle = dashboardData.resolvedTickets + dashboardData.closedTickets;
        subtitle = totalResolvedForSubtitle === 0 
          ? 'Nenhum ticket resolvido ainda' 
          : `${value}% de cumprimento do SLA`;
        
        if (value >= 95) {
          glowColor = 'resolved';
          accentColor = 'from-kpi-resolved/20 via-kpi-resolved/10 to-transparent';
          shadowColor = 'shadow-kpi-resolved/10';
        } else if (value >= 80) {
          glowColor = 'progress';
          accentColor = 'from-kpi-progress/20 via-kpi-progress/10 to-transparent';
          shadowColor = 'shadow-kpi-progress/10';
        } else {
          glowColor = 'overdue';
          accentColor = 'from-kpi-overdue/20 via-kpi-overdue/10 to-transparent';
          shadowColor = 'shadow-kpi-overdue/10';
        }
        break;
      case 'overdue-tickets':
        value = dashboardData.overdueTickets;
        subtitle = 'Tickets em atraso';
        glowColor = 'critical';
        accentColor = 'from-kpi-critical/20 via-kpi-critical/10 to-transparent';
        shadowColor = 'shadow-kpi-critical/10';
        break;
    }

    const getGlowClasses = (color: string) => {
      const glowMap = {
        total: 'text-kpi-total drop-shadow-[0_0_8px_hsl(var(--kpi-total)/0.5)]',
        open: 'text-kpi-open drop-shadow-[0_0_8px_hsl(var(--kpi-open)/0.5)]',
        progress: 'text-kpi-progress drop-shadow-[0_0_8px_hsl(var(--kpi-progress)/0.5)]',
        resolved: 'text-kpi-resolved drop-shadow-[0_0_8px_hsl(var(--kpi-resolved)/0.5)]',
        overdue: 'text-kpi-overdue drop-shadow-[0_0_8px_hsl(var(--kpi-overdue)/0.5)]',
        critical: 'text-kpi-critical drop-shadow-[0_0_8px_hsl(var(--kpi-critical)/0.5)]'
      };
      return glowMap[color] || glowMap.total;
    };

    const getIconGlowClasses = (color: string) => {
      const iconGlowMap = {
        total: 'text-kpi-total drop-shadow-[0_0_6px_hsl(var(--kpi-total)/0.4)]',
        open: 'text-kpi-open drop-shadow-[0_0_6px_hsl(var(--kpi-open)/0.4)]',
        progress: 'text-kpi-progress drop-shadow-[0_0_6px_hsl(var(--kpi-progress)/0.4)]',
        resolved: 'text-kpi-resolved drop-shadow-[0_0_6px_hsl(var(--kpi-resolved)/0.4)]',
        overdue: 'text-kpi-overdue drop-shadow-[0_0_6px_hsl(var(--kpi-overdue)/0.4)]',
        critical: 'text-kpi-critical drop-shadow-[0_0_6px_hsl(var(--kpi-critical)/0.4)]'
      };
      return iconGlowMap[color] || iconGlowMap.total;
    };

    trend = (
      <div className="flex items-center gap-1 text-sm font-medium text-foreground">
        {trendValue === 0 ? (
          <Minus className="w-4 h-4 text-dashboard-muted" />
        ) : isPositive ? (
          <TrendingUp className="w-4 h-4 text-kpi-resolved drop-shadow-[0_0_4px_hsl(var(--kpi-resolved)/0.3)]" />
        ) : (
          <TrendingDown className="w-4 h-4 text-kpi-overdue drop-shadow-[0_0_4px_hsl(var(--kpi-overdue)/0.3)]" />
        )}
        <span className={trendValue === 0 ? 'text-dashboard-muted' : isPositive ? 'text-kpi-resolved' : 'text-kpi-overdue'}>
          {trendValue === 0 ? '0%' : `${Math.abs(trendValue)}%`}
        </span>
      </div>
    );

    return (
      <div 
        key={widget.id} 
        className={`relative overflow-hidden rounded-2xl backdrop-blur-md bg-background/60 border border-white/20 dark:border-white/10 hover:bg-background/70 transition-all duration-300 hover:scale-105 ${shadowColor} shadow-lg hover:shadow-xl`}
      >
        {/* Gradient accent overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${accentColor} pointer-events-none`} />
        
        {/* Glass effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5 pointer-events-none" />
        
        {/* Content */}
        <div className="relative p-6 h-full">
          <div className="flex items-start justify-between h-full">
            <div className="space-y-3 flex-1">
              <p className="text-sm font-medium text-foreground/80">{widget.name}</p>
              <div className="space-y-2">
                <h3 className={`text-4xl font-bold tracking-tight ${getGlowClasses(glowColor)}`}>
                  {widget.id === 'sla-compliance' ? `${value}%` : value.toLocaleString()}
                </h3>
                {trend}
              </div>
              <p className="text-xs text-foreground/60">{subtitle}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10">
              <widget.icon className={`w-8 h-8 ${getIconGlowClasses(glowColor)}`} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderChart = (widget: DashboardWidget) => {
    switch (widget.id) {
      case 'status-chart':
        return (
          <div key={widget.id} className="col-span-full md:col-span-2 relative overflow-hidden rounded-2xl backdrop-blur-md bg-background/60 border border-white/20 dark:border-white/10 shadow-2xl hover:shadow-primary/20 transition-all duration-500">
            {/* Glassmorphism gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10 pointer-events-none" />
            
            <div className="relative p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm border border-primary/30">
                      <PieChart className="w-6 h-6 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Distribuição por Status</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowPieLabels(!showPieLabels);
                    }}
                    className="gap-2"
                  >
                    {showPieLabels ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPieLabels ? 'Ocultar Nomes' : 'Mostrar Nomes'}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Visualização completa dos tickets por status
                </p>
              </div>
              
              <div className="bg-background/40 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 350}>
                  <RechartsPieChart>
                      <Pie
                        data={dashboardData.statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 70 : 95}
                        innerRadius={isMobile ? 50 : 70}
                        paddingAngle={2}
                        strokeWidth={0}
                       label={showPieLabels && !isMobile ? ({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)` : false}
                       labelLine={false}
                       animationBegin={0}
                       animationDuration={1500}
                       animationEasing="ease-out"
                     >
                        {dashboardData.statusData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            className="transition-all duration-300 ease-out hover:brightness-110 cursor-pointer"
                          />
                        ))}
                     </Pie>
                    <Tooltip 
                      content={<GlassTooltip />}
                      animationDuration={200}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={40}
                      formatter={(value) => <span className="text-sm font-medium text-foreground drop-shadow-sm">{value}</span>}
                      wrapperStyle={{
                        paddingTop: '20px',
                        fontSize: '14px'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );

      case 'priority-chart':
        return (
          <div key={widget.id} className="col-span-full md:col-span-2 relative overflow-hidden rounded-2xl backdrop-blur-md bg-background/60 border border-white/20 dark:border-white/10 shadow-2xl hover:shadow-primary/20 transition-all duration-500">
            {/* Glassmorphism gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-secondary/5 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10 pointer-events-none" />
            
            <div className="relative p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-xl bg-secondary/20 backdrop-blur-sm border border-secondary/30">
                    <BarChart3 className="w-6 h-6 text-secondary drop-shadow-[0_0_8px_rgba(var(--secondary-rgb),0.5)]" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Tickets por Prioridade</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Distribuição de tickets por nível de criticidade
                </p>
              </div>
              
              <div className="bg-background/40 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                 <ResponsiveContainer width="100%" height={350}>
                   <BarChart data={dashboardData.priorityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} maxBarSize={40}>
                     <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                     <XAxis 
                       dataKey="name" 
                       stroke="hsl(var(--foreground))"
                       fontSize={13}
                       tickLine={false}
                       axisLine={false}
                       tick={{ fontWeight: 500 }}
                     />
                     <YAxis 
                       stroke="hsl(var(--foreground))"
                       fontSize={13}
                       tickLine={false}
                       axisLine={false}
                       tick={{ fontWeight: 500 }}
                     />
                     <Tooltip 
                       content={<GlassTooltip />}
                       cursor={{
                         fill: 'hsl(var(--primary))',
                         fillOpacity: 0.08,
                         strokeWidth: 2,
                         stroke: 'hsl(var(--primary))',
                         radius: 8
                       }}
                       animationDuration={200}
                     />
                    <Legend 
                      formatter={(value) => <span className="text-sm font-medium text-foreground drop-shadow-sm">Quantidade de Tickets</span>}
                      wrapperStyle={{
                        paddingTop: '15px',
                        fontSize: '14px'
                      }}
                    />
                     <Bar 
                       dataKey="value" 
                       radius={[10, 10, 0, 0]}
                       animationBegin={200}
                       animationDuration={1800}
                       animationEasing="ease-out"
                     >
                       {dashboardData.priorityData.map((entry, index) => {
                         // Create gradient definition for each bar
                         const gradientId = `gradient-${entry.name.replace(/\s+/g, '-')}`;
                         return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`url(#${gradientId})`}
                              className="transition-all duration-300 ease-out hover:brightness-110 cursor-pointer"
                            />
                         );
                       })}
                     </Bar>
                     
                     {/* Define gradients for each bar */}
                     <defs>
                       {dashboardData.priorityData.map((entry, index) => {
                         const gradientId = `gradient-${entry.name.replace(/\s+/g, '-')}`;
                         return (
                           <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor={entry.color} stopOpacity={0.9} />
                             <stop offset="100%" stopColor={entry.color} stopOpacity={0.6} />
                           </linearGradient>
                         );
                       })}
                     </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Dashboard Dinâmico</h2>
          <p className="text-muted-foreground">Configure e visualize suas métricas principais</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-32 sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="90days">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          
          {isSuperAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomizer(true)}
                className="gap-2"
              >
                <Palette className="w-4 h-4" />
                Editar Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurar
              </Button>
            </>
          )}
          
          <Button onClick={loadDashboardData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-6 shadow-lg border border-border/50 backdrop-blur-sm animate-fade-in">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Configurar Widgets</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Escolha quais widgets deseja exibir no seu dashboard
            </p>
          </div>
          <div className="bg-background/30 rounded-xl p-4 backdrop-blur-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {widgets.map((widget) => (
                <div key={widget.id} className="flex items-center space-x-3 p-3 rounded-xl bg-background/50 hover:bg-background/70 transition-all duration-200 border border-border/30">
                  <Checkbox
                    id={widget.id}
                    checked={widget.visible}
                    onCheckedChange={() => toggleWidget(widget.id)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor={widget.id} className="flex items-center gap-2 cursor-pointer text-sm flex-1">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <widget.icon className="w-4 h-4 text-primary shrink-0" />
                    </div>
                    <span className="truncate font-medium">{widget.name}</span>
                    {widget.visible ? (
                      <div className="p-1 rounded-full bg-green-100 dark:bg-green-900/30">
                        <Eye className="w-3 h-3 text-green-600 dark:text-green-400 shrink-0" />
                      </div>
                    ) : (
                      <div className="p-1 rounded-full bg-gray-100 dark:bg-gray-800">
                        <EyeOff className="w-3 h-3 text-gray-500 shrink-0" />
                      </div>
                    )}
                  </Label>
                </div>
              ))}
            </div>
            <Separator className="my-4 bg-border/50" />
            <div className="flex justify-end">
              <Button onClick={saveUserPreferences} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200">
                <Save className="w-4 h-4 mr-2" />
                Salvar Preferências
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card">
              <CardContent className="p-4 sm:p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {visibleWidgets.map((widget) => {
            if (widget.type === 'kpi') {
              return renderKPICard(widget);
            } else if (widget.type === 'chart') {
              return renderChart(widget);
            }
            return null;
          })}
        </div>
      )}

      {/* Tag Trend Chart - positioned between widgets and team chart */}
      {!loading && (
        <div className="mt-6">
          <TagTrendChart />
        </div>
      )}

      {/* Dashboard Customizer */}
      <DashboardCustomizer 
        isOpen={showCustomizer} 
        onOpenChange={setShowCustomizer} 
      />
    </div>
  );
}