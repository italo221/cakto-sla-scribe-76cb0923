import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart,
  Users,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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

// Componente KPI moderno seguindo padrão shadcn
const ModernKPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  isLoading = false,
  variant = "default"
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  trend?: "up" | "down" | "neutral";
  trendValue?: number;
  isLoading?: boolean;
  variant?: "default" | "success" | "warning" | "destructive";
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="h-8 w-16 mt-2" />
          <Skeleton className="h-3 w-20 mt-2" />
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (!trend || trend === "neutral") return <Minus className="h-3 w-3" />;
    return trend === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend || trend === "neutral") return "text-muted-foreground";
    // Para SLA compliance, up é bom; para tickets atrasados, down é bom
    if (title.includes("SLA") || title.includes("Conformidade")) {
      return trend === "up" ? "text-green-600" : "text-red-600";
    }
    if (title.includes("Atrasados")) {
      return trend === "down" ? "text-green-600" : "text-red-600";
    }
    return trend === "up" ? "text-green-600" : "text-red-600";
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {trendValue !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", getTrendColor())}>
              {getTrendIcon()}
              {Math.abs(trendValue).toFixed(1)}%
            </div>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const ModernDashboardOverview = () => {
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
  const [dateFilter, setDateFilter] = useState('30days');
  const [slaTrend, setSlaTrend] = useState<number>(0);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadSLAPolicies();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [dateFilter, policies]);

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
      
      // Calculate overdue tickets
      const overdueTickets = tickets?.filter(t => {
        if (t.status === 'resolvido' || t.status === 'fechado') return false;
        
        if (t.prazo_interno) {
          return new Date(t.prazo_interno) < now;
        }
        
        const createdAt = new Date(t.data_criacao);
        const hoursOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
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
        
        return hoursOld > slaHours;
      }).length || 0;

      // Calculate SLA compliance
      const resolvedTicketsOnTime = tickets?.filter(t => {
        if (t.status !== 'resolvido' && t.status !== 'fechado') return false;
        if (!t.updated_at) return false;
        
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
      }).length || 0;

      const totalResolvedTickets = resolvedTickets + closedTickets;
      const slaCompliance = totalResolvedTickets > 0 ? (resolvedTicketsOnTime / totalResolvedTickets) * 100 : 0;

      // Status data with semantic colors
      const statusData = [
        { name: 'Abertos', value: openTickets, color: 'hsl(var(--kpi-open))' },
        { name: 'Em Andamento', value: inProgressTickets, color: 'hsl(var(--kpi-progress))' },
        { name: 'Resolvidos', value: resolvedTickets, color: 'hsl(var(--kpi-resolved))' },
        { name: 'Fechados', value: closedTickets, color: 'hsl(var(--chart-color-6))' },
      ].filter(item => item.value > 0);

      // Priority data with semantic colors
      const priorityData = [
        { name: 'P0 - Crítico', value: tickets?.filter(t => t.nivel_criticidade === 'P0').length || 0, color: 'hsl(var(--kpi-critical))' },
        { name: 'P1 - Alto', value: tickets?.filter(t => t.nivel_criticidade === 'P1').length || 0, color: 'hsl(var(--kpi-overdue))' },
        { name: 'P2 - Médio', value: tickets?.filter(t => t.nivel_criticidade === 'P2').length || 0, color: 'hsl(var(--kpi-progress))' },
        { name: 'P3 - Baixo', value: tickets?.filter(t => t.nivel_criticidade === 'P3').length || 0, color: 'hsl(var(--kpi-resolved))' },
      ].filter(item => item.value > 0);

      // Team data
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

  const overduePercentage = dashboardData.totalTickets > 0 
    ? (dashboardData.overdueTickets / dashboardData.totalTickets) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
          <p className="text-muted-foreground">
            Acompanhe as principais métricas do seu sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 dias</SelectItem>
              <SelectItem value="30days">30 dias</SelectItem>
              <SelectItem value="90days">90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-4">
        <ModernKPICard
          title="Total de Tickets"
          value={dashboardData.totalTickets.toLocaleString('pt-BR')}
          subtitle="No período selecionado"
          icon={Activity}
          isLoading={loading}
        />
        <ModernKPICard
          title="Tickets Abertos"
          value={dashboardData.openTickets.toLocaleString('pt-BR')}
          subtitle={`${dashboardData.totalTickets > 0 ? Math.round((dashboardData.openTickets / dashboardData.totalTickets) * 100) : 0}% do total`}
          icon={AlertTriangle}
          isLoading={loading}
        />
        <ModernKPICard
          title="Conformidade SLA"
          value={`${dashboardData.slaCompliance.toFixed(1)}%`}
          subtitle="Meta: 95%"
          icon={Target}
          trend={slaTrend > 0 ? "up" : slaTrend < 0 ? "down" : "neutral"}
          trendValue={slaTrend}
          isLoading={loading}
        />
        <ModernKPICard
          title="Tickets Atrasados"
          value={`${overduePercentage.toFixed(1)}%`}
          subtitle={`${dashboardData.overdueTickets} tickets`}
          icon={Clock}
          trend={overduePercentage < 5 ? "down" : "up"}
          trendValue={overduePercentage}
          isLoading={loading}
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-[200px] w-[200px] rounded-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={dashboardData.statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dashboardData.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tickets por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-[250px] w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Table */}
      {dashboardData.teamData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Performance por Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.teamData
                .sort((a, b) => b.tickets - a.tickets)
                .slice(0, 10)
                .map((team, index) => (
                  <div key={team.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{team.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{team.tickets} tickets</Badge>
                      <span className="text-sm text-muted-foreground">
                        {((team.tickets / dashboardData.totalTickets) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};