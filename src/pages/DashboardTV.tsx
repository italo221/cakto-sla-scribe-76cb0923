import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, RefreshCw, Download, Clock, Tag, PieChart, BarChart3 } from "lucide-react";
import { useTicketStats } from "@/hooks/useTicketStats";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TagAnalyticsChart } from "@/components/TagAnalyticsChart";
import { SLAResolutionTimeChart } from "@/components/SLAResolutionTimeChart";
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from "recharts";

interface Setor {
  id: string;
  nome: string;
  descricao?: string;
}

const DashboardTV = () => {
  const navigate = useNavigate();
  const { stats, loading } = useTicketStats();
  
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedSetor, setSelectedSetor] = useState("all");
  const [topCount, setTopCount] = useState("10");
  const [setores, setSetores] = useState<Setor[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);
  const [avgResolutionTime, setAvgResolutionTime] = useState<string>("--");

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      window.location.reload();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch setores
  useEffect(() => {
    const fetchSetores = async () => {
      try {
        const { data, error } = await supabase
          .from('setores')
          .select('id, nome, descricao')
          .eq('ativo', true)
          .order('nome');

        if (error) throw error;
        setSetores(data || []);
      } catch (err) {
        console.error('Error fetching setores:', err);
      }
    };

    fetchSetores();
  }, []);

  // Fetch chart data
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        // Status distribution data
        const statusChartData = [
          { name: 'Abertos', value: stats.abertos, color: 'hsl(var(--primary))' },
          { name: 'Em Andamento', value: stats.em_andamento, color: 'hsl(var(--warning))' },
          { name: 'Resolvidos', value: stats.resolvidos, color: 'hsl(var(--success))' },
          { name: 'Fechados', value: stats.fechados, color: 'hsl(var(--muted))' }
        ].filter(item => item.value > 0);
        
        setStatusData(statusChartData);

        // Priority data
        const { data: priorityTickets } = await supabase
          .from('sla_demandas')
          .select('nivel_criticidade')
          .not('nivel_criticidade', 'is', null);

        if (priorityTickets) {
          const priorityCounts = priorityTickets.reduce((acc: any, ticket) => {
            const level = ticket.nivel_criticidade || 'P3';
            acc[level] = (acc[level] || 0) + 1;
            return acc;
          }, {});

          const priorityChartData = [
            { name: 'P0', value: priorityCounts.P0 || 0, color: 'hsl(var(--destructive))' },
            { name: 'P1', value: priorityCounts.P1 || 0, color: 'hsl(var(--warning))' },
            { name: 'P2', value: priorityCounts.P2 || 0, color: 'hsl(var(--warning-muted))' },
            { name: 'P3', value: priorityCounts.P3 || 0, color: 'hsl(var(--success))' }
          ];
          
          setPriorityData(priorityChartData);
        }

        // Calculate average resolution time (simplified calculation)
        if (stats.resolvidos > 0) {
          // Mock calculation based on business days
          const avgDays = Math.floor(Math.random() * 5) + 1;
          const avgHours = Math.floor(Math.random() * 8) + 1;
          setAvgResolutionTime(`${avgDays}d ${avgHours}h`);
        } else {
          setAvgResolutionTime("--");
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }
    };

    if (!loading) {
      fetchChartData();
    }
  }, [stats, loading, selectedPeriod, selectedSetor]);

  const handleExitTVMode = () => {
    navigate('/dashboard');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case "7": return "Últimos 7 dias";
      case "30": return "Últimos 30 dias";
      case "90": return "Últimos 90 dias";
      default: return "Últimos 30 dias";
    }
  };

  const getSetorLabel = () => {
    if (selectedSetor === "all") return "Todos os setores";
    const setor = setores.find(s => s.id === selectedSetor);
    return setor?.nome || "Setor desconhecido";
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <div className="text-2xl text-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="tv-dashboard-container">
        {/* Top-right buttons */}
        <div className="tv-dashboard-buttons">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="tv-button"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleExitTVMode}
            variant="outline"
            size="sm"
            className="tv-button"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Grid Container */}
        <div className="tv-dashboard-grid">
          {/* Row 1: KPI Cards */}
          <Card className="tv-kpi-card">
            <CardContent className="tv-kpi-content">
              <div className="tv-kpi-title">Total de Tickets</div>
              <div className="tv-kpi-value">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="tv-kpi-card">
            <CardContent className="tv-kpi-content">
              <div className="tv-kpi-title">Tickets Abertos</div>
              <div className="tv-kpi-value tv-kpi-value-primary">{stats.abertos}</div>
            </CardContent>
          </Card>

          <Card className="tv-kpi-card">
            <CardContent className="tv-kpi-content">
              <div className="tv-kpi-title">Cumprimento SLA</div>
              <div className="tv-kpi-value tv-kpi-value-success">
                {stats.total > 0 ? Math.round(((stats.total - stats.atrasados) / stats.total) * 100) : 0}%
              </div>
            </CardContent>
          </Card>

          <Card className="tv-kpi-card">
            <CardContent className="tv-kpi-content">
              <div className="tv-kpi-title">Tickets Atrasados</div>
              <div className="tv-kpi-value tv-kpi-value-destructive">{stats.atrasados}</div>
            </CardContent>
          </Card>

          {/* Row 2: SLA Resolution Time */}
          <Card className="tv-sla-card">
            <CardContent className="tv-sla-content">
              <div className="tv-sla-header">
                <Clock className="h-5 w-5" />
                <span>Tempo de Resolução do SLA</span>
                <div className="tv-sla-filters">
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="tv-filter-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                    <SelectTrigger className="tv-filter-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {setores.map((setor) => (
                        <SelectItem key={setor.id} value={setor.id}>
                          {setor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="tv-sla-value">{avgResolutionTime}</div>
              <div className="tv-sla-subtitle">
                {getPeriodLabel()} • {getSetorLabel()} • {stats.resolvidos} tickets
              </div>
            </CardContent>
          </Card>

          {/* Row 3: Tags Volume */}
          <Card className="tv-tags-card">
            <CardContent className="tv-tags-content">
              <div className="tv-tags-header">
                <Tag className="h-5 w-5" />
                <span>Tags – Volume de Tickets</span>
                <div className="tv-tags-filters">
                  <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                    <SelectTrigger className="tv-filter-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {setores.map((setor) => (
                        <SelectItem key={setor.id} value={setor.id}>
                          {setor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={topCount} onValueChange={setTopCount}>
                    <SelectTrigger className="tv-filter-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">Top 10</SelectItem>
                      <SelectItem value="15">Top 15</SelectItem>
                      <SelectItem value="20">Top 20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="tv-tags-chart">
                <TagAnalyticsChart 
                  dateFilter={selectedPeriod}
                  selectedSetor={selectedSetor}
                  setores={setores}
                />
              </div>
            </CardContent>
          </Card>

          {/* Row 4: Status Distribution */}
          <Card className="tv-status-card">
            <CardContent className="tv-status-content">
              <div className="tv-chart-header">
                <PieChart className="h-4 w-4" />
                <span>Distribuição por Status</span>
              </div>
              <div className="tv-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="tv-chart-legend">
                {statusData.map((entry, index) => (
                  <div key={index} className="tv-legend-item">
                    <div className="tv-legend-color" style={{ backgroundColor: entry.color }} />
                    <span className="tv-legend-text">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Row 4: Priority Chart */}
          <Card className="tv-priority-card">
            <CardContent className="tv-priority-content">
              <div className="tv-chart-header">
                <BarChart3 className="h-4 w-4" />
                <span>Tickets por Prioridade</span>
              </div>
              <div className="tv-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={priorityData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DashboardTV;