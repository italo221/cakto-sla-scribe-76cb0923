import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Search, Download, RotateCcw, TrendingUp } from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  Area, 
  AreaChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { GlassTooltip } from "@/components/ui/glass-tooltip";

interface TagTrendData {
  date: string;
  [key: string]: string | number;
}

const AVAILABLE_TAGS = [
  "Bug", "Feature", "Melhoria", "Suporte", "Documentação", 
  "Performance", "Segurança", "UI/UX", "Integração", "Configuração",
  "Banco de Dados", "API", "Mobile", "Web", "Backend"
];

const CHART_COLORS = [
  'hsl(var(--chart-color-1))',
  'hsl(var(--chart-color-2))',
  'hsl(var(--chart-color-3))',
  'hsl(var(--chart-color-4))',
  'hsl(var(--chart-color-5))',
  'hsl(var(--kpi-progress))',
  'hsl(var(--kpi-resolved))',
  'hsl(var(--dashboard-accent))'
];

export default function TagTrendChart() {
  const [timeFilter, setTimeFilter] = useState('90days');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTag, setSearchTag] = useState('');
  const [hiddenTags, setHiddenTags] = useState<Set<string>>(new Set());
  const [trendData, setTrendData] = useState<TagTrendData[]>([]);
  const [aggregationLevel, setAggregationLevel] = useState<'day' | 'week' | 'month'>('day');

  // Mock data generation - replace with actual data fetching
  useEffect(() => {
    generateMockData();
  }, [timeFilter, selectedTags]);

  const generateMockData = () => {
    const days = timeFilter === '7days' ? 7 : 
                 timeFilter === '30days' ? 30 : 
                 timeFilter === '90days' ? 90 : 
                 timeFilter === '6months' ? 180 : 365;
    
    // Auto-aggregation logic
    const newAggregation = days <= 30 ? 'day' : days <= 180 ? 'week' : 'month';
    setAggregationLevel(newAggregation);

    // If no tags selected, use top 5 by volume
    const tagsToShow = selectedTags.length > 0 ? selectedTags : AVAILABLE_TAGS.slice(0, 5);

    const data: TagTrendData[] = [];
    const points = newAggregation === 'day' ? days : 
                   newAggregation === 'week' ? Math.ceil(days / 7) : 
                   Math.ceil(days / 30);

    for (let i = 0; i < points; i++) {
      const date = new Date();
      if (newAggregation === 'day') {
        date.setDate(date.getDate() - (points - 1 - i));
      } else if (newAggregation === 'week') {
        date.setDate(date.getDate() - (points - 1 - i) * 7);
      } else {
        date.setMonth(date.getMonth() - (points - 1 - i));
      }

      const entry: TagTrendData = {
        date: date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: newAggregation === 'day' ? '2-digit' : 'short',
          year: newAggregation === 'month' ? 'numeric' : undefined
        })
      };

      // Generate realistic trend data for each tag
      tagsToShow.forEach(tag => {
        const baseValue = Math.floor(Math.random() * 15) + 5;
        const trend = Math.sin((i / points) * Math.PI * 2) * 3;
        const noise = (Math.random() - 0.5) * 4;
        entry[tag] = Math.max(0, Math.floor(baseValue + trend + noise));
      });

      data.push(entry);
    }

    setTrendData(data);
  };

  const getAggregationLabel = () => {
    switch (aggregationLevel) {
      case 'day': return 'Agregação: por dia';
      case 'week': return 'Agregação: por semana';
      case 'month': return 'Agregação: por mês';
    }
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else if (selectedTags.length < 8) {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const toggleTagVisibility = (tag: string) => {
    setHiddenTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  const handleReset = () => {
    setTimeFilter('90days');
    setSelectedTags([]);
    setHiddenTags(new Set());
    setSearchTag('');
  };

  const handleExportCSV = () => {
    const activeTagsData = selectedTags.length > 0 ? selectedTags : AVAILABLE_TAGS.slice(0, 5);
    const visibleTags = activeTagsData.filter(tag => !hiddenTags.has(tag));
    
    let csvContent = "Data," + visibleTags.join(",") + "\n";
    trendData.forEach(row => {
      const values = [row.date, ...visibleTags.map(tag => row[tag] || 0)];
      csvContent += values.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tendencia-tags-${timeFilter}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredTags = AVAILABLE_TAGS.filter(tag => 
    tag.toLowerCase().includes(searchTag.toLowerCase())
  );

  const activeTagsData = selectedTags.length > 0 ? selectedTags : AVAILABLE_TAGS.slice(0, 5);
  const visibleTags = activeTagsData.filter(tag => !hiddenTags.has(tag));

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="glassmorphism p-4 border border-white/20 dark:border-white/10 rounded-xl shadow-xl">
        <p className="text-sm font-medium text-foreground/90 mb-2 border-b border-white/10 pb-2">
          {label}
        </p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const prevIndex = trendData.findIndex(d => d.date === label) - 1;
            const prevValue = prevIndex >= 0 ? Number(trendData[prevIndex]?.[entry.dataKey]) || 0 : 0;
            const currentValue = Number(entry.value);
            const change = currentValue - prevValue;
            const changePercent = prevValue > 0 ? ((change / prevValue) * 100).toFixed(1) : '0.0';
            
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-foreground/80 font-medium">
                  {entry.dataKey}:
                </span>
                <span className="text-foreground font-semibold">
                  {currentValue}
                </span>
                {change !== 0 && (
                  <span className={`text-xs ${change > 0 ? 'text-kpi-resolved' : 'text-kpi-overdue'}`}>
                    ({change > 0 ? '↑' : '↓'} {Math.abs(change)} / {changePercent}%)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-2xl backdrop-blur-md bg-background/60 border border-white/20 dark:border-white/10 shadow-2xl">
      {/* Glassmorphism gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5 pointer-events-none" />
      
      <div className="relative">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm border border-primary/30">
                  <TrendingUp className="w-6 h-6 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-foreground">Tendência por Tag</CardTitle>
                  <p className="text-sm text-foreground/60">Volume de tickets por tag ao longo do tempo</p>
                </div>
              </div>
              <p className="text-xs text-foreground/50 mt-2">{getAggregationLabel()}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="90days">Últimos 90 dias</SelectItem>
                  <SelectItem value="6months">Últimos 6 meses</SelectItem>
                  <SelectItem value="12months">Últimos 12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Tag Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Tags ({selectedTags.length || 5}/8)</Label>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tags..."
                  value={searchTag}
                  onChange={(e) => setSearchTag(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
              {filteredTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Chart */}
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  {visibleTags.map((tag, index) => (
                    <linearGradient key={tag} id={`gradient-${tag}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.05}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--foreground))" 
                  fontSize={12}
                  opacity={0.7}
                />
                <YAxis 
                  stroke="hsl(var(--foreground))" 
                  fontSize={12}
                  opacity={0.7}
                />
                <Tooltip content={customTooltip} />
                <Legend 
                  onClick={(e) => toggleTagVisibility(e.dataKey as string)}
                  wrapperStyle={{ cursor: 'pointer' }}
                />
                {visibleTags.map((tag, index) => (
                  <Area
                    key={tag}
                    type="monotone"
                    dataKey={tag}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    fill={`url(#gradient-${tag})`}
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 2 }}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {trendData.length === 0 && (
            <div className="flex items-center justify-center h-40 text-foreground/60">
              <p>Sem registros para o período/tags selecionados</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportCSV}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Resetar Filtros
              </Button>
            </div>
            
            <p className="text-xs text-foreground/50">
              Clique na legenda para mostrar/ocultar séries
            </p>
          </div>
        </CardContent>
      </div>
    </div>
  );
}