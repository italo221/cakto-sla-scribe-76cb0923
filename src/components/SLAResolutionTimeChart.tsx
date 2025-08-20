import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Filter, Download, Clock, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ResolutionTimeData {
  averageTime: number; // em segundos
  averageFormatted: string;
  medianTime?: number;
  p90Time?: number;
  ticketCount: number;
  byPriority: Array<{
    priority: string;
    averageTime: number;
    averageFormatted: string;
    count: number;
  }>;
}

interface TagResolutionData {
  tag: string;
  averageTime: number;
  averageFormatted: string;
  ticketCount: number;
}

interface SLAResolutionTimeProps {
  dateFilter: string;
  selectedSetor?: string;
  setores: Array<{ id: string; nome: string }>;
}

export const SLAResolutionTimeChart = ({ dateFilter, selectedSetor, setores }: SLAResolutionTimeProps) => {
  const [resolutionData, setResolutionData] = useState<ResolutionTimeData | null>(null);
  const [tagResolutionData, setTagResolutionData] = useState<TagResolutionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSetor, setLocalSetor] = useState<string>(selectedSetor || "all");
  const [viewMode, setViewMode] = useState<'geral' | 'por-tag' | 'todas-tags'>('geral');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagComboOpen, setTagComboOpen] = useState(false);

  const formatDuration = (seconds: number): string => {
    if (seconds < 3600) {
      const minutes = Math.round(seconds / 60);
      return `${minutes}m`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(seconds / 86400);
      const hours = Math.round((seconds % 86400) / 3600);
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
  };

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

  const loadResolutionData = async () => {
    setLoading(true);
    try {
      const startDate = getDateRange(dateFilter);
      
      let query = supabase
        .from('sla_demandas')
        .select('first_in_progress_at, resolved_at, nivel_criticidade, setor_id, tags')
        .gte('resolved_at', startDate.toISOString())
        .in('status', ['resolvido', 'fechado'])
        .not('first_in_progress_at', 'is', null)
        .not('resolved_at', 'is', null);

      if (localSetor !== "all") {
        query = query.eq('setor_id', localSetor);
      }

      const { data: tickets, error } = await query;
      
      if (error) {
        console.error('Erro ao carregar dados de tempo de resolução:', error);
        return;
      }

      if (!tickets || tickets.length === 0) {
        setResolutionData(null);
        setTagResolutionData([]);
        setAvailableTags([]);
        return;
      }

      // Extrair tags únicas
      const tagsSet = new Set<string>();
      tickets.forEach(ticket => {
        if (ticket.tags && Array.isArray(ticket.tags)) {
          ticket.tags.forEach(tag => {
            if (tag && tag.trim()) {
              tagsSet.add(tag.trim());
            }
          });
        }
      });
      setAvailableTags(Array.from(tagsSet).sort());

      // Filtrar tickets por tag se modo "por-tag" estiver ativo
      let filteredTickets = tickets;
      if (viewMode === 'por-tag' && selectedTag) {
        filteredTickets = tickets.filter(ticket => {
          if (!ticket.tags || !Array.isArray(ticket.tags)) return false;
          const primaryTag = ticket.tags[0];
          return primaryTag === selectedTag;
        });
      }

      // Calcular tempos de resolução em segundos
      const resolutionTimes: number[] = [];
      const priorityTimes: Record<string, number[]> = {
        'P0': [],
        'P1': [],
        'P2': [],
        'P3': []
      };

      filteredTickets.forEach(ticket => {
        if (ticket.first_in_progress_at && ticket.resolved_at) {
          const startTime = new Date(ticket.first_in_progress_at).getTime();
          const endTime = new Date(ticket.resolved_at).getTime();
          
          if (endTime >= startTime) {
            const resolutionSeconds = (endTime - startTime) / 1000;
            resolutionTimes.push(resolutionSeconds);
            
            const priority = ticket.nivel_criticidade || 'P3';
            if (priorityTimes[priority]) {
              priorityTimes[priority].push(resolutionSeconds);
            }
          }
        }
      });

      if (resolutionTimes.length === 0) {
        setResolutionData(null);
        return;
      }

      // Calcular estatísticas gerais
      const averageTime = resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length;
      
      // Calcular por prioridade
      const byPriority = Object.entries(priorityTimes)
        .filter(([_, times]) => times.length > 0)
        .map(([priority, times]) => {
          const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
          return {
            priority,
            averageTime: avg,
            averageFormatted: formatDuration(avg),
            count: times.length
          };
        })
        .sort((a, b) => {
          const order = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };
          return order[a.priority as keyof typeof order] - order[b.priority as keyof typeof order];
        });

      setResolutionData({
        averageTime,
        averageFormatted: formatDuration(averageTime),
        ticketCount: resolutionTimes.length,
        byPriority
      });

      // Calcular dados por tag para modo "todas-tags"
      if (viewMode === 'todas-tags') {
        const tagData: Record<string, number[]> = {};
        
        tickets.forEach(ticket => {
          if (ticket.first_in_progress_at && ticket.resolved_at) {
            const startTime = new Date(ticket.first_in_progress_at).getTime();
            const endTime = new Date(ticket.resolved_at).getTime();
            
            if (endTime >= startTime) {
              const resolutionSeconds = (endTime - startTime) / 1000;
              
              // Usar tag principal (primeira no array) ou "Sem tag"
              const primaryTag = ticket.tags && Array.isArray(ticket.tags) && ticket.tags.length > 0 
                ? ticket.tags[0] 
                : 'Sem tag';
              
              if (!tagData[primaryTag]) {
                tagData[primaryTag] = [];
              }
              tagData[primaryTag].push(resolutionSeconds);
            }
          }
        });

        const tagResolution = Object.entries(tagData)
          .map(([tag, times]) => ({
            tag,
            averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
            averageFormatted: formatDuration(times.reduce((sum, time) => sum + time, 0) / times.length),
            ticketCount: times.length
          }))
          .sort((a, b) => b.averageTime - a.averageTime);

        setTagResolutionData(tagResolution);
      }

    } catch (error) {
      console.error('Erro ao carregar dados de tempo de resolução:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResolutionData();
  }, [dateFilter, localSetor, viewMode, selectedTag]);

  useEffect(() => {
    setLocalSetor(selectedSetor || "all");
  }, [selectedSetor]);

  const exportCSV = () => {
    const setorName = localSetor === "all" ? "Todos" : setores.find(s => s.id === localSetor)?.nome || "";
    
    if (viewMode === 'todas-tags' && tagResolutionData.length > 0) {
      // Exportar dados por tag
      const csvContent = [
        ['Tag', 'Tempo Médio', 'Tickets Considerados', 'Período', 'Setor'].join(','),
        ...tagResolutionData.map(item => [
          `"${item.tag}"`,
          `"${item.averageFormatted}"`,
          item.ticketCount,
          dateFilter,
          setorName
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sla-resolution-time-by-tags-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      return;
    }

    if (!resolutionData) return;

    const csvContent = [
      ['Métrica', 'Valor', 'Tickets', 'Período', 'Setor', 'Tag'].join(','),
      [
        viewMode === 'por-tag' ? `Tempo Médio - ${selectedTag}` : 'Tempo Médio Geral',
        `"${resolutionData.averageFormatted}"`,
        resolutionData.ticketCount,
        dateFilter,
        setorName,
        viewMode === 'por-tag' ? selectedTag : ""
      ].join(','),
      ...resolutionData.byPriority.map(item => [
        `Tempo Médio ${item.priority}`,
        `"${item.averageFormatted}"`,
        item.count,
        dateFilter,
        setorName,
        viewMode === 'por-tag' ? selectedTag : ""
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sla-resolution-time-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const getPeriodLabel = (filter: string) => {
    switch (filter) {
      case '7days': return 'Últimos 7 dias';
      case '30days': return 'Últimos 30 dias';
      case '90days': return 'Últimos 90 dias';
      default: return 'Últimos 30 dias';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0': return 'bg-destructive text-destructive-foreground';
      case 'P1': return 'bg-orange-500 text-white';
      case 'P2': return 'bg-yellow-500 text-black';
      case 'P3': return 'bg-green-500 text-white';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Card className="bg-card border-border col-span-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Tempo de Resolução do SLA
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Considerando tickets que entraram em andamento e foram resolvidos no período
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Select value={localSetor} onValueChange={setLocalSetor}>
              <SelectTrigger className="w-40 h-8">
                <Filter className="h-3 w-3 mr-1" />
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

            <Select value={viewMode} onValueChange={(value: 'geral' | 'por-tag' | 'todas-tags') => {
              setViewMode(value);
              if (value !== 'por-tag') setSelectedTag('');
            }}>
              <SelectTrigger className="w-36 h-8">
                <Hash className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="geral">Geral</SelectItem>
                <SelectItem value="por-tag">Por Tag</SelectItem>
                <SelectItem value="todas-tags">Todas as Tags</SelectItem>
              </SelectContent>
            </Select>

            {viewMode === 'por-tag' && (
              <Popover open={tagComboOpen} onOpenChange={setTagComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={tagComboOpen}
                    className="w-48 h-8 justify-between text-xs"
                  >
                    {selectedTag || "Selecionar tag..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-0">
                  <Command>
                    <CommandInput placeholder="Buscar tag..." className="h-8" />
                    <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
                    <CommandList>
                      {availableTags.map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={() => {
                            setSelectedTag(tag);
                            setTagComboOpen(false);
                          }}
                        >
                          {tag}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={!resolutionData && viewMode !== 'todas-tags'}
              className="h-8 px-2"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="text-muted-foreground">Carregando dados...</div>
          </div>
        ) : !resolutionData && viewMode !== 'todas-tags' ? (
          <div className="h-40 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-lg font-medium">—</div>
              <div className="text-sm">
                {viewMode === 'por-tag' && selectedTag 
                  ? `Sem dados para a tag "${selectedTag}" no período/setor selecionado`
                  : "Sem dados suficientes no período"}
              </div>
            </div>
          </div>
        ) : viewMode === 'todas-tags' ? (
          <div className="space-y-6">
            {resolutionData && (
              <div className="text-center p-8 bg-muted/20 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-6 w-6 text-primary" />
                  <span className="text-base font-medium text-muted-foreground">Tempo Médio Geral</span>
                </div>
                <div className="text-5xl font-bold text-foreground mb-2">
                  {resolutionData.averageFormatted}
                </div>
                <div className="text-sm text-muted-foreground">
                  {resolutionData.ticketCount} tickets • {getPeriodLabel(dateFilter)} • {localSetor === "all" ? "Todos os setores" : setores.find(s => s.id === localSetor)?.nome}
                </div>
              </div>
            )}
            
            {tagResolutionData.length > 0 ? (
              <div className="bg-muted/20 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-4">Tempo Médio por Tag</h4>
                <div className="space-y-2">
                  {tagResolutionData.map((item, index) => (
                    <div key={item.tag} className="flex items-center justify-between p-3 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {item.tag === 'Sem tag' ? 'Sem tag' : `#${item.tag}`}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-foreground">{item.averageFormatted}</div>
                        <div className="text-sm text-muted-foreground">{item.ticketCount} tickets</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <div className="text-lg font-medium">—</div>
                <div className="text-sm">Sem dados por tag no período/setor selecionado</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-8 bg-muted/20 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="h-6 w-6 text-primary" />
              <span className="text-base font-medium text-muted-foreground">
                {viewMode === 'por-tag' && selectedTag ? `Tempo Médio - #${selectedTag}` : 'Tempo Médio de Resolução'}
              </span>
            </div>
            <div className="text-5xl font-bold text-foreground mb-2">
              {resolutionData.averageFormatted}
            </div>
            <div className="text-sm text-muted-foreground">
              {resolutionData.ticketCount} tickets • {getPeriodLabel(dateFilter)} • {localSetor === "all" ? "Todos os setores" : setores.find(s => s.id === localSetor)?.nome}
              {viewMode === 'por-tag' && selectedTag && ` • #${selectedTag}`}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};