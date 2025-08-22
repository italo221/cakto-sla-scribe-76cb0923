import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, RefreshCw } from "lucide-react";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface Setor {
  id: string;
  nome: string;
  descricao?: string;
}

const DashboardTV = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, loading } = useTicketStats();
  
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedSetor, setSelectedSetor] = useState("all");
  const [selectedTagType, setSelectedTagType] = useState("all");
  const [setores, setSetores] = useState<Setor[]>([]);
  const [resolutionData, setResolutionData] = useState<any>(null);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);

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

  // Fetch additional chart data
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        // Status distribution data
        const statusChartData = [
          { name: 'Abertos', value: stats.abertos, color: '#3B82F6' },
          { name: 'Em Andamento', value: stats.em_andamento, color: '#F59E0B' },
          { name: 'Resolvidos', value: stats.resolvidos, color: '#10B981' },
          { name: 'Fechados', value: stats.fechados, color: '#6B7280' }
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
            { name: 'P0', value: priorityCounts.P0 || 0, color: '#DC2626' },
            { name: 'P1', value: priorityCounts.P1 || 0, color: '#EA580C' },
            { name: 'P2', value: priorityCounts.P2 || 0, color: '#F59E0B' },
            { name: 'P3', value: priorityCounts.P3 || 0, color: '#10B981' }
          ];
          
          setPriorityData(priorityChartData);
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }
    };

    if (!loading) {
      fetchChartData();
    }
  }, [stats, loading]);

  const handleExitTVMode = () => {
    navigate('/dashboard');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="tv-mode min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="tv-mode-container">
      {/* Exit and Refresh Buttons */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          onClick={handleExitTVMode}
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="tv-grid">
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
            <div className="tv-kpi-value text-blue-600">{stats.abertos}</div>
          </CardContent>
        </Card>

        <Card className="tv-kpi-card">
          <CardContent className="tv-kpi-content">
            <div className="tv-kpi-title">Cumprimento SLA</div>
            <div className="tv-kpi-value text-green-600">
              {stats.total > 0 ? Math.round(((stats.total - stats.atrasados) / stats.total) * 100) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="tv-kpi-card">
          <CardContent className="tv-kpi-content">
            <div className="tv-kpi-title">Tickets Atrasados</div>
            <div className="tv-kpi-value text-red-600">{stats.atrasados}</div>
          </CardContent>
        </Card>

        {/* Filters Bar */}
        <div className="tv-filters-bar">
          <div className="flex items-center justify-end gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Período:</span>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Setor:</span>
              <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                <SelectTrigger className="w-40 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {setores.map((setor) => (
                    <SelectItem key={setor.id} value={setor.id}>
                      {setor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tags:</span>
              <Select value={selectedTagType} onValueChange={setSelectedTagType}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Tags</SelectItem>
                  <SelectItem value="general">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Row 2: SLA Resolution Time */}
        <Card className="tv-sla-card">
          <CardHeader className="tv-card-header">
            <CardTitle className="tv-card-title">Tempo de Resolução do SLA</CardTitle>
          </CardHeader>
          <CardContent className="tv-sla-content">
            <SLAResolutionTimeChart 
              dateFilter={selectedPeriod}
              setores={setores}
            />
          </CardContent>
        </Card>

        {/* Row 3: Tags Volume */}
        <Card className="tv-tags-card">
          <CardHeader className="tv-card-header">
            <CardTitle className="tv-card-title">Tags – Volume de Tickets</CardTitle>
          </CardHeader>
          <CardContent className="tv-tags-content">
            <TagAnalyticsChart 
              dateFilter={selectedPeriod}
              selectedSetor={selectedSetor}
              setores={setores}
            />
          </CardContent>
        </Card>

        {/* Row 4: Status Distribution */}
        <Card className="tv-status-card">
          <CardHeader className="tv-card-header">
            <CardTitle className="tv-card-title">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent className="tv-status-content">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {statusData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1 text-xs">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Row 4: Priority Chart */}
        <Card className="tv-priority-card">
          <CardHeader className="tv-card-header">
            <CardTitle className="tv-card-title">Tickets por Prioridade</CardTitle>
          </CardHeader>
          <CardContent className="tv-priority-content">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="value">
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardTV;