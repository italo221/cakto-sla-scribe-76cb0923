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
  
  // Detectar se está em modo TV através do body class
  const isTVMode = document.body.classList.contains('tv-mode');

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
              // Manter apenas tickets que ATUALMENTE têm a tag (comportamento efêmero)
              if (normalizedTag === "info-incompleta") {
                // Para tag especial, contar apenas se ticket tem a tag AGORA
                tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
                totalTags++;
              } else {
                // Para outras tags, comportamento normal
                tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
                totalTags++;
              }
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

       // Aplicar limite de top tags (máximo 10 no modo TV)
       let limit = topCount === "all" ? tagArray.length : parseInt(topCount);
       if (isTVMode) {
         limit = Math.min(limit, 10);
       }
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
    <div 
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-8 col-span-full"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            Tags – volume de tickets
          </h3>
          <p className="text-sm text-gray-400">
            {getPeriodLabel(dateFilter)} • {localSetor === "all" ? "Todos os setores" : setores.find(s => s.id === localSetor)?.nome}
          </p>
        </div>
        
        {!isTVMode && (
          <div className="flex items-center gap-3">
            <Select value={localSetor} onValueChange={setLocalSetor}>
              <SelectTrigger className="h-10 px-4 bg-gray-900/50 border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors">
                <Filter className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="all">Todos os setores</SelectItem>
                {setores.map(setor => (
                  <SelectItem key={setor.id} value={setor.id}>
                    {setor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={topCount} onValueChange={setTopCount}>
              <SelectTrigger className="h-10 px-4 bg-gray-900/50 border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={exportCSV}
              disabled={tagData.length === 0}
              className="h-10 px-4 bg-gray-900/50 border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-gray-400 text-sm">Carregando dados...</div>
          </div>
        ) : tagData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-2xl font-semibold text-gray-500 mb-2">—</div>
              <div className="text-sm">Sem dados suficientes no período</div>
            </div>
          </div>
        ) : (
          <div className={isTVMode ? "h-full" : "min-h-[300px]"}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={tagData}
                margin={{ 
                  top: 20, 
                  right: isTVMode ? 20 : 30, 
                  left: isTVMode ? 15 : 20, 
                  bottom: isTVMode ? 50 : 60 
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                <XAxis 
                  dataKey="tag" 
                  stroke="#9ca3af"
                  fontSize={isTVMode ? 10 : 12}
                  angle={isTVMode ? -15 : -45}
                  textAnchor="end"
                  height={isTVMode ? 35 : 60}
                  interval={0}
                  tick={{ fill: '#9ca3af' }}
                  style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={isTVMode ? 10 : 12}
                  tickCount={isTVMode ? 3 : 5}
                  width={isTVMode ? 30 : 40}
                  tick={{ fill: '#9ca3af' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length && !isTVMode) {
                      const data = payload[0].payload as TagData;
                      return (
                        <div 
                          className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg"
                          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                        >
                          <p className="font-medium text-white text-sm">{label}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            <span className="font-medium text-white">{data.count}</span> tickets
                          </p>
                          <p className="text-xs text-gray-400">
                            <span className="font-medium text-white">{data.percentage.toFixed(1)}%</span> do total
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="rgba(34, 197, 94, 0.8)"
                  radius={[isTVMode ? 2 : 6, isTVMode ? 2 : 6, 0, 0]}
                  maxBarSize={isTVMode ? 12 : 48}
                  className="transition-opacity duration-200 hover:opacity-90"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};