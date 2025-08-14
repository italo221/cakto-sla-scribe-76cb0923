import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const { ticketsWithStatus } = useOptimizedTickets({ enableRealtime: true });
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

    return ticketsWithStatus.filter(ticket => {
      const ticketDate = new Date(ticket.data_criacao);
      const isInDateRange = ticketDate >= startDate && ticketDate <= endDate;
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
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Métricas de SLA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Setor</label>
              <Select value={selectedSetorId} onValueChange={setSelectedSetorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os setores" />
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleExportCSV} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {selectedPolicy && selectedSetorId !== 'all' && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4" />
                <span className="font-medium">Política Atual: {selectedPolicy.mode}</span>
              </div>
              {selectedPolicy.mode === 'FIXO' && (
                <div className="text-sm text-muted-foreground">
                  P0: {selectedPolicy.p0_hours}h | P1: {selectedPolicy.p1_hours}h | 
                  P2: {selectedPolicy.p2_hours}h | P3: {selectedPolicy.p3_hours}h
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Indicadores Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Tickets</p>
                <p className="text-2xl font-bold">{slaMetrics.totalTickets}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conformidade SLA</p>
                <p className="text-2xl font-bold">{slaMetrics.complianceRate.toFixed(1)}%</p>
                <Progress value={slaMetrics.complianceRate} className="mt-2" />
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Atrasados</p>
                <p className="text-2xl font-bold text-red-600">{slaMetrics.overdue}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-bold">{formatDuration(slaMetrics.avgResolutionHours)}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown por Criticidade */}
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Nível de Criticidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(slaMetrics.criticityBreakdown).map(([level, data]) => (
              <div key={level} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={level === 'P0' ? 'destructive' : level === 'P1' ? 'secondary' : 'outline'}>
                    {level}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {data.total} tickets
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Dentro do SLA:</span>
                    <span>{data.withinSLA}/{data.total}</span>
                  </div>
                  <Progress 
                    value={data.total > 0 ? (data.withinSLA / data.total) * 100 : 0} 
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground">
                    Tempo médio: {formatDuration(data.avgResolutionHours)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};