import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, AlertTriangle, CheckCircle, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SLAMetrics {
  total: number;
  abertos: number;
  resolvidos: number;
  emAndamento: number;
  atrasados: number;
  cumprimento: number;
}

interface SLAData {
  id: string;
  titulo: string;
  status: string;
  nivel_criticidade: string;
  time_responsavel: string;
  data_criacao: string;
}

const COLORS = {
  P0: '#dc2626', // red-600
  P1: '#ea580c', // orange-600  
  P2: '#d97706', // yellow-600
  P3: '#16a34a'  // green-600
};

export default function SLADashboard() {
  const { user, isAdmin } = useAuth();
  const [metrics, setMetrics] = useState<SLAMetrics>({
    total: 0,
    abertos: 0,
    resolvidos: 0,
    emAndamento: 0,
    atrasados: 0,
    cumprimento: 0
  });
  const [slaData, setSlaData] = useState<SLAData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSLAMetrics();
    }
  }, [user, isAdmin]);

  const fetchSLAMetrics = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Buscar dados dos últimos 30 dias
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      
      // RLS irá automaticamente filtrar baseado no usuário e seus setores
      const { data, error } = await supabase
        .from('sla_demandas')
        .select(`
          id, 
          titulo, 
          status, 
          nivel_criticidade, 
          time_responsavel, 
          data_criacao,
          setor_id
        `)
        .gte('data_criacao', trintaDiasAtras.toISOString())
        .order('data_criacao', { ascending: false });

      if (error) throw error;

      const slas = data || [];
      setSlaData(slas);

      // Calcular métricas
      const total = slas.length;
      const abertos = slas.filter(sla => sla.status === 'aberto').length;
      const resolvidos = slas.filter(sla => sla.status === 'resolvido' || sla.status === 'fechado').length;
      const emAndamento = slas.filter(sla => sla.status === 'em_andamento').length;
      
      // Calcular atrasos (P0/P1 abertos há mais de 1 dia)
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const atrasados = slas.filter(sla => 
        (sla.nivel_criticidade === 'P0' || sla.nivel_criticidade === 'P1') && 
        sla.status === 'aberto' && 
        new Date(sla.data_criacao) < ontem
      ).length;

      const cumprimento = total > 0 ? (resolvidos / total) * 100 : 0;

      setMetrics({
        total,
        abertos,
        resolvidos,
        emAndamento,
        atrasados,
        cumprimento
      });

    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCriticalityData = () => {
    const criticidadeCount = slaData.reduce((acc, sla) => {
      acc[sla.nivel_criticidade] = (acc[sla.nivel_criticidade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(criticidadeCount).map(([nivel, count]) => ({
      name: nivel,
      value: count,
      color: COLORS[nivel as keyof typeof COLORS]
    }));
  };

  const getTimeData = () => {
    const timeCount = slaData.reduce((acc, sla) => {
      acc[sla.time_responsavel] = (acc[sla.time_responsavel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(timeCount)
      .map(([time, count]) => ({ name: time, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard SLA</h1>
          <p className="text-muted-foreground">Acompanhe as métricas e desempenho dos SLAs</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Calendar className="w-4 h-4 mr-1" />
          Últimos 30 dias
        </Badge>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total SLAs</p>
                <p className="text-2xl font-bold">{metrics.total}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolvidos</p>
                <p className="text-2xl font-bold text-green-600">{metrics.resolvidos}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Em Aberto</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.abertos + metrics.emAndamento}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Atrasados</p>
                <p className="text-2xl font-bold text-red-600">{metrics.atrasados}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumprimento de SLA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cumprimento de SLA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {metrics.cumprimento.toFixed(1)}%
            </div>
            <p className="text-muted-foreground">
              {metrics.resolvidos} de {metrics.total} SLAs resolvidos
            </p>
            <div className="w-full bg-muted rounded-full h-2 mt-4">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics.cumprimento}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos Simples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SLAs por Criticidade */}
        <Card>
          <CardHeader>
            <CardTitle>SLAs por Criticidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getCriticalityData().map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <Badge variant="secondary">{item.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SLAs por Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              SLAs por Time (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getTimeData().map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <Badge variant="outline">{item.value} SLAs</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}