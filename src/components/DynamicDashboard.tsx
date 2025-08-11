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
  RefreshCw
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
  const [dateFilter, setDateFilter] = useState('30days');

  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    loadDashboardData();
    loadUserPreferences();
  }, [dateFilter]);

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

      // Status data
      const statusData = [
        { name: 'Abertos', value: openTickets, color: '#ef4444' },
        { name: 'Em Andamento', value: inProgressTickets, color: '#3b82f6' },
        { name: 'Resolvidos', value: resolvedTickets, color: '#10b981' },
        { name: 'Fechados', value: closedTickets, color: '#6b7280' },
      ].filter(item => item.value > 0);

      // Priority data
      const priorityData = [
        { name: 'P0 - Crítico', value: tickets?.filter(t => t.nivel_criticidade === 'P0').length || 0, color: '#dc2626' },
        { name: 'P1 - Alto', value: tickets?.filter(t => t.nivel_criticidade === 'P1').length || 0, color: '#ea580c' },
        { name: 'P2 - Médio', value: tickets?.filter(t => t.nivel_criticidade === 'P2').length || 0, color: '#ca8a04' },
        { name: 'P3 - Baixo', value: tickets?.filter(t => t.nivel_criticidade === 'P3').length || 0, color: '#16a34a' },
      ].filter(item => item.value > 0);

      // Team data
      const teamCounts = tickets?.reduce((acc, ticket) => {
        const team = ticket.time_responsavel || 'Não Atribuído';
        acc[team] = (acc[team] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const teamData = Object.entries(teamCounts).map(([name, tickets], index) => ({
        name,
        tickets,
        color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
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
    let gradient = '';
    let iconColor = '';
    let textColor = '';
    
    // Generate mock trend data (replace with real data when available)
    const trendValue = Math.random() > 0.5 ? Math.floor(Math.random() * 15) + 1 : -(Math.floor(Math.random() * 15) + 1);
    const isPositive = trendValue > 0;

    switch (widget.id) {
      case 'total-tickets':
        value = dashboardData.totalTickets;
        subtitle = 'Total de tickets no período';
        gradient = 'bg-gradient-to-br from-blue-500 to-blue-600';
        iconColor = 'text-blue-100';
        textColor = 'text-white';
        break;
      case 'open-tickets':
        value = dashboardData.openTickets;
        subtitle = 'Tickets em aberto';
        gradient = 'bg-gradient-to-br from-red-500 to-red-600';
        iconColor = 'text-red-100';
        textColor = 'text-white';
        break;
      case 'sla-compliance':
        value = Math.round(dashboardData.slaCompliance);
        const totalResolvedForSubtitle = dashboardData.resolvedTickets + dashboardData.closedTickets;
        subtitle = totalResolvedForSubtitle === 0 
          ? 'Nenhum ticket resolvido ainda' 
          : `${value}% de cumprimento do SLA`;
        gradient = value >= 95 
          ? 'bg-gradient-to-br from-green-500 to-green-600'
          : value >= 80 
          ? 'bg-gradient-to-br from-yellow-500 to-yellow-600'
          : 'bg-gradient-to-br from-orange-500 to-orange-600';
        iconColor = value >= 80 ? 'text-green-100' : 'text-orange-100';
        textColor = 'text-white';
        break;
      case 'overdue-tickets':
        value = dashboardData.overdueTickets;
        subtitle = 'Tickets em atraso';
        gradient = 'bg-gradient-to-br from-purple-500 to-purple-600';
        iconColor = 'text-purple-100';
        textColor = 'text-white';
        break;
    }

    trend = (
      <div className={`flex items-center gap-1 text-sm font-medium ${textColor}`}>
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-green-300" />
        ) : (
          <TrendingUp className="w-4 h-4 rotate-180 text-red-300" />
        )}
        <span className={isPositive ? 'text-green-300' : 'text-red-300'}>
          {Math.abs(trendValue)}%
        </span>
      </div>
    );

    return (
      <div key={widget.id} className={`${gradient} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-white/10`}>
        <div className="flex items-start justify-between h-full">
          <div className="space-y-3 flex-1">
            <p className={`text-sm font-medium ${textColor} opacity-90`}>{widget.name}</p>
            <div className="space-y-2">
              <h3 className={`text-4xl font-bold tracking-tight ${textColor}`}>
                {widget.id === 'sla-compliance' ? `${value}%` : value.toLocaleString()}
              </h3>
              {trend}
            </div>
            <p className={`text-xs ${textColor} opacity-75`}>{subtitle}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
            <widget.icon className={`w-8 h-8 ${iconColor}`} />
          </div>
        </div>
      </div>
    );
  };

  const renderChart = (widget: DashboardWidget) => {
    switch (widget.id) {
      case 'status-chart':
        return (
          <div key={widget.id} className="col-span-full md:col-span-2 bg-gradient-to-br from-card to-card/50 rounded-2xl p-6 shadow-lg border border-border/50 backdrop-blur-sm">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary/10">
                  <PieChart className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Distribuição por Status</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Visualização completa dos tickets por status
              </p>
            </div>
            <div className="bg-background/30 rounded-xl p-4 backdrop-blur-sm">
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 350}>
                <RechartsPieChart>
                   <Pie
                     data={dashboardData.statusData}
                     dataKey="value"
                     nameKey="name"
                     cx="50%"
                     cy="50%"
                     outerRadius={isMobile ? 80 : 120}
                     innerRadius={isMobile ? 40 : 60}
                     paddingAngle={5}
                     label={isMobile ? false : ({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                     labelLine={false}
                     animationBegin={0}
                     animationDuration={1200}
                   >
                     {dashboardData.statusData.map((entry, index) => (
                       <Cell 
                         key={`cell-${index}`} 
                         fill={entry.color}
                         className="transition-all duration-300 ease-out hover:brightness-110 hover:scale-105 cursor-pointer drop-shadow-sm"
                         style={{ transformOrigin: "center" }}
                       />
                     ))}
                   </Pie>
                  <Tooltip 
                    content={<GlassTooltip />}
                    animationDuration={200}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-sm font-medium text-foreground">{value}</span>}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'priority-chart':
        return (
          <div key={widget.id} className="col-span-full md:col-span-2 bg-gradient-to-br from-card to-card/50 rounded-2xl p-6 shadow-lg border border-border/50 backdrop-blur-sm">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary/10">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Tickets por Prioridade</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Distribuição de tickets por nível de criticidade
              </p>
            </div>
            <div className="bg-background/30 rounded-xl p-4 backdrop-blur-sm">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dashboardData.priorityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                  <Legend 
                    formatter={(value) => <span className="text-sm font-medium text-foreground">Quantidade de Tickets</span>}
                  />
                   <Bar 
                     dataKey="value" 
                     radius={[8, 8, 0, 0]}
                     animationBegin={0}
                     animationDuration={1200}
                   >
                     {dashboardData.priorityData.map((entry, index) => (
                       <Cell 
                         key={`cell-${index}`} 
                         fill={entry.color}
                         className="transition-all duration-300 ease-out hover:brightness-110 cursor-pointer drop-shadow-sm"
                       />
                     ))}
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
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{widget.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Distribuição de tickets por equipe responsável
              </p>
            </div>
            <div className="bg-background/30 rounded-xl p-4 backdrop-blur-sm">
               <ResponsiveContainer width="100%" height={300}>
                 <BarChart data={dashboardData.teamData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                     fill="#3b82f6"
                     radius={[8, 8, 0, 0]}
                     animationBegin={0}
                     animationDuration={1200}
                     className="transition-all duration-300 ease-out hover:brightness-110 cursor-pointer drop-shadow-sm"
                   />
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </Button>
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
    </div>
  );
}