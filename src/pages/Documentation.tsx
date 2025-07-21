import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  BarChart3, 
  Settings, 
  Inbox, 
  AlertTriangle, 
  Users, 
  Clock, 
  DollarSign, 
  Star,
  Tag,
  Webhook,
  Zap,
  Search,
  BookOpen,
  FileText,
  Database,
  Shield,
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Documentation = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Código copiado para a área de transferência",
    });
  };

  const sections = [
    { id: "overview", label: "Visão Geral", icon: BookOpen, color: "text-blue-600" },
    { id: "database", label: "Banco de Dados", icon: Database, color: "text-green-600" },
    { id: "sla-creation", label: "Criar SLA", icon: MessageSquare, color: "text-purple-600" },
    { id: "dashboard", label: "Dashboard", icon: BarChart3, color: "text-orange-600" },
    { id: "inbox", label: "Caixa de Entrada", icon: Inbox, color: "text-pink-600" },
    { id: "integrations", label: "Integrações", icon: Settings, color: "text-indigo-600" },
    { id: "permissions", label: "Permissões", icon: Shield, color: "text-red-600" },
    { id: "api", label: "API & Webhook", icon: Webhook, color: "text-teal-600" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />
      
      <div className="container-responsive py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="text-center space-y-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <BookOpen className="h-4 w-4" />
            Documentação Técnica
          </div>
          <h1 className="text-5xl font-bold text-gradient mb-4">
            Sistema SLA
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Guia completo e interativo para utilizar todas as funcionalidades do 
            sistema de gerenciamento de SLA com exemplos práticos e referências rápidas.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar na documentação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 rounded-lg border-2 focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {sections.slice(0, 4).map((section) => (
            <Card 
              key={section.id}
              className="card-elevated hover-lift cursor-pointer transition-all duration-300 hover:shadow-lg"
              onClick={() => setActiveSection(section.id)}
            >
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-primary/10 flex items-center justify-center">
                  <section.icon className={`h-6 w-6 ${section.color}`} />
                </div>
                <h3 className="font-semibold text-sm">{section.label}</h3>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="card-elevated sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Navegação
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="p-4 space-y-2">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 ${
                          activeSection === section.id
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <section.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-medium">{section.label}</span>
                        {activeSection === section.id && (
                          <ArrowRight className="h-4 w-4 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
              <TabsContent value="overview" className="space-y-6 animate-fade-in">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <MessageSquare className="h-6 w-6 text-primary" />
                      Sobre o Sistema SLA
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Sistema inteligente de gerenciamento de Service Level Agreement (SLA) com IA integrada
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="prose max-w-none">
                      <p className="text-base leading-relaxed">
                        O Sistema SLA é uma plataforma completa e moderna para criar, gerenciar e monitorar acordos de nível de serviço. 
                        Utiliza inteligência artificial para classificação automática e oferece dashboards avançados para acompanhamento em tempo real.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          <Zap className="h-5 w-5 text-yellow-500" />
                          Principais Funcionalidades
                        </h4>
                        <div className="space-y-3">
                          {[
                            "Criação de SLA via chat inteligente",
                            "Classificação automática por criticidade",
                            "Sistema de pontuação multidimensional",
                            "Dashboard com métricas em tempo real",
                            "Geração automática de tags com IA",
                            "Sistema de notificações e webhooks"
                          ].map((feature, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          <Settings className="h-5 w-5 text-blue-500" />
                          Tecnologias Utilizadas
                        </h4>
                        <div className="space-y-3">
                          {[
                            { name: "React + TypeScript", desc: "Frontend moderno" },
                            { name: "Supabase", desc: "Backend + Database" },
                            { name: "Inteligência Artificial", desc: "Classificação automática" },
                            { name: "Tailwind CSS", desc: "Design responsivo" },
                            { name: "shadcn/ui", desc: "Componentes elegantes" },
                            { name: "Recharts", desc: "Gráficos interativos" }
                          ].map((tech, index) => (
                            <div key={index} className="p-3 bg-muted/30 rounded-lg">
                              <div className="font-medium text-sm">{tech.name}</div>
                              <div className="text-xs text-muted-foreground">{tech.desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Workflow Card */}
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="text-xl">Fluxo de Trabalho Inteligente</CardTitle>
                    <CardDescription>
                      Processo otimizado do início ao fim para máxima eficiência
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {[
                        {
                          step: "1",
                          title: "Criação",
                          desc: "Chat inteligente para criar SLAs",
                          icon: MessageSquare,
                          color: "bg-blue-500"
                        },
                        {
                          step: "2", 
                          title: "Classificação",
                          desc: "IA classifica criticidade automaticamente",
                          icon: AlertTriangle,
                          color: "bg-orange-500"
                        },
                        {
                          step: "3",
                          title: "Monitoramento", 
                          desc: "Dashboard com métricas em tempo real",
                          icon: BarChart3,
                          color: "bg-green-500"
                        },
                        {
                          step: "4",
                          title: "Integração",
                          desc: "Webhooks e automações",
                          icon: Settings,
                          color: "bg-purple-500"
                        }
                      ].map((flow, index) => (
                        <div key={index} className="text-center space-y-4 relative">
                          <div className={`w-16 h-16 ${flow.color} rounded-full flex items-center justify-center mx-auto shadow-lg`}>
                            <flow.icon className="h-8 w-8 text-white" />
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-gray-200">
                              {flow.step}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">{flow.title}</h4>
                            <p className="text-sm text-muted-foreground mt-2">{flow.desc}</p>
                          </div>
                          {index < 3 && (
                            <ArrowRight className="hidden md:block absolute top-8 -right-3 h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Start Guide */}
                <Card className="card-elevated border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Zap className="h-6 w-6 text-primary" />
                      Início Rápido
                    </CardTitle>
                    <CardDescription>
                      Comece a usar o sistema em poucos minutos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button variant="gradient" size="lg" asChild className="h-auto p-4 flex-col gap-2">
                        <a href="/" className="text-center">
                          <MessageSquare className="h-6 w-6" />
                          <div>
                            <div className="font-semibold">Criar SLA</div>
                            <div className="text-xs opacity-80">Inicie uma nova demanda</div>
                          </div>
                        </a>
                      </Button>
                      <Button variant="outline" size="lg" asChild className="h-auto p-4 flex-col gap-2">
                        <a href="/dashboard" className="text-center">
                          <BarChart3 className="h-6 w-6" />
                          <div>
                            <div className="font-semibold">Ver Dashboard</div>
                            <div className="text-xs text-muted-foreground">Acompanhe métricas</div>
                          </div>
                        </a>
                      </Button>
                      <Button variant="outline" size="lg" asChild className="h-auto p-4 flex-col gap-2">
                        <a href="/inbox" className="text-center">
                          <Inbox className="h-6 w-6" />
                          <div>
                            <div className="font-semibold">Caixa de Entrada</div>
                            <div className="text-xs text-muted-foreground">Gerenciar demandas</div>
                          </div>
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="database" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>🗄️ Documentação do Banco de Dados</CardTitle>
                    <CardDescription>
                      Estrutura completa do banco PostgreSQL do Sistema SLA - Guia para desenvolvedores
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">📋 Visão Geral</h4>
                      <p className="text-sm text-blue-800">
                        O sistema utiliza PostgreSQL com Supabase, incluindo Row Level Security (RLS), 
                        triggers automáticos e funções personalizadas para garantir integridade e segurança dos dados.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabela Principal - SLA Demandas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-700">🟩 sla_demandas</CardTitle>
                    <CardDescription>Tabela principal que armazena todas as demandas de SLA</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead className="bg-green-50">
                          <tr>
                            <th className="border border-gray-300 p-2 text-left">Campo</th>
                            <th className="border border-gray-300 p-2 text-left">Tipo</th>
                            <th className="border border-gray-300 p-2 text-center">Obrigatório</th>
                            <th className="border border-gray-300 p-2 text-left">Descrição</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td className="border border-gray-300 p-2 font-mono">id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Identificador único (gerado automaticamente)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">ticket_number</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">🔄</td><td className="border border-gray-300 p-2">Número do ticket (auto: TICKET-YYYY-NNNN)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">titulo</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Título curto da demanda</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">descricao</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Descrição detalhada da solicitação</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">time_responsavel</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Nome do setor responsável</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">solicitante</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Quem criou a demanda</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">pontuacao_financeiro</td><td className="border border-gray-300 p-2">integer</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Impacto financeiro (0-10 pontos)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">pontuacao_cliente</td><td className="border border-gray-300 p-2">integer</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Impacto no cliente (0-10 pontos)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">pontuacao_reputacao</td><td className="border border-gray-300 p-2">integer</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Impacto reputacional (0-10 pontos)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">pontuacao_urgencia</td><td className="border border-gray-300 p-2">integer</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Urgência da demanda (0-10 pontos)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">pontuacao_operacional</td><td className="border border-gray-300 p-2">integer</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Impacto operacional (0-10 pontos)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">pontuacao_total</td><td className="border border-gray-300 p-2">integer</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Soma automática de todas as pontuações</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">nivel_criticidade</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">P0 (CRÍTICA), P1 (ALTA), P2 (MÉDIA), P3 (BAIXA)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">observacoes</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">❌</td><td className="border border-gray-300 p-2">Campo livre com contexto extra</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">status</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">aberto, em_andamento, resolvido, fechado</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">tags</td><td className="border border-gray-300 p-2">text[]</td><td className="border border-gray-300 p-2 text-center">❌</td><td className="border border-gray-300 p-2">Array de palavras-chave (geradas por IA)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">setor_id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">❌</td><td className="border border-gray-300 p-2">FK para tabela setores</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">responsavel_interno</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">❌</td><td className="border border-gray-300 p-2">Pessoa responsável dentro do setor</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">prioridade_operacional</td><td className="border border-gray-300 p-2">enum</td><td className="border border-gray-300 p-2 text-center">❌</td><td className="border border-gray-300 p-2">baixa, media, alta, critica</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">prazo_interno</td><td className="border border-gray-300 p-2">timestamptz</td><td className="border border-gray-300 p-2 text-center">❌</td><td className="border border-gray-300 p-2">Prazo interno definido pelo setor</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">arquivos</td><td className="border border-gray-300 p-2">jsonb</td><td className="border border-gray-300 p-2 text-center">❌</td><td className="border border-gray-300 p-2">Metadados de arquivos anexados</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">data_criacao</td><td className="border border-gray-300 p-2">timestamptz</td><td className="border border-gray-300 p-2 text-center">🔄</td><td className="border border-gray-300 p-2">Gerado automaticamente (now())</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">updated_at</td><td className="border border-gray-300 p-2">timestamptz</td><td className="border border-gray-300 p-2 text-center">🔄</td><td className="border border-gray-300 p-2">Atualizado automaticamente por trigger</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabela de Logs de Ação */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-yellow-700">🟨 sla_action_logs</CardTitle>
                    <CardDescription>Histórico detalhado de todas as ações realizadas nos SLAs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead className="bg-yellow-50">
                          <tr>
                            <th className="border border-gray-300 p-2 text-left">Campo</th>
                            <th className="border border-gray-300 p-2 text-left">Tipo</th>
                            <th className="border border-gray-300 p-2 text-center">Obrigatório</th>
                            <th className="border border-gray-300 p-2 text-left">Descrição</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td className="border border-gray-300 p-2 font-mono">id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Identificador único do log</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">sla_id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">FK para sla_demandas</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">acao</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Tipo: criado, resolvido, transferido, fechado</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">autor_id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">ID do usuário que executou a ação</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">autor_email</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">E-mail do autor (para facilitar consultas)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">setor_origem_id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">❌</td><td className="border border-gray-300 p-2">Setor anterior (em transferências)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">setor_destino_id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">❌</td><td className="border border-gray-300 p-2">Novo setor (em transferências)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">justificativa</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">❌</td><td className="border border-gray-300 p-2">Motivo da ação (obrigatório em transferências)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">dados_anteriores</td><td className="border border-gray-300 p-2">jsonb</td><td className="border border-gray-300 p-2 text-center">❌</td><td className="border border-gray-300 p-2">Estado anterior do SLA (para auditoria)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">dados_novos</td><td className="border border-gray-300 p-2">jsonb</td><td className="border border-gray-300 p-2 text-center">❌</td><td className="border border-gray-300 p-2">Estado novo do SLA (para auditoria)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">timestamp</td><td className="border border-gray-300 p-2">timestamptz</td><td className="border border-gray-300 p-2 text-center">🔄</td><td className="border border-gray-300 p-2">Data/hora da ação (now())</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabela de Comentários */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-purple-700">🟣 sla_comentarios_internos</CardTitle>
                    <CardDescription>Comentários e discussões internas sobre os SLAs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead className="bg-purple-50">
                          <tr>
                            <th className="border border-gray-300 p-2 text-left">Campo</th>
                            <th className="border border-gray-300 p-2 text-left">Tipo</th>
                            <th className="border border-gray-300 p-2 text-center">Obrigatório</th>
                            <th className="border border-gray-300 p-2 text-left">Descrição</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td className="border border-gray-300 p-2 font-mono">id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Identificador único</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">sla_id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">FK para sla_demandas</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">setor_id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">FK para setores (controle de acesso)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">autor_id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">ID do usuário que comentou</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">autor_nome</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Nome do autor (cache para performance)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">comentario</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Conteúdo do comentário</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">created_at</td><td className="border border-gray-300 p-2">timestamptz</td><td className="border border-gray-300 p-2 text-center">🔄</td><td className="border border-gray-300 p-2">Data/hora do comentário</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabela de Usuários (Profiles) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-700">🟦 profiles</CardTitle>
                    <CardDescription>Perfis de usuários e controle de acesso</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead className="bg-blue-50">
                          <tr>
                            <th className="border border-gray-300 p-2 text-left">Campo</th>
                            <th className="border border-gray-300 p-2 text-left">Tipo</th>
                            <th className="border border-gray-300 p-2 text-center">Obrigatório</th>
                            <th className="border border-gray-300 p-2 text-left">Descrição</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td className="border border-gray-300 p-2 font-mono">id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Identificador único do perfil</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">user_id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">FK para auth.users (Supabase Auth)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">email</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">E-mail do usuário (usado como login)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">nome_completo</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Nome completo do usuário</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">user_type</td><td className="border border-gray-300 p-2">enum</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">administrador_master, colaborador_setor</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">ativo</td><td className="border border-gray-300 p-2">boolean</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Se o usuário está ativo (default: true)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">created_at</td><td className="border border-gray-300 p-2">timestamptz</td><td className="border border-gray-300 p-2 text-center">🔄</td><td className="border border-gray-300 p-2">Data de criação do perfil</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">updated_at</td><td className="border border-gray-300 p-2">timestamptz</td><td className="border border-gray-300 p-2 text-center">🔄</td><td className="border border-gray-300 p-2">Última atualização (trigger)</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabela de Setores */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-orange-700">🟫 setores</CardTitle>
                    <CardDescription>Cadastro de times/departamentos da empresa</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead className="bg-orange-50">
                          <tr>
                            <th className="border border-gray-300 p-2 text-left">Campo</th>
                            <th className="border border-gray-300 p-2 text-left">Tipo</th>
                            <th className="border border-gray-300 p-2 text-center">Obrigatório</th>
                            <th className="border border-gray-300 p-2 text-left">Descrição</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td className="border border-gray-300 p-2 font-mono">id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Identificador único do setor</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">nome</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Nome do setor (único)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">descricao</td><td className="border border-gray-300 p-2">text</td><td className="border border-gray-300 p-2 text-center">❌</td><td className="border border-gray-300 p-2">Descrição do setor</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">ativo</td><td className="border border-gray-300 p-2">boolean</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Se o setor está ativo (default: true)</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">created_at</td><td className="border border-gray-300 p-2">timestamptz</td><td className="border border-gray-300 p-2 text-center">🔄</td><td className="border border-gray-300 p-2">Data de criação</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">updated_at</td><td className="border border-gray-300 p-2">timestamptz</td><td className="border border-gray-300 p-2 text-center">🔄</td><td className="border border-gray-300 p-2">Última atualização (trigger)</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabela de Relacionamento */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-gray-700">⚫ user_setores</CardTitle>
                    <CardDescription>Relacionamento N:N entre usuários e setores (controle de acesso)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border border-gray-300 p-2 text-left">Campo</th>
                            <th className="border border-gray-300 p-2 text-left">Tipo</th>
                            <th className="border border-gray-300 p-2 text-center">Obrigatório</th>
                            <th className="border border-gray-300 p-2 text-left">Descrição</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td className="border border-gray-300 p-2 font-mono">id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">Identificador único</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">user_id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">FK para profiles.user_id</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">setor_id</td><td className="border border-gray-300 p-2">UUID</td><td className="border border-gray-300 p-2 text-center">✅</td><td className="border border-gray-300 p-2">FK para setores.id</td></tr>
                          <tr><td className="border border-gray-300 p-2 font-mono">created_at</td><td className="border border-gray-300 p-2">timestamptz</td><td className="border border-gray-300 p-2 text-center">🔄</td><td className="border border-gray-300 p-2">Data da atribuição</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 p-3 bg-gray-100 rounded">
                      <p className="text-sm"><strong>Constraint:</strong> UNIQUE(user_id, setor_id) - Evita duplicatas</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Triggers e Funções */}
                <Card>
                  <CardHeader>
                    <CardTitle>⚙️ Triggers e Funções Automáticas</CardTitle>
                    <CardDescription>Automatizações implementadas no banco de dados</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="font-semibold">🎟️ Geração de Tickets</h4>
                        <div className="bg-muted p-3 rounded text-sm">
                          <p><strong>Função:</strong> generate_ticket_number()</p>
                          <p><strong>Trigger:</strong> auto_generate_ticket</p>
                          <p><strong>Formato:</strong> TICKET-YYYY-NNNN</p>
                          <p className="text-muted-foreground">Gera automaticamente número do ticket baseado no ano e sequência.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-semibold">📅 Updated At</h4>
                        <div className="bg-muted p-3 rounded text-sm">
                          <p><strong>Função:</strong> update_updated_at_column()</p>
                          <p><strong>Tabelas:</strong> profiles, setores, sla_demandas</p>
                          <p className="text-muted-foreground">Atualiza automaticamente o campo updated_at em cada UPDATE.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-semibold">👤 Perfis de Usuário</h4>
                        <div className="bg-muted p-3 rounded text-sm">
                          <p><strong>Função:</strong> handle_new_user()</p>
                          <p><strong>Trigger:</strong> on_auth_user_created</p>
                          <p className="text-muted-foreground">Cria automaticamente um perfil quando um usuário é registrado no Supabase Auth.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-semibold">📊 Logs de Ação</h4>
                        <div className="bg-muted p-3 rounded text-sm">
                          <p><strong>Função:</strong> log_sla_action()</p>
                          <p><strong>Função:</strong> add_sla_comment()</p>
                          <p className="text-muted-foreground">Funções de conveniência para registrar ações e comentários com segurança.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* RLS e Segurança */}
                <Card>
                  <CardHeader>
                    <CardTitle>🔒 Row Level Security (RLS)</CardTitle>
                    <CardDescription>Políticas de segurança implementadas no banco</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-2">⚠️ Importante</h4>
                      <p className="text-sm text-red-800">
                        Todas as tabelas possuem RLS habilitado. Usuários só podem acessar dados conforme suas permissões.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold">🔑 Funções de Verificação</h4>
                        <ul className="text-sm space-y-1">
                          <li>• <code>is_admin(user_id)</code> - Verifica se é admin</li>
                          <li>• <code>user_has_setor_access(setor_id)</code> - Verifica acesso ao setor</li>
                        </ul>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold">👥 Níveis de Acesso</h4>
                        <ul className="text-sm space-y-1">
                          <li>• <strong>Administrador Master:</strong> Acesso total</li>
                          <li>• <strong>Colaborador Setor:</strong> Apenas setores atribuídos</li>
                          <li>• <strong>Próprios dados:</strong> Perfil pessoal</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Relacionamentos */}
                <Card>
                  <CardHeader>
                    <CardTitle>🔗 Relacionamentos Entre Tabelas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <h4 className="font-semibold">Foreign Keys</h4>
                          <ul className="space-y-1">
                            <li>• sla_demandas.setor_id → setores.id</li>
                            <li>• sla_action_logs.sla_id → sla_demandas.id</li>
                            <li>• sla_comentarios_internos.sla_id → sla_demandas.id</li>
                            <li>• sla_comentarios_internos.setor_id → setores.id</li>
                            <li>• user_setores.user_id → profiles.user_id</li>
                            <li>• user_setores.setor_id → setores.id</li>
                            <li>• profiles.user_id → auth.users.id</li>
                          </ul>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-semibold">Índices Sugeridos</h4>
                          <ul className="space-y-1">
                            <li>• sla_demandas(status, data_criacao)</li>
                            <li>• sla_demandas(setor_id, status)</li>
                            <li>• sla_action_logs(sla_id, timestamp)</li>
                            <li>• sla_comentarios_internos(sla_id)</li>
                            <li>• user_setores(user_id)</li>
                            <li>• profiles(user_id) - UNIQUE</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sla-creation" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Criação de SLA via Chat
                    </CardTitle>
                    <CardDescription>
                      Sistema inteligente para criar SLAs através de conversação natural
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Como Funciona:</h4>
                      <ol className="space-y-2 text-sm">
                        <li>1. <strong>Inicie a conversa:</strong> Descreva sua demanda ou problema</li>
                        <li>2. <strong>Forneça detalhes:</strong> O sistema fará perguntas específicas</li>
                        <li>3. <strong>Classificação automática:</strong> IA determina criticidade e pontuação</li>
                        <li>4. <strong>Confirmação:</strong> Revise e confirme os dados do SLA</li>
                        <li>5. <strong>Geração:</strong> Ticket é criado automaticamente</li>
                      </ol>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-semibold">Sistema de Pontuação:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <strong>Impacto Financeiro (1-10)</strong>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Avalia perdas financeiras diretas ou indiretas
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <strong>Impacto no Cliente (1-10)</strong>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Mede o impacto na experiência do cliente
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <strong>Urgência (1-10)</strong>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Determina a necessidade de resolução rápida
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            <strong>Impacto Reputacional (1-10)</strong>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Avalia riscos à imagem da empresa
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-semibold">Níveis de Criticidade:</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="destructive">CRÍTICA</Badge>
                          <span className="text-sm">Pontuação: 35-40 | Resolução: Imediata</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">ALTA</Badge>
                          <span className="text-sm">Pontuação: 25-34 | Resolução: 4-8 horas</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">MÉDIA</Badge>
                          <span className="text-sm">Pontuação: 15-24 | Resolução: 1-2 dias</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">BAIXA</Badge>
                          <span className="text-sm">Pontuação: 4-14 | Resolução: 3-5 dias</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Sistema de Tags Automáticas
                    </CardTitle>
                    <CardDescription>
                      Inteligência artificial para organização e busca inteligente de SLAs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">🤖 Como Funciona</h4>
                      <p className="text-sm text-blue-800">
                        A IA analisa automaticamente título, descrição e contexto de cada SLA criado, 
                        gerando 3-7 tags relevantes que facilitam busca, organização e análise de padrões.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold">🎯 Para que Serve:</h4>
                        <ul className="space-y-2 text-sm">
                          <li>• <strong>Busca Rápida:</strong> Encontre SLAs relacionados instantaneamente</li>
                          <li>• <strong>Organização:</strong> Agrupa demandas similares automaticamente</li>
                          <li>• <strong>Padrões:</strong> Detecta tendências e problemas recorrentes</li>
                          <li>• <strong>Relatórios:</strong> Análise por categoria e tipo de problema</li>
                          <li>• <strong>Reutilização:</strong> Reaproveite soluções de casos similares</li>
                        </ul>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold">🏷️ Exemplos de Tags:</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium">🖥️ Tecnologia:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">api-rest</Badge>
                              <Badge variant="outline" className="text-xs">banco-dados</Badge>
                              <Badge variant="outline" className="text-xs">servidor</Badge>
                              <Badge variant="outline" className="text-xs">deploy</Badge>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium">💰 Financeiro:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">pagamento</Badge>
                              <Badge variant="outline" className="text-xs">pix</Badge>
                              <Badge variant="outline" className="text-xs">cartao</Badge>
                              <Badge variant="outline" className="text-xs">faturamento</Badge>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium">👥 Suporte:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">usuario-bloqueado</Badge>
                              <Badge variant="outline" className="text-xs">senha</Badge>
                              <Badge variant="outline" className="text-xs">acesso</Badge>
                              <Badge variant="outline" className="text-xs">treinamento</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-semibold">💬 Comandos de Chat para Tags:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm">/tags</code>
                          <p className="text-sm text-muted-foreground">Lista todas as tags disponíveis no sistema</p>
                        </div>
                        <div className="space-y-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm">/tags:palavra</code>
                          <p className="text-sm text-muted-foreground">Busca tags relacionadas a uma palavra específica</p>
                        </div>
                        <div className="space-y-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm">/add-tag:nome</code>
                          <p className="text-sm text-muted-foreground">Adiciona tag manual ao último SLA criado</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-semibold">🔍 Como Usar na Busca:</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-muted rounded">
                          <p className="text-sm font-medium mb-1">Na Caixa de Entrada (/inbox):</p>
                          <ul className="text-sm space-y-1">
                            <li>• Digite qualquer tag no campo de busca</li>
                            <li>• Exemplo: <code className="bg-background px-1 rounded">pagamento</code> → mostra todos SLAs de pagamento</li>
                            <li>• Combine com filtros de status e criticidade</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-semibold">📊 Exemplo Prático de Uso:</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium">📝 SLA Criado:</p>
                            <p className="text-sm italic">"Sistema de vendas fora do ar - erro 500 no checkout"</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">🏷️ Tags Geradas Automaticamente:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="secondary" className="text-xs">sistema-vendas</Badge>
                              <Badge variant="secondary" className="text-xs">erro-500</Badge>
                              <Badge variant="secondary" className="text-xs">checkout</Badge>
                              <Badge variant="secondary" className="text-xs">indisponibilidade</Badge>
                              <Badge variant="secondary" className="text-xs">ecommerce</Badge>
                              <Badge variant="secondary" className="text-xs">infraestrutura</Badge>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium">🎯 Como Usar:</p>
                            <ul className="text-sm space-y-1">
                              <li>• Busque por <code className="bg-background px-1 rounded">erro-500</code> para ver outros casos similares</li>
                              <li>• Use <code className="bg-background px-1 rounded">infraestrutura</code> para relatórios do setor</li>
                              <li>• Reaproveite soluções de SLAs com tag <code className="bg-background px-1 rounded">checkout</code></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">💡 Dica Pro</h4>
                      <p className="text-sm text-green-800">
                        O sistema fica mais inteligente com o uso! Quanto mais SLAs você criar, 
                        mais precisas ficam as tags automáticas para padrões específicos da sua empresa.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dashboard" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Dashboard de Métricas
                    </CardTitle>
                    <CardDescription>
                      Visualização completa de indicadores de performance dos SLAs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold">Métricas Principais:</h4>
                        <ul className="space-y-2 text-sm">
                          <li>• <strong>Total de SLAs:</strong> Quantidade total criada</li>
                          <li>• <strong>SLAs Abertos:</strong> Pendentes de resolução</li>
                          <li>• <strong>SLAs Resolvidos:</strong> Concluídos com sucesso</li>
                          <li>• <strong>Em Progresso:</strong> Sendo trabalhados</li>
                          <li>• <strong>Vencidos:</strong> Que passaram do prazo</li>
                          <li>• <strong>Taxa de Conformidade:</strong> % de SLAs cumpridos no prazo</li>
                          <li>• <strong>Tempo Médio de Resolução:</strong> Por prioridade (P0-P3)</li>
                          <li>• <strong>Distribuição por Criticidade:</strong> Análise de padrões</li>
                        </ul>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-semibold">Visualizações Disponíveis:</h4>
                        <ul className="space-y-2 text-sm">
                          <li>• <strong>Por Criticidade:</strong> Distribuição por níveis P0-P3</li>
                          <li>• <strong>Por Equipe:</strong> Performance das equipes/setores</li>
                          <li>• <strong>Tempo de Resolução:</strong> Métricas por prioridade com indicadores visuais</li>
                          <li>• <strong>Taxa de Resolução:</strong> Indicadores de eficiência</li>
                          <li>• <strong>SLAs Atrasados:</strong> Monitoramento de cumprimento de prazos</li>
                          <li>• <strong>Tendências:</strong> Evolução das métricas ao longo do tempo</li>
                        </ul>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="font-semibold">Período de Análise:</h4>
                      <p className="text-sm text-muted-foreground">
                        Por padrão, o dashboard exibe dados dos últimos 30 dias. 
                        Os dados são atualizados em tempo real conforme novos SLAs são criados ou atualizados.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inbox" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Inbox className="h-5 w-5" />
                      Caixa de Entrada
                    </CardTitle>
                    <CardDescription>
                      Central de gerenciamento de todos os SLAs do sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Funcionalidades:</h4>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Visualização Completa:</strong> Lista todos os SLAs criados</li>
                        <li>• <strong>Filtros por Status:</strong> Aberto, Em Progresso, Resolvido</li>
                        <li>• <strong>Filtros por Criticidade:</strong> Crítica, Alta, Média, Baixa</li>
                        <li>• <strong>Busca por Tags:</strong> Encontre SLAs por palavras-chave</li>
                        <li>• <strong>Ordenação:</strong> Por data, criticidade, status</li>
                        <li>• <strong>Detalhes Expandidos:</strong> Visualização completa de cada SLA</li>
                      </ul>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-semibold">Informações Exibidas:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ul className="space-y-2 text-sm">
                          <li>• Número do ticket</li>
                          <li>• Título e descrição</li>
                          <li>• Nível de criticidade</li>
                          <li>• Status atual</li>
                        </ul>
                        <ul className="space-y-2 text-sm">
                          <li>• Equipe responsável</li>
                          <li>• Solicitante</li>
                          <li>• Tags associadas</li>
                          <li>• Data de criação</li>
                        </ul>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="font-semibold">💬 Sistema de Comentários:</h4>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Cada SLA possui um sistema de discussão interna onde:
                        </p>
                        <ul className="text-sm space-y-1">
                          <li>• A descrição do SLA aparece como comentário inicial</li>
                          <li>• Admins podem comentar em qualquer SLA</li>
                          <li>• Colaboradores comentam apenas em SLAs do seu setor</li>
                          <li>• Suporte a anexos de arquivos</li>
                          <li>• Histórico completo de interações</li>
                        </ul>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="font-semibold">📎 Sistema de Anexos:</h4>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Upload seguro de arquivos com:
                        </p>
                        <ul className="text-sm space-y-1">
                          <li>• Armazenamento no Supabase Storage</li>
                          <li>• Controle de acesso por setor</li>
                          <li>• Metadados preservados (nome, tamanho, tipo)</li>
                          <li>• Download direto dos arquivos</li>
                          <li>• Organização por SLA e comentário</li>
                        </ul>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="font-semibold">⚡ Atualizações em Tempo Real:</h4>
                      <p className="text-sm text-muted-foreground">
                        O sistema atualiza automaticamente quando novos SLAs são criados ou modificados, 
                        garantindo que todos os usuários vejam as informações mais recentes.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Sistema de Permissões e Usuários
                    </CardTitle>
                    <CardDescription>
                      Gestão de acesso, roles e permissões no sistema SLA
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">🔐 Segurança</h4>
                      <p className="text-sm text-blue-800">
                        O sistema utiliza Row Level Security (RLS) do PostgreSQL para garantir que cada usuário 
                        veja apenas os dados aos quais tem permissão de acesso.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold">👤 Tipos de Usuário:</h4>
                        <div className="space-y-3">
                          <div className="p-3 border rounded-lg">
                            <h5 className="font-medium text-red-700 mb-1">🟥 Administrador Master</h5>
                            <ul className="text-sm space-y-1">
                              <li>• Acesso completo a todos os SLAs</li>
                              <li>• Pode comentar em qualquer SLA</li>
                              <li>• Visualiza todos os setores</li>
                              <li>• Pode transferir SLAs entre setores</li>
                              <li>• Acesso a todos os logs de ação</li>
                              <li>• Pode gerenciar usuários e setores</li>
                            </ul>
                          </div>
                          
                          <div className="p-3 border rounded-lg">
                            <h5 className="font-medium text-blue-700 mb-1">🟦 Colaborador de Setor</h5>
                            <ul className="text-sm space-y-1">
                              <li>• Acesso apenas aos SLAs do seu setor</li>
                              <li>• Pode comentar nos SLAs do seu setor</li>
                              <li>• Visualiza apenas seu(s) setor(es)</li>
                              <li>• Pode atualizar status dos SLAs</li>
                              <li>• Vê logs relacionados ao seu setor</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold">🏢 Sistema de Setores:</h4>
                        <div className="space-y-3">
                          <div className="p-3 bg-muted rounded-lg">
                            <h5 className="font-medium mb-2">Estrutura:</h5>
                            <ul className="text-sm space-y-1">
                              <li>• Cada usuário pertence a um ou mais setores</li>
                              <li>• SLAs são associados a setores específicos</li>
                              <li>• Transferências entre setores são rastreadas</li>
                              <li>• Comentários são vinculados ao setor do autor</li>
                            </ul>
                          </div>

                          <div className="p-3 bg-muted rounded-lg">
                            <h5 className="font-medium mb-2">Funcionalidades por Setor:</h5>
                            <ul className="text-sm space-y-1">
                              <li>• Dashboard filtrado por setor</li>
                              <li>• Métricas específicas do setor</li>
                              <li>• Histórico de ações do setor</li>
                              <li>• Relatórios segmentados</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-semibold">🔄 Fluxo de Permissões:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center space-y-2">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <Users className="h-6 w-6 text-green-600" />
                          </div>
                          <h5 className="font-semibold">1. Autenticação</h5>
                          <p className="text-sm text-muted-foreground">
                            Login via email/senha
                          </p>
                        </div>
                        
                        <div className="text-center space-y-2">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                            <Settings className="h-6 w-6 text-blue-600" />
                          </div>
                          <h5 className="font-semibold">2. Verificação</h5>
                          <p className="text-sm text-muted-foreground">
                            RLS verifica tipo de usuário e setores
                          </p>
                        </div>
                        
                        <div className="text-center space-y-2">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                            <MessageSquare className="h-6 w-6 text-purple-600" />
                          </div>
                          <h5 className="font-semibold">3. Filtros</h5>
                          <p className="text-sm text-muted-foreground">
                            Dados filtrados automaticamente
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-semibold">📊 Políticas RLS Implementadas:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h5 className="font-medium">SLA Demandas:</h5>
                          <ul className="text-sm space-y-1">
                            <li>• <strong>Admin:</strong> Vê todos os SLAs</li>
                            <li>• <strong>Colaborador:</strong> Apenas SLAs do seu setor</li>
                            <li>• <strong>Inserção:</strong> Usuários autenticados</li>
                            <li>• <strong>Atualização:</strong> Admin ou setor responsável</li>
                          </ul>
                        </div>

                        <div className="space-y-3">
                          <h5 className="font-medium">Comentários:</h5>
                          <ul className="text-sm space-y-1">
                            <li>• <strong>Visualização:</strong> Admin ou setor do SLA</li>
                            <li>• <strong>Inserção:</strong> Admin ou membro do setor</li>
                            <li>• <strong>Sem edição:</strong> Comentários são imutáveis</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">✅ Boas Práticas de Segurança</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Nunca confie apenas na interface - RLS protege no banco</li>
                        <li>• Logs de ação rastreiam todas as operações</li>
                        <li>• Senhas são hash+salt pelo Supabase Auth</li>
                        <li>• Tokens JWT com expiração automática</li>
                        <li>• API protegida por autenticação obrigatória</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="integrations" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Integrações e Automações
                    </CardTitle>
                    <CardDescription>
                      Configure conexões externas e automações para o sistema SLA
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">APIs e Chaves:</h4>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Perplexity AI:</strong> Para geração inteligente de tags</li>
                        <li>• <strong>Gerenciamento Seguro:</strong> Chaves armazenadas criptografadas</li>
                        <li>• <strong>Status em Tempo Real:</strong> Verificação automática de conectividade</li>
                      </ul>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Integração Zapier:
                      </h4>
                      <ul className="space-y-2 text-sm">
                        <li>• Configure webhooks para disparar automações</li>
                        <li>• Conecte com mais de 5.000 aplicações</li>
                        <li>• Teste de conectividade integrado</li>
                        <li>• Disparos automáticos para eventos de SLA</li>
                      </ul>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Webhook className="h-4 w-4" />
                        Webhooks Customizados:
                      </h4>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>SLA Criado:</strong> Notificação quando novo SLA é criado</li>
                        <li>• <strong>Status Alterado:</strong> Mudanças de status em tempo real</li>
                        <li>• <strong>Tag Adicionada:</strong> Quando novas tags são associadas</li>
                        <li>• <strong>SLA Atualizado:</strong> Qualquer modificação no SLA</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Endpoints da API REST</CardTitle>
                    <CardDescription>
                      Documentação dos endpoints disponíveis para integração
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">🔍 Listar SLAs</h4>
                      <div className="bg-muted p-4 rounded-lg">
                        <div className="space-y-2">
                          <p className="font-mono text-sm">GET /rest/v1/sla_demandas</p>
                          <p className="text-sm text-muted-foreground">
                            Retorna lista de SLAs filtrada automaticamente por RLS
                          </p>
                          <p className="text-xs">
                            <strong>Headers:</strong> Authorization: Bearer {`{token}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">📝 Criar SLA</h4>
                      <div className="bg-muted p-4 rounded-lg">
                        <div className="space-y-2">
                          <p className="font-mono text-sm">POST /rest/v1/sla_demandas</p>
                          <p className="text-sm text-muted-foreground">
                            Cria novo SLA com geração automática de ticket
                          </p>
                          <div className="text-xs space-y-1">
                            <p><strong>Content-Type:</strong> application/json</p>
                            <p><strong>Campos obrigatórios:</strong> titulo, descricao, time_responsavel, solicitante, pontuacao_*</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">🔄 Atualizar Status</h4>
                      <div className="bg-muted p-4 rounded-lg">
                        <div className="space-y-2">
                          <p className="font-mono text-sm">PATCH /rest/v1/sla_demandas?id=eq.{`{uuid}`}</p>
                          <p className="text-sm text-muted-foreground">
                            Atualiza status do SLA (gera log automático)
                          </p>
                          <div className="text-xs space-y-1">
                            <p><strong>Valores aceitos:</strong> aberto, em_andamento, resolvido, fechado</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">💬 Adicionar Comentário</h4>
                      <div className="bg-muted p-4 rounded-lg">
                        <div className="space-y-2">
                          <p className="font-mono text-sm">POST /rest/v1/sla_comentarios_internos</p>
                          <p className="text-sm text-muted-foreground">
                            Adiciona comentário ao SLA (respeitando permissões de setor)
                          </p>
                          <div className="text-xs space-y-1">
                            <p><strong>Campos obrigatórios:</strong> sla_id, setor_id, comentario</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="font-semibold">📊 Rate Limits e Limites</h4>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Requisições por minuto:</strong> 100 para usuários autenticados</li>
                        <li>• <strong>Tamanho máximo de payload:</strong> 1MB</li>
                        <li>• <strong>Timeout de resposta:</strong> 30 segundos</li>
                        <li>• <strong>Autenticação obrigatória:</strong> Todos os endpoints requerem JWT válido</li>
                      </ul>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Importante</h4>
                      <p className="text-sm text-yellow-800">
                        Todos os endpoints respeitam as políticas RLS. Usuários só podem acessar 
                        dados dos setores aos quais pertencem, exceto administradores que têm acesso completo.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="api" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Eventos de Webhook</CardTitle>
                    <CardDescription>
                      Documentação técnica dos payloads enviados pelos webhooks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Evento: SLA Criado</h4>
                      <div className="bg-muted p-4 rounded-lg">
                        <pre className="text-sm overflow-x-auto">
{`{
  "event": "sla_created",
  "timestamp": "2025-01-21T10:30:00Z",
  "data": {
    "id": "uuid",
    "ticket_number": "TICKET-2025-0001",
    "titulo": "Problema na aplicação",
    "nivel_criticidade": "ALTA",
    "status": "aberto",
    "solicitante": "João Silva",
    "time_responsavel": "TI",
    "pontuacao_total": 28,
    "tags": ["infraestrutura", "aplicacao"]
  }
}`}
                        </pre>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Evento: Status Alterado</h4>
                      <div className="bg-muted p-4 rounded-lg">
                        <pre className="text-sm overflow-x-auto">
{`{
  "event": "sla_status_changed",
  "timestamp": "2025-01-21T11:15:00Z",
  "data": {
    "id": "uuid",
    "ticket_number": "TICKET-2025-0001",
    "status_anterior": "aberto",
    "status_atual": "em_progresso",
    "responsavel_mudanca": "Maria Santos"
  }
}`}
                        </pre>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Evento: Tag Adicionada</h4>
                      <div className="bg-muted p-4 rounded-lg">
                        <pre className="text-sm overflow-x-auto">
{`{
  "event": "sla_tag_added",
  "timestamp": "2025-01-21T12:00:00Z",
  "data": {
    "id": "uuid",
    "ticket_number": "TICKET-2025-0001",
    "nova_tag": "urgente",
    "tags_atuais": ["infraestrutura", "aplicacao", "urgente"],
    "adicionada_por": "sistema_ia"
  }
}`}
                        </pre>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="font-semibold">Configuração de Segurança</h4>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>HTTPS Obrigatório:</strong> Todos os webhooks são enviados via HTTPS</li>
                        <li>• <strong>Retry Logic:</strong> 3 tentativas automáticas em caso de falha</li>
                        <li>• <strong>Timeout:</strong> 30 segundos para resposta</li>
                        <li>• <strong>Headers Customizados:</strong> Suporte a autenticação via headers</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Estrutura do Banco de Dados</CardTitle>
                    <CardDescription>
                      Principais tabelas e relacionamentos do sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Tabela: sla_demandas</h4>
                      <div className="bg-muted p-4 rounded-lg text-sm">
                        <ul className="space-y-1">
                          <li>• <strong>id:</strong> UUID único do SLA</li>
                          <li>• <strong>ticket_number:</strong> Número do ticket (formato: TICKET-YYYY-NNNN)</li>
                          <li>• <strong>titulo:</strong> Título do SLA</li>
                          <li>• <strong>descricao:</strong> Descrição detalhada</li>
                          <li>• <strong>nivel_criticidade:</strong> CRÍTICA | ALTA | MÉDIA | BAIXA</li>
                          <li>• <strong>status:</strong> aberto | em_progresso | resolvido</li>
                          <li>• <strong>pontuacao_*:</strong> Pontuações por categoria (1-10)</li>
                          <li>• <strong>pontuacao_total:</strong> Soma das pontuações (4-40)</li>
                          <li>• <strong>tags:</strong> Array de tags automáticas</li>
                          <li>• <strong>data_criacao:</strong> Timestamp de criação</li>
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Tabela: sla_logs</h4>
                      <div className="bg-muted p-4 rounded-lg text-sm">
                        <ul className="space-y-1">
                          <li>• <strong>id:</strong> UUID único do log</li>
                          <li>• <strong>id_demanda:</strong> Referência ao SLA</li>
                          <li>• <strong>tipo_acao:</strong> Tipo de ação executada</li>
                          <li>• <strong>dados_criados:</strong> JSON com dados da ação</li>
                          <li>• <strong>usuario_responsavel:</strong> Quem executou a ação</li>
                          <li>• <strong>timestamp:</strong> Quando foi executada</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
