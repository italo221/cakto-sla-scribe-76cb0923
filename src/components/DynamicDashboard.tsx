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
        const slaHours = t.nivel_criticidade === 'P0' ? 4 : t.nivel_criticidade === 'P1' ? 24 : 72;
        return hoursOld > slaHours;
      }).length || 0;

      // Calcular tickets resolvidos dentro do prazo para SLA correto
      const resolvedTicketsOnTime = tickets?.filter(t => {
        if (t.status !== 'resolvido' && t.status !== 'fechado') return false;
        
        const createdAt = new Date(t.data_criacao);
        const slaHours = t.nivel_criticidade === 'P0' ? 4 : t.nivel_criticidade === 'P1' ? 24 : 72;
        const slaDeadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
        
        // Assumindo que o ticket foi resolvido no momento atual (simplificado)
        // Em um cenário real, você teria um campo de data_resolucao
        return new Date() <= slaDeadline;
      }).length || 0;

      // SLA Compliance = tickets resolvidos dentro do prazo / total de tickets resolvidos
      // Se não há tickets resolvidos, mostra 0% (não 100%)
      const totalResolvedTickets = resolvedTickets + closedTickets;
      const slaCompliance = totalResolvedTickets > 0 ? (resolvedTicketsOnTime / totalResolvedTickets) * 100 : 0;

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
      console.log('Nenhuma preferência salva encontrada');
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
    let color = 'text-primary';

    switch (widget.id) {
      case 'total-tickets':
        value = dashboardData.totalTickets;
        subtitle = 'Total de tickets no período';
        break;
      case 'open-tickets':
        value = dashboardData.openTickets;
        subtitle = 'Tickets em aberto';
        color = 'text-red-600 dark:text-red-400';
        break;
      case 'sla-compliance':
        value = Math.round(dashboardData.slaCompliance);
        const totalResolvedForSubtitle = dashboardData.resolvedTickets + dashboardData.closedTickets;
        subtitle = totalResolvedForSubtitle === 0 
          ? 'Nenhum ticket resolvido ainda' 
          : `${value}% de cumprimento do SLA`;
        color = totalResolvedForSubtitle === 0 
          ? 'text-muted-foreground'
          : value >= 95 ? 'text-green-600 dark:text-green-400' : 
            value >= 80 ? 'text-yellow-600 dark:text-yellow-400' : 
            'text-red-600 dark:text-red-400';
        break;
      case 'overdue-tickets':
        value = dashboardData.overdueTickets;
        subtitle = 'Tickets em atraso';
        color = 'text-red-600 dark:text-red-400';
        break;
    }

    return (
      <Card key={widget.id} className="bg-card hover:bg-muted/10 transition-colors">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{widget.name}</p>
              <div className="flex items-end gap-2">
                <h3 className={`text-3xl font-bold tracking-tight ${color}`}>
                  {widget.id === 'sla-compliance' ? `${value}%` : value}
                </h3>
                {trend}
              </div>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10">
              <widget.icon className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderChart = (widget: DashboardWidget) => {
    switch (widget.id) {
          case 'status-chart':
        return (
          <Card key={widget.id} className="col-span-full md:col-span-2 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <PieChart className="w-5 h-5" />
                Distribuição por Status
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Visualização completa dos tickets por status
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RechartsPieChart>
                  <Pie
                    data={dashboardData.statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={60}
                    paddingAngle={5}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                    labelLine={false}
                  >
                    {dashboardData.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value} tickets`, name]}
                    labelFormatter={(label) => `Status: ${label}`}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-sm font-medium text-foreground">{value}</span>}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case 'priority-chart':
        return (
          <Card key={widget.id} className="col-span-full md:col-span-2 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="w-5 h-5" />
                Tickets por Prioridade
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Distribuição de tickets por nível de criticidade
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dashboardData.priorityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
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
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value, name, props) => [
                      `${value} tickets`,
                      `${props.payload.name.split(' - ')[1] || 'Prioridade'}`
                    ]}
                    labelFormatter={(label) => `Criticidade: ${label}`}
                  />
                  <Legend 
                    formatter={(value) => <span className="text-sm font-medium text-foreground">Quantidade de Tickets</span>}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]}
                  >
                    {dashboardData.priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case 'team-chart':
        return (
          <Card key={widget.id} className="col-span-full bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {widget.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.teamData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Dinâmico</h2>
          <p className="text-muted-foreground">Configure e visualize suas métricas principais</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="90days">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
          
          <Button onClick={loadDashboardData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Configurar Widgets</CardTitle>
            <p className="text-sm text-muted-foreground">
              Escolha quais widgets deseja exibir no seu dashboard
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {widgets.map((widget) => (
                <div key={widget.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={widget.id}
                    checked={widget.visible}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                  <Label htmlFor={widget.id} className="flex items-center gap-2 cursor-pointer">
                    <widget.icon className="w-4 h-4" />
                    {widget.name}
                    {widget.visible ? (
                      <Eye className="w-3 h-3 text-green-500" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-gray-400" />
                    )}
                  </Label>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-end">
              <Button onClick={saveUserPreferences} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Salvar Preferências
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card">
              <CardContent className="p-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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