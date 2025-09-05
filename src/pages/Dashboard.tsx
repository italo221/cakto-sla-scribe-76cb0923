import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ModernTicketDashboard from "@/components/ModernTicketDashboard";
import DynamicDashboard from "@/components/DynamicDashboard";
import { SLAPolicyPanel } from "@/components/SLAPolicyPanel";
import { SLAMetrics } from "@/components/SLAMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, Settings, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

interface Setor {
  id: string;
  nome: string;
  descricao?: string;
}

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [setores, setSetores] = useState<Setor[]>([]);
  const { userSetores } = usePermissions();

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Visualize métricas e gerencie seu sistema de tickets
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:w-600">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="metrics" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Métricas SLA
              </TabsTrigger>
              <TabsTrigger value="policies" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Políticas SLA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card className="bg-card">
                <CardContent className="p-6">
                  <DynamicDashboard />
                </CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="metrics" className="space-y-6">
              <SLAMetrics setores={setores} />
            </TabsContent>

            <TabsContent value="policies" className="space-y-6">
              <SLAPolicyPanel setores={setores} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;