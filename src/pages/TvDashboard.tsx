import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTags } from "@/hooks/useTags";
import type { Ticket } from "@/hooks/useOptimizedTickets";
import { formatTagLabel, TagWithTeam } from "@/utils/tagFormatting";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Target,
  Clock,
  RefreshCw,
  X,
  TrendingUp,
  AlertTriangle,
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
  Legend,
  LabelList
} from "recharts";

interface TagVolumeData {
  tag: string;
  count: number;
  percentage: number;
}

interface TagAvgTimeData {
  tag: string;
  avgSeconds: number;
  formatted: string;
  count: number;
  formattedTagName?: string; // Nome formatado com time
}

interface Setor {
  id: string;
  nome: string;
}

const STATUS_COLORS = {
  'aberto': '#ef4444',
  'em_andamento': '#f59e0b', 
  'resolvido': '#10b981',
  'fechado': '#6b7280'
};

const PRIORITY_COLORS = {
  'P0': '#dc2626',
  'P1': '#ea580c',
  'P2': '#d97706',
  'P3': '#65a30d'
};

export default function TvDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { organizedTags, fetchOrganizedTags } = useTags();
  
  // Estado para tickets - buscar TODOS sem limitação
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [dateFilter, setDateFilter] = useState("30days");
  const [selectedSetor, setSelectedSetor] = useState<string>("all");
  const [tagsFilter, setTagsFilter] = useState<string>("top10");
  const [setores, setSetores] = useState<Setor[]>([]);
  const [policies, setPolicies] = useState<Array<{setor_id: string; p0_hours: number; p1_hours: number; p2_hours: number; p3_hours: number}>>([]);
  const [tagVolumeData, setTagVolumeData] = useState<TagVolumeData[]>([]);
  const [tagAvgTimeData, setTagAvgTimeData] = useState<TagAvgTimeData[]>([]);
  const [loading, setLoading] = useState(true);

  const getDateRange = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case '7days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90days':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  // Criar mapa de tags organizadas para lookup rápido
  const tagTeamMap = useMemo(() => {
    const map = new Map<string, TagWithTeam>();
    organizedTags.forEach(tag => {
      map.set(tag.name.toLowerCase().trim(), tag);
    });
    console.log('Tags organizadas carregadas:', organizedTags.length, organizedTags);
    console.log('Mapa de tags criado:', Array.from(map.entries()));
    return map;
  }, [organizedTags]);

  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];
    
    const startDate = getDateRange(dateFilter);
    filtered = filtered.filter(ticket => new Date(ticket.data_criacao) >= startDate);
    
    if (selectedSetor !== "all") {
      filtered = filtered.filter(ticket => ticket.setor_id === selectedSetor);
    }
    
    return filtered;
  }, [tickets, dateFilter, selectedSetor]);

  // KPIs calculados
  const dashboardData = useMemo(() => {
    const totalTickets = filteredTickets.length;
    const overdueTickets = filteredTickets.filter(ticket => {
      if (ticket.status === 'resolvido' || ticket.status === 'fechado') return false;
      
      const policy = policies.find(p => p.setor_id === ticket.setor_id);
      if (!policy) return false;
      
      const now = new Date();
      const criacao = new Date(ticket.data_criacao);
      let deadlineHours = 168; // P3 padrão
      
      switch (ticket.nivel_criticidade) {
        case 'P0': deadlineHours = policy.p0_hours; break;
        case 'P1': deadlineHours = policy.p1_hours; break;
        case 'P2': deadlineHours = policy.p2_hours; break;
        case 'P3': deadlineHours = policy.p3_hours; break;
      }
      
      const deadline = new Date(criacao.getTime() + deadlineHours * 60 * 60 * 1000);
      return now > deadline;
    }).length;

    // SLA Compliance
    const resolvedTickets = filteredTickets.filter(t => t.status === 'resolvido' || t.status === 'fechado');
    const withinSLA = resolvedTickets.filter(ticket => {
      if (!ticket.resolved_at) return false;
      
      const policy = policies.find(p => p.setor_id === ticket.setor_id);
      if (!policy) return false;
      
      const criacao = new Date(ticket.data_criacao);
      const resolucao = new Date(ticket.resolved_at);
      let deadlineHours = 168;
      
      switch (ticket.nivel_criticidade) {
        case 'P0': deadlineHours = policy.p0_hours; break;
        case 'P1': deadlineHours = policy.p1_hours; break;
        case 'P2': deadlineHours = policy.p2_hours; break;
        case 'P3': deadlineHours = policy.p3_hours; break;
      }
      
      const deadline = new Date(criacao.getTime() + deadlineHours * 60 * 60 * 1000);
      return resolucao <= deadline;
    }).length;

    const slaCompliance = resolvedTickets.length > 0 ? (withinSLA / resolvedTickets.length) * 100 : 0;
    
    // Log DETALHADO para debug das métricas de SLA
    console.log('📊 TvDashboard - CÁLCULO DE SLA DETALHADO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📅 Filtros aplicados:', {
      periodo: dateFilter,
      setor: selectedSetor === 'all' ? 'Todos' : selectedSetor
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 TOTAL DE TICKETS:', totalTickets);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔴 TICKETS ATRASADOS (ainda abertos):');
    console.log('   Quantidade:', overdueTickets, `(${((overdueTickets/totalTickets)*100).toFixed(1)}%)`);
    console.log('   Definição: Tickets ABERTOS/EM ANDAMENTO que já passaram do prazo SLA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CUMPRIMENTO DE SLA:', slaCompliance.toFixed(1) + '%');
    console.log('   Base de cálculo: APENAS tickets JÁ RESOLVIDOS/FECHADOS');
    console.log('   Total de tickets resolvidos:', resolvedTickets.length, `(${((resolvedTickets.length/totalTickets)*100).toFixed(1)}% do total)`);
    console.log('   Resolvidos DENTRO do prazo:', withinSLA);
    console.log('   Resolvidos FORA do prazo:', resolvedTickets.length - withinSLA);
    console.log('   Fórmula: (resolvidos no prazo / total resolvidos) × 100');
    console.log('   Cálculo:', `(${withinSLA} / ${resolvedTickets.length}) × 100 = ${slaCompliance.toFixed(1)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMO:');
    console.log(`   • ${totalTickets} tickets no período`);
    console.log(`   • ${resolvedTickets.length} foram resolvidos (${((resolvedTickets.length/totalTickets)*100).toFixed(1)}%)`);
    console.log(`   • ${withinSLA} resolvidos NO PRAZO (${slaCompliance.toFixed(1)}% dos resolvidos)`);
    console.log(`   • ${resolvedTickets.length - withinSLA} resolvidos ATRASADOS (${(100-slaCompliance).toFixed(1)}% dos resolvidos)`);
    console.log(`   • ${overdueTickets} ainda ABERTOS e já ATRASADOS (${((overdueTickets/totalTickets)*100).toFixed(1)}% do total)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Status distribution - incluir atrasados e excluir fechados para modo TV
    const statusCount = filteredTickets.reduce((acc, ticket) => {
      // Pular tickets fechados no modo TV
      if (ticket.status === 'fechado') return acc;
      
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Adicionar categoria de atrasados
    statusCount['atrasado'] = overdueTickets;

    const statusData = Object.entries(statusCount)
      .filter(([status]) => status !== 'fechado') // Garantir que fechado não apareça
      .map(([status, count]) => ({
        name: status,
        value: count,
        color: status === 'atrasado' ? '#dc2626' : STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6b7280'
      }));

    // Priority distribution
    const priorityCount = filteredTickets.reduce((acc, ticket) => {
      acc[ticket.nivel_criticidade] = (acc[ticket.nivel_criticidade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityData = Object.entries(priorityCount).map(([priority, count]) => ({
      name: priority,
      value: count,
      color: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || '#6b7280'
    }));

    return {
      totalTickets,
      overdueTickets,
      slaCompliance,
      statusData,
      priorityData
    };
  }, [filteredTickets, policies]);

  const loadTagVolumeData = useCallback(async () => {
    try {
      const startDate = getDateRange(dateFilter);
      
      let query = supabase
        .from('sla_demandas')
        .select('tags')
        .gte('data_criacao', startDate.toISOString());

      if (selectedSetor !== "all") {
        query = query.eq('setor_id', selectedSetor);
      }

      const { data, error } = await query;
      if (error) throw error;

      const tagCount: Record<string, number> = {};
      let totalTags = 0;

      data?.forEach(ticket => {
        if (ticket.tags && Array.isArray(ticket.tags)) {
          ticket.tags.forEach(tag => {
            if (tag && tag.trim()) {
              const cleanTag = tag.trim().toLowerCase();
              tagCount[cleanTag] = (tagCount[cleanTag] || 0) + 1;
              totalTags++;
            }
          });
        } else {
          tagCount['sem tag'] = (tagCount['sem tag'] || 0) + 1;
          totalTags++;
        }
      });

      let tagArray = Object.entries(tagCount).map(([tag, count]) => ({
        tag,
        count,
        percentage: totalTags > 0 ? (count / totalTags) * 100 : 0
      }));

      tagArray.sort((a, b) => b.count - a.count);

      if (tagsFilter === "top10") {
        tagArray = tagArray.slice(0, 10);
      }

      setTagVolumeData(tagArray);
    } catch (error) {
      console.error('Erro ao carregar dados de tags:', error);
    }
  }, [dateFilter, selectedSetor, tagsFilter]);

  const loadTagAvgTimeData = useCallback(async () => {
    try {
      const startDate = getDateRange(dateFilter);
      
      let query = supabase
        .from('sla_demandas')
        .select('tags, first_in_progress_at, resolved_at')
        .in('status', ['resolvido', 'fechado'])
        .gte('data_criacao', startDate.toISOString())
        .not('first_in_progress_at', 'is', null)
        .not('resolved_at', 'is', null);

      if (selectedSetor !== "all") {
        query = query.eq('setor_id', selectedSetor);
      }

      const { data, error } = await query;
      if (error) throw error;

      const tagTimes: Record<string, { totalSeconds: number; count: number }> = {};

      data?.forEach(ticket => {
        if (ticket.first_in_progress_at && ticket.resolved_at) {
          const startTime = new Date(ticket.first_in_progress_at);
          const endTime = new Date(ticket.resolved_at);
          const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

          if (ticket.tags && Array.isArray(ticket.tags) && ticket.tags.length > 0) {
            ticket.tags.forEach(tag => {
              if (tag && tag.trim()) {
                const cleanTag = tag.trim().toLowerCase();
                if (!tagTimes[cleanTag]) {
                  tagTimes[cleanTag] = { totalSeconds: 0, count: 0 };
                }
                tagTimes[cleanTag].totalSeconds += durationSeconds;
                tagTimes[cleanTag].count += 1;
              }
            });
          } else {
            if (!tagTimes['sem tag']) {
              tagTimes['sem tag'] = { totalSeconds: 0, count: 0 };
            }
            tagTimes['sem tag'].totalSeconds += durationSeconds;
            tagTimes['sem tag'].count += 1;
          }
        }
      });

      const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours >= 24) {
          const days = Math.floor(hours / 24);
          const remainingHours = hours % 24;
          return `${days}d ${remainingHours}h`;
        } else {
          return `${hours}h ${minutes}m`;
        }
      };

      let tagAvgArray = Object.entries(tagTimes).map(([tag, data]) => {
        // Buscar informações de time para a tag
        const tagWithTeam = tagTeamMap.get(tag) || { name: tag, teamName: null, team_id: null };
        const formattedTagName = formatTagLabel(tagWithTeam);
        
        console.log(`Tag processada: "${tag}" | Encontrada no mapa: ${tagTeamMap.has(tag)} | Formatada: "${formattedTagName}"`);
        
        return {
          tag,
          avgSeconds: data.totalSeconds / data.count,
          formatted: formatDuration(data.totalSeconds / data.count),
          count: data.count,
          formattedTagName
        };
      });

      tagAvgArray.sort((a, b) => b.avgSeconds - a.avgSeconds);

      if (tagsFilter === "top10") {
        tagAvgArray = tagAvgArray.slice(0, 10);
      }

      setTagAvgTimeData(tagAvgArray);
    } catch (error) {
      console.error('Erro ao carregar tempo médio por tag:', error);
    }
  }, [dateFilter, selectedSetor, tagsFilter, tagTeamMap]);

  const loadSetores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('setores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setSetores(data || []);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    }
  }, []);

  const loadPolicies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sla_policies')
        .select('setor_id, p0_hours, p1_hours, p2_hours, p3_hours');

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error('Erro ao carregar políticas SLA:', error);
    }
  }, []);

  // Função para buscar TODOS os tickets sem limitação
  const loadAllTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sla_demandas')
        .select('*')
        .order('data_criacao', { ascending: false });
      
      if (error) throw error;
      setTickets(data || []);
      console.log('✅ TvDashboard: Carregados', data?.length || 0, 'tickets');
    } catch (error) {
      console.error('❌ Erro ao carregar tickets:', error);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    loadAllTickets();
    fetchOrganizedTags();
    loadTagVolumeData();
    loadTagAvgTimeData();
  }, [loadAllTickets, fetchOrganizedTags, loadTagVolumeData, loadTagAvgTimeData]);

  // Auto-refresh a cada 60s
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 60000);

    return () => clearInterval(interval);
  }, [handleRefresh]);

  // Carregar dados iniciais incluindo TODOS os tickets
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadAllTickets(),
        loadSetores(),
        loadPolicies(),
        loadTagVolumeData(),
        loadTagAvgTimeData()
      ]);
      setLoading(false);
    };
    loadData();
  }, [loadAllTickets, loadSetores, loadPolicies, loadTagVolumeData, loadTagAvgTimeData]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-secondary/20 p-3 overflow-hidden">
      {/* Header com controles */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3 text-lg">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="font-semibold text-foreground">Dashboard - Modo TV</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            size="sm"
            variant="outline"
            className="h-8 px-3"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            size="sm"
            variant="outline"
            className="h-8 px-3"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtros compactos */}
      <div className="flex items-center gap-4 mb-4 p-2 bg-card/50 backdrop-blur-sm rounded-lg border">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Período:</label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 dias</SelectItem>
              <SelectItem value="30days">30 dias</SelectItem>
              <SelectItem value="90days">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Setor:</label>
          <Select value={selectedSetor} onValueChange={setSelectedSetor}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {setores.map(setor => (
                <SelectItem key={setor.id} value={setor.id}>
                  {setor.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Tags:</label>
          <Select value={tagsFilter} onValueChange={setTagsFilter}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top10">Top 10</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Layout principal */}
      <div className="space-y-3 h-[calc(100vh-140px)]">
        {/* Primeira linha: KPIs + Gráfico de Status */}
        <div className="grid grid-cols-12 gap-3">
          {/* KPIs - 3 cards lado a lado */}
          <div className="col-span-8 grid grid-cols-3 gap-3">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 h-full">
              <CardContent className="p-4 h-full flex items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total de Tickets</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatNumber(dashboardData.totalTickets)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-border/50 h-full">
              <CardContent className="p-4 h-full flex items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Cumprimento SLA</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatPercentage(dashboardData.slaCompliance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-border/50 h-full">
              <CardContent className="p-4 h-full flex items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Tickets Atrasados</p>
                    <div className="flex flex-col">
                      <p className="text-2xl font-bold text-foreground">
                        {filteredTickets.length > 0 
                          ? formatPercentage((dashboardData.overdueTickets / filteredTickets.length) * 100)
                          : '0%'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ({formatNumber(dashboardData.overdueTickets)} tickets)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Status - alinhado à direita */}
          <div className="col-span-4">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 h-full">
              <CardHeader className="pb-2 p-3">
                <CardTitle className="text-sm font-semibold">Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 flex flex-col justify-between h-[calc(100%-3rem)]">
                <ResponsiveContainer width="100%" height={100}>
                  <RechartsPieChart>
                    <Pie
                      data={dashboardData.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={40}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {dashboardData.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatNumber(value as number), 'Tickets']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
                {/* Legendas do Status */}
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {dashboardData.statusData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {entry.name} ({entry.value})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Segunda linha: Tags Volume + Gráfico de Prioridade + Lista Tempo Médio */}
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Tags - Volume Central */}
          <div className="col-span-8">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 h-full">
              <CardHeader className="pb-3 p-4">
                <CardTitle className="text-base font-semibold">Tags – Volume de Tickets</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 h-[calc(100%-4rem)] min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tagVolumeData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="tag" 
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value) => [formatNumber(value as number), 'Tickets']}
                      labelFormatter={(label) => `Tag: ${label}`}
                    />
                     <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]}>
                       <LabelList 
                         dataKey="count" 
                         position="top" 
                         style={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                         formatter={(value: number) => value > 0 ? value : ''}
                       />
                     </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Coluna direita: Gráfico de Prioridade e Lista Tempo Médio */}
          <div className="col-span-4 flex flex-col gap-3 min-h-0">
            {/* Gráfico de Prioridade */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 flex-shrink-0" style={{ height: '180px' }}>
              <CardHeader className="pb-2 p-3">
                <CardTitle className="text-sm font-semibold">Tickets por Prioridade</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 h-[calc(100%-3rem)]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.priorityData} margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [formatNumber(value as number), 'Tickets']} />
                    <Bar dataKey="value" fill="#8884d8">
                      <LabelList 
                        dataKey="value" 
                        position="top" 
                        style={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => value > 0 ? value : ''}
                      />
                      {dashboardData.priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tempo médio por Tag */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 flex-1 min-h-0">
              <CardHeader className="pb-3 p-4 flex-shrink-0">
                <CardTitle className="text-base font-semibold">Tempo médio por Tag</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-2">
                  {tagAvgTimeData.length > 0 ? (
                    tagAvgTimeData.map((item, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-center p-2 bg-secondary/20 rounded text-sm"
                      >
                        <span className="font-medium">{item.formattedTagName || `#${item.tag}`}</span>
                        <span className="text-muted-foreground">
                          {item.formatted}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground text-sm">
                      Nenhum dado disponível
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}