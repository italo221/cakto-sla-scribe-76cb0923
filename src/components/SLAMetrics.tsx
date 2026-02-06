import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Download, TrendingUp, TrendingDown, Clock, Target } from 'lucide-react';
import { useSLAPolicies } from '@/hooks/useSLAPolicies';
import { useOptimizedTickets } from '@/hooks/useOptimizedTickets';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SLAMetricsProps {
  setores: Array<{ id: string; nome: string; }>;
}

export const SLAMetrics = ({ setores }: SLAMetricsProps) => {
  const { policies, getPolicyBySetor, calculateSLADeadline } = useSLAPolicies();
  const { ticketsWithStatus } = useOptimizedTickets({ enableRealtime: false }); // ❌ Desabilitado para reduzir queries
  const [selectedSetorId, setSelectedSetorId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');

  // Função para formatar duração: xh ym ou Xd xh, sem dados = "—"
  const formatDuration = (hours: number) => {
    if (!hours || hours === 0) return '—';
    
    if (hours < 24) {
      const h = Math.floor(hours);
      const m = Math.floor((hours - h) * 60);
      if (h === 0) return `${m}m`;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  };

  const filteredTickets = useMemo(() => {
    const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
    const endDate = endOfDay(new Date());
    
    // Data mínima fixa: 11/07/2025
    const minDate = new Date('2025-07-11T00:00:00.000Z');

    return ticketsWithStatus.filter(ticket => {
      const ticketDate = new Date(ticket.data_criacao);
      
      // Combinar período selecionado com data mínima (interseção)
      const effectiveStartDate = new Date(Math.max(startDate.getTime(), minDate.getTime()));
      const isInDateRange = ticketDate >= effectiveStartDate && ticketDate <= endDate;
      const isInSetor = selectedSetorId && selectedSetorId !== 'all' ? ticket.setor_id === selectedSetorId : true;
      
      return isInDateRange && isInSetor;
    });
  }, [ticketsWithStatus, selectedSetorId, dateRange]);

  const slaMetrics = useMemo(() => {
    const totalTickets = filteredTickets.length;
    let withinSLAResolved = 0;
    let overdue = 0;
    let resolved = 0;
    let totalResolutionTime = 0;

    const criticityBreakdown = {
      P0: { total: 0, withinSLA: 0, avgResolutionHours: 0, resolutionTimes: [] as number[] },
      P1: { total: 0, withinSLA: 0, avgResolutionHours: 0, resolutionTimes: [] as number[] },
      P2: { total: 0, withinSLA: 0, avgResolutionHours: 0, resolutionTimes: [] as number[] },
      P3: { total: 0, withinSLA: 0, avgResolutionHours: 0, resolutionTimes: [] as number[] },
    };

    filteredTickets.forEach(ticket => {
      const level = ticket.nivel_criticidade as keyof typeof criticityBreakdown;
      if (!criticityBreakdown[level]) return;

      criticityBreakdown[level].total++;

      // Calcular deadline aplicado (prazo interno tem prioridade)
      let deadline: Date;
      if (ticket.prazo_interno) {
        deadline = new Date(ticket.prazo_interno);
      } else {
        deadline = calculateSLADeadline(
          ticket.nivel_criticidade,
          ticket.data_criacao,
          ticket.setor_id || undefined
        );
      }

      const isResolved = ['resolvido', 'fechado'].includes(ticket.status);
      
      if (isResolved) {
        resolved++;
        
        // Calcular tempo de resolução usando resolved_at (campo específico para isso)
        const createdAt = new Date(ticket.data_criacao);
        const resolvedAt = ticket.resolved_at ? new Date(ticket.resolved_at) : null;
        
        if (resolvedAt) {
          const resolutionTimeMs = Math.max(0, resolvedAt.getTime() - createdAt.getTime());
          const resolutionDays = resolutionTimeMs / (1000 * 60 * 60 * 24);
          
          // Debug: Log tickets com tempo muito alto (>= 7 dias)
          if (resolutionDays >= 7) {
            console.log(`[SLA Debug] Ticket ${ticket.ticket_number || ticket.id}:`, {
              nivel: level,
              criado_em: format(createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
              resolvido_em: format(resolvedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
              dias_resolucao: resolutionDays.toFixed(1),
              status: ticket.status,
              setor: ticket.setor_id,
              updated_at: ticket.updated_at,
              tem_prazo_interno: !!ticket.prazo_interno
            });
          }
          
          totalResolutionTime += resolutionTimeMs;
          criticityBreakdown[level].resolutionTimes.push(resolutionTimeMs);
          
          // Verificar conformidade SLA: resolvido dentro do prazo aplicado
          const resolvedWithinSLA = resolvedAt <= deadline;
          if (resolvedWithinSLA) {
            withinSLAResolved++;
            criticityBreakdown[level].withinSLA++;
          }
        }
      } else {
        // Ticket não resolvido: verificar se está atrasado
        if (new Date() > deadline) {
          overdue++;
        }
      }
    });

    // Calcular médias de tempo de resolução por criticidade
    Object.keys(criticityBreakdown).forEach(level => {
      const levelData = criticityBreakdown[level as keyof typeof criticityBreakdown];
      const resolutionTimes = levelData.resolutionTimes;
      if (resolutionTimes.length > 0) {
        const avgMs = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
        levelData.avgResolutionHours = avgMs / (1000 * 60 * 60);
      }
    });

    // Taxa de conformidade SLA: % de tickets resolvidos dentro do prazo aplicado
    const complianceRate = resolved > 0 ? (withinSLAResolved / resolved) * 100 : 0;
    
    // Tempo médio de resolução: média de (resolved_at - created_at) para tickets resolvidos
    const avgResolutionHours = resolved > 0 ? totalResolutionTime / (resolved * 1000 * 60 * 60) : 0;

    return {
      totalTickets,
      withinSLA: withinSLAResolved,
      overdue,
      resolved,
      complianceRate,
      avgResolutionHours,
      criticityBreakdown,
    };
  }, [filteredTickets, calculateSLADeadline]);

  // Debug geral das métricas
  useEffect(() => {
    console.log(`[SLA Métricas] Período: ${dateRange} dias | Setor: ${selectedSetorId}`);
    console.log(`[SLA Métricas] Total tickets no período: ${filteredTickets.length}`);
    console.log(`[SLA Métricas] Tickets resolvidos: ${slaMetrics.resolved}`);
    console.log(`[SLA Métricas] Tempo médio geral: ${formatDuration(slaMetrics.avgResolutionHours)}`);
    console.log(`[SLA Métricas] Breakdown por criticidade:`, slaMetrics.criticityBreakdown);
  }, [slaMetrics, dateRange, selectedSetorId, filteredTickets.length]);

  const selectedPolicy = selectedSetorId && selectedSetorId !== 'all' ? getPolicyBySetor(selectedSetorId) : null;

  const handleExportCSV = () => {
    const csvContent = [
      ['Métrica', 'Valor'],
      ['Total de Tickets', slaMetrics.totalTickets],
      ['Dentro do SLA', slaMetrics.withinSLA],
      ['Atrasados', slaMetrics.overdue],
      ['Taxa de Conformidade (%)', slaMetrics.complianceRate.toFixed(1)],
      ['Tempo Médio de Resolução (horas)', slaMetrics.avgResolutionHours.toFixed(1)],
      ['', ''],
      ['Breakdown por Criticidade', ''],
      ...Object.entries(slaMetrics.criticityBreakdown).map(([level, data]) => [
        `${level} - Total`, data.total
      ]),
      ...Object.entries(slaMetrics.criticityBreakdown).map(([level, data]) => [
        `${level} - Dentro do SLA`, data.withinSLA
      ]),
    ];

    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sla_metrics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Filtros */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            Métricas de SLA
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Setor</label>
            <Select value={selectedSetorId} onValueChange={setSelectedSetorId}>
              <SelectTrigger className="h-10 bg-gray-900/50 border-gray-800 rounded-lg text-gray-300">
                <SelectValue placeholder="Todos os setores" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="all">Todos os setores</SelectItem>
                {setores.map((setor) => (
                  <SelectItem key={setor.id} value={setor.id}>
                    {setor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Período</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-10 bg-gray-900/50 border-gray-800 rounded-lg text-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button 
              onClick={handleExportCSV} 
              variant="outline" 
              className="w-full h-10 bg-gray-900/50 border-gray-800 rounded-lg text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {selectedPolicy && selectedSetorId !== 'all' && (
          <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-white text-sm">Política atual: {selectedPolicy.mode}</span>
            </div>
            {selectedPolicy.mode === 'FIXO' && (
              <div className="text-xs text-gray-500">
                P0: {selectedPolicy.p0_hours}h | P1: {selectedPolicy.p1_hours}h | 
                P2: {selectedPolicy.p2_hours}h | P3: {selectedPolicy.p3_hours}h
              </div>
            )}
          </div>
        )}
      </div>

      {/* Indicadores Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Total de tickets"
          value={slaMetrics.totalTickets}
          icon={Calendar}
        />
        <MetricCard
          label="Conformidade SLA"
          value={`${slaMetrics.complianceRate.toFixed(1)}%`}
          icon={Target}
        >
          <Progress value={slaMetrics.complianceRate} className="mt-3 h-1.5 bg-neutral-800" />
        </MetricCard>
        <MetricCard
          label="Atrasados"
          value={slaMetrics.totalTickets > 0 
            ? `${((slaMetrics.overdue / slaMetrics.totalTickets) * 100).toFixed(1)}%`
            : '0%'
          }
          icon={TrendingDown}
        />
        <MetricCard
          label="Tempo médio"
          value={formatDuration(slaMetrics.avgResolutionHours)}
          icon={Clock}
        />
      </div>

      {/* Breakdown por Criticidade */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-8">
        <h3 className="text-lg font-semibold text-white mb-6">Desempenho por nível de criticidade</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Object.entries(slaMetrics.criticityBreakdown).map(([level, data]) => (
            <div key={level} className="bg-gray-800/30 rounded-lg p-4 border border-gray-800/50">
              <div className="flex items-center justify-between mb-3">
                <Badge 
                  className={
                    level === 'P0' ? 'bg-red-500 text-white' : 
                    level === 'P1' ? 'bg-orange-500 text-white' : 
                    level === 'P2' ? 'bg-yellow-500 text-black' : 
                    'bg-green-500 text-white'
                  }
                >
                  {level}
                </Badge>
                <span className="text-xs text-gray-500">
                  {data.total} tickets
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Dentro do SLA:</span>
                  <span className="text-white font-medium">{data.withinSLA}/{data.total}</span>
                </div>
                <Progress 
                  value={data.total > 0 ? (data.withinSLA / data.total) * 100 : 0} 
                  className="h-1.5 bg-gray-800"
                />
                <div className="text-xs text-gray-500">
                  Tempo médio: {formatDuration(data.avgResolutionHours)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};