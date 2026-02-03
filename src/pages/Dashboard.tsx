import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DynamicDashboard from "@/components/DynamicDashboard";
import { SLAPolicyPanel } from "@/components/SLAPolicyPanel";
import { SLAMetrics } from "@/components/SLAMetrics";
import { BarChart3, TrendingUp, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { DashboardAIChat } from "@/components/DashboardAIChat";

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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-[1600px] mx-auto p-6 md:p-8 lg:p-12">
        <div className="space-y-8">
          {/* Header com tipografia Resend */}
          <div className="space-y-2 mb-12">
            <h1 className="text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
              Dashboard
            </h1>
            <p className="text-sm text-gray-400" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
              Visualize métricas e gerencie seu sistema de tickets
            </p>
          </div>

          {/* Tabs minimalistas estilo Resend */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-800 mb-8">
              <TabsList className="bg-transparent border-none p-0 h-auto gap-0">
                <TabsTrigger 
                  value="overview" 
                  className="px-6 py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-gray-300 bg-transparent transition-colors -mb-px"
                  style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Visão geral
                </TabsTrigger>
                <TabsTrigger 
                  value="metrics" 
                  className="px-6 py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-gray-300 bg-transparent transition-colors -mb-px"
                  style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Métricas SLA
                </TabsTrigger>
                <TabsTrigger 
                  value="policies" 
                  className="px-6 py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-gray-300 bg-transparent transition-colors -mb-px"
                  style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Políticas SLA
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-8 mt-0">
              <DynamicDashboard />
            </TabsContent>

            <TabsContent value="metrics" className="space-y-8 mt-0">
              <SLAMetrics setores={setores} />
            </TabsContent>

            <TabsContent value="policies" className="space-y-8 mt-0">
              <SLAPolicyPanel setores={setores} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <DashboardAIChat context={`Tab ativa: ${activeTab}, Total de setores: ${setores.length}`} />
    </div>
  );
};

export default Dashboard;