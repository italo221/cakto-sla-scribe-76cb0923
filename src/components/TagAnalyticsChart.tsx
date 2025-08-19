import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TagData {
  tag: string;
  count: number;
  percentage: number;
}

interface TagAnalyticsProps {
  dateFilter: string;
  selectedSetor?: string;
  setores: Array<{ id: string; nome: string }>;
}

export const TagAnalyticsChart = ({ dateFilter, selectedSetor, setores }: TagAnalyticsProps) => {
  const [tagData, setTagData] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSetor, setLocalSetor] = useState<string>(selectedSetor || "all");
  const [topCount, setTopCount] = useState<string>("10");
  const [viewType, setViewType] = useState<string>("bars");

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

  const loadTagData = async () => {
    setLoading(true);
    try {
      const startDate = getDateRange(dateFilter);
      
      let query = supabase
        .from('sla_demandas')
        .select('tags, setor_id, data_criacao')
        .gte('data_criacao', startDate.toISOString())
        .not('tags', 'is', null);

      if (localSetor !== "all") {
        query = query.eq('setor_id', localSetor);
      }

      const { data: tickets, error } = await query;
      
      if (error) {
        console.error('Erro ao carregar dados de tags:', error);
        return;
      }

      // Processar tags
      const tagCounts: Record<string, number> = {};
      let totalTags = 0;

      tickets?.forEach(ticket => {
        if (ticket.tags && Array.isArray(ticket.tags)) {
          ticket.tags.forEach((tag: string) => {
            if (tag && tag.trim()) {
              const normalizedTag = tag.trim();
              tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
              totalTags++;
            }
          });
        }
      });

      // Converter para array e ordenar
      const tagArray = Object.entries(tagCounts)
        .map(([tag, count]) => ({
          tag,
          count,
          percentage: totalTags > 0 ? (count / totalTags) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);

      // Aplicar limite de top tags
      const limit = topCount === "all" ? tagArray.length : parseInt(topCount);
      setTagData(tagArray.slice(0, limit));

    } catch (error) {
      console.error('Erro ao carregar analytics de tags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTagData();
  }, [dateFilter, localSetor, topCount]);

  useEffect(() => {
    setLocalSetor(selectedSetor || "all");
  }, [selectedSetor]);

  const exportCSV = () => {
    if (tagData.length === 0) return;

    const csvContent = [
      ['Tag', 'Quantidade', '% do Total', 'Setor', 'Período'].join(','),
      ...tagData.map(item => [
        `"${item.tag}"`,
        item.count,
        `${item.percentage.toFixed(1)}%`,
        localSetor === "all" ? "Todos" : setores.find(s => s.id === localSetor)?.nome || "",
        dateFilter
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tags-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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

  return (
    <Card className="bg-card border-border col-span-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Tags – Volume de Tickets
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {getPeriodLabel(dateFilter)} • {localSetor === "all" ? "Todos os setores" : setores.find(s => s.id === localSetor)?.nome}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
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

            <Select value={topCount} onValueChange={setTopCount}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={tagData.length === 0}
              className="h-8 px-2"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">Carregando dados...</div>
          </div>
        ) : tagData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-lg font-medium">—</div>
              <div className="text-sm">Sem dados suficientes no período</div>
            </div>
          </div>
        ) : (
          <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tagData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="tag" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as TagData;
                        return (
                          <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-medium text-foreground">{label}</p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">{data.count}</span> tickets
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">{data.percentage.toFixed(1)}%</span> do total
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};