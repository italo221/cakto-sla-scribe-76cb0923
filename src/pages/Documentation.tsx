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
    { id: "quick-start", label: "Início Rápido", icon: Zap, color: "text-green-600" },
    { id: "database", label: "Banco de Dados", icon: Database, color: "text-purple-600" },
    { id: "sla-creation", label: "Criar SLA", icon: MessageSquare, color: "text-orange-600" },
    { id: "dashboard", label: "Dashboard", icon: BarChart3, color: "text-pink-600" },
    { id: "inbox", label: "Caixa de Entrada", icon: Inbox, color: "text-indigo-600" },
    { id: "integrations", label: "Integrações", icon: Settings, color: "text-teal-600" },
    { id: "permissions", label: "Sistema Aberto", icon: Shield, color: "text-red-600" },
    { id: "troubleshooting", label: "FAQ & Troubleshooting", icon: AlertTriangle, color: "text-yellow-600" },
    { id: "api", label: "API & Webhook", icon: Webhook, color: "text-cyan-600" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />
      
      <div className="container-responsive py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="text-center space-y-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <BookOpen className="h-4 w-4" />
            Documentação Técnica Completa
          </div>
          <h1 className="text-5xl font-bold text-gradient mb-4">
            Sistema SLA
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Guia completo e atualizado para utilizar todas as funcionalidades do 
            sistema de gerenciamento de SLA - Agora com acesso totalmente aberto!
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {sections.slice(0, 5).map((section) => (
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
              {/* Visão Geral */}
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
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2">🚀 Sistema Totalmente Aberto</h4>
                      <p className="text-sm text-green-800">
                        <strong>Novidade:</strong> Este sistema foi configurado para acesso público completo. 
                        Qualquer pessoa pode entrar diretamente como Super Administrador sem necessidade de login!
                      </p>
                    </div>
                    
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
                            "Acesso público sem necessidade de login",
                            "Criação de SLA via chat inteligente",
                            "Classificação automática por criticidade",
                            "Sistema de pontuação multidimensional",
                            "Dashboard com métricas em tempo real",
                            "Geração automática de tags com IA",
                            "Sistema de comentários e anexos",
                            "Integrações via webhooks"
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
              </TabsContent>

              {/* Início Rápido */}
              <TabsContent value="quick-start" className="space-y-6 animate-fade-in">
                <Card className="card-elevated border-green-200 bg-green-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl text-green-800">
                      <Zap className="h-6 w-6" />
                      Guia de Início Rápido
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Tutorial completo para usar o Sistema SLA em 5 minutos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-green-100 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2">🚀 Sistema Aberto - Acesso Imediato!</h4>
                      <p className="text-sm text-green-800">
                        Este sistema foi configurado para <strong>acesso público total</strong>. Qualquer pessoa que acessar 
                        terá privilégios de Super Administrador automaticamente. Não é necessário login!
                      </p>
                    </div>

                    {/* Steps here */}
                    <div className="space-y-6">
                      <div className="border rounded-lg p-4 bg-white shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                          <div className="space-y-2 flex-1">
                            <h4 className="font-semibold text-lg">Criar sua Primeira Demanda SLA</h4>
                            <p className="text-sm text-muted-foreground">
                              Vá para a página inicial (/) e use o chat inteligente
                            </p>
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm">
                                💬 Exemplo: "Sistema de vendas offline - erro 500 no checkout. Perdemos vendas de Black Friday. Crítico!"
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 bg-white shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                          <div className="space-y-2 flex-1">
                            <h4 className="font-semibold text-lg">Acompanhar no Dashboard</h4>
                            <p className="text-sm text-muted-foreground">
                              Navegue para /dashboard e veja as métricas atualizadas em tempo real
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 bg-white shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                          <div className="space-y-2 flex-1">
                            <h4 className="font-semibold text-lg">Gerenciar na Caixa de Entrada</h4>
                            <p className="text-sm text-muted-foreground">
                              Acesse /inbox para ver todos os SLAs, filtrar por status e adicionar comentários
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sistema Aberto */}
              <TabsContent value="permissions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      Sistema Aberto - Acesso Total
                    </CardTitle>
                    <CardDescription>
                      🌐 Este sistema foi configurado para acesso público completo sem necessidade de autenticação
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">🚀 Sistema Totalmente Aberto</h4>
                      <p className="text-sm text-green-800">
                        <strong>Qualquer pessoa</strong> que acessar este sistema terá automaticamente privilégios de 
                        <strong> Super Administrador</strong>. Não há necessidade de login, registro ou autenticação de nenhum tipo.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold">🔓 Acesso Liberado:</h4>
                        <div className="space-y-3">
                          <div className="p-3 border border-green-200 rounded-lg bg-green-50">
                            <h5 className="font-medium text-green-700 mb-1">✅ Todos são Super Admin</h5>
                            <ul className="text-sm space-y-1">
                              <li>• Acesso completo a todos os SLAs</li>
                              <li>• Pode criar, editar e deletar qualquer coisa</li>
                              <li>• Visualiza todos os setores e dados</li>
                              <li>• Pode comentar em qualquer SLA</li>
                              <li>• Acesso total ao painel administrativo</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold">⚡ Vantagens:</h4>
                        <div className="space-y-3">
                          <div className="p-3 bg-muted rounded-lg">
                            <ul className="text-sm space-y-1">
                              <li>• <strong>Acesso Imediato:</strong> Sem cadastros</li>
                              <li>• <strong>Simplicidade:</strong> Apenas acesse e use</li>
                              <li>• <strong>Flexibilidade:</strong> Todos podem fazer tudo</li>
                              <li>• <strong>Velocidade:</strong> Sem barreiras</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* FAQ & Troubleshooting */}
              <TabsContent value="troubleshooting" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      FAQ & Troubleshooting
                    </CardTitle>
                    <CardDescription>
                      Perguntas frequentes e soluções para problemas comuns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* FAQ Section */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold">❓ Perguntas Frequentes</h4>
                      
                      <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                          <h5 className="font-medium text-blue-700 mb-2">P: O sistema não está carregando corretamente</h5>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>R:</strong> Verifique se o Supabase está configurado corretamente:
                          </p>
                          <ul className="text-sm space-y-1 ml-4">
                            <li>• Procure por avisos de configuração no topo da página</li>
                            <li>• Verifique se as URLs do Supabase estão corretas</li>
                            <li>• Confirme se as chaves de API são válidas</li>
                          </ul>
                        </div>

                        <div className="border rounded-lg p-4">
                          <h5 className="font-medium text-blue-700 mb-2">P: Como o sistema aberto funciona?</h5>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>R:</strong> O sistema foi configurado para:
                          </p>
                          <ul className="text-sm space-y-1 ml-4">
                            <li>• Desabilitar autenticação completamente</li>
                            <li>• Simular usuário Super Admin automaticamente</li>
                            <li>• Remover controles de segurança (RLS)</li>
                            <li>• Permitir acesso total a todas funcionalidades</li>
                          </ul>
                        </div>

                        <div className="border rounded-lg p-4">
                          <h5 className="font-medium text-blue-700 mb-2">P: Não consigo criar SLAs via chat</h5>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>R:</strong> Para melhor resultado:
                          </p>
                          <ul className="text-sm space-y-1 ml-4">
                            <li>• Seja específico na descrição</li>
                            <li>• Inclua problema, impacto e urgência</li>
                            <li>• Use frases completas</li>
                            <li>• Exemplo: "Sistema de vendas offline desde 14h, erro 500"</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Outros TabsContents condensados */}
              <TabsContent value="database" className="space-y-6 animate-fade-in">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <Database className="h-6 w-6 text-purple-600" />
                      Documentação do Banco de Dados
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Estrutura completa do banco PostgreSQL do Sistema SLA com Supabase
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    
                    {/* Tabelas Principais */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        📋 Tabelas Principais
                      </h3>
                      
                      {/* Tabela SLA Demandas */}
                      <div className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <h4 className="text-lg font-semibold text-blue-900 mb-3">sla_demandas</h4>
                        <p className="text-sm text-blue-800 mb-4">Tabela principal que armazena todas as demandas SLA</p>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <h5 className="font-medium text-sm mb-3 text-blue-700">Campos Principais:</h5>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between"><span className="font-mono">id</span><Badge variant="secondary">UUID (PK)</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">titulo</span><Badge variant="outline">TEXT</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">descricao</span><Badge variant="outline">TEXT</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">ticket_number</span><Badge variant="outline">TEXT</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">status</span><Badge variant="outline">TEXT</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">nivel_criticidade</span><Badge variant="destructive">P0,P1,P2,P3</Badge></div>
                            </div>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <h5 className="font-medium text-sm mb-3 text-blue-700">Pontuações IA:</h5>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between"><span className="font-mono">pontuacao_financeiro</span><Badge variant="secondary">INT</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">pontuacao_cliente</span><Badge variant="secondary">INT</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">pontuacao_reputacao</span><Badge variant="secondary">INT</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">pontuacao_urgencia</span><Badge variant="secondary">INT</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">pontuacao_operacional</span><Badge variant="secondary">INT</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">pontuacao_total</span><Badge variant="secondary">INT</Badge></div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                          <p className="text-xs text-blue-800">
                            <strong>📊 Algoritmo de Pontuação:</strong> Cada SLA recebe pontuações de 0-10 em 5 dimensões. 
                            A soma determina a criticidade: P0 (40-50), P1 (30-39), P2 (20-29), P3 (0-19)
                          </p>
                        </div>
                      </div>

                      {/* Tabela Profiles */}
                      <div className="border rounded-lg p-6 bg-gradient-to-r from-green-50 to-emerald-50">
                        <h4 className="text-lg font-semibold text-green-900 mb-3">profiles</h4>
                        <p className="text-sm text-green-800 mb-4">Perfis de usuários do sistema</p>
                        
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="space-y-2">
                              <div className="flex justify-between"><span className="font-mono">id</span><Badge variant="secondary">UUID (PK)</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">user_id</span><Badge variant="secondary">UUID (FK)</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">email</span><Badge variant="outline">TEXT</Badge></div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between"><span className="font-mono">nome_completo</span><Badge variant="outline">TEXT</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">user_type</span><Badge variant="outline">ENUM</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">ativo</span><Badge variant="outline">BOOLEAN</Badge></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tabela Setores */}
                      <div className="border rounded-lg p-6 bg-gradient-to-r from-purple-50 to-violet-50">
                        <h4 className="text-lg font-semibold text-purple-900 mb-3">setores</h4>
                        <p className="text-sm text-purple-800 mb-4">Departamentos organizacionais</p>
                        
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="space-y-2">
                              <div className="flex justify-between"><span className="font-mono">id</span><Badge variant="secondary">UUID (PK)</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">nome</span><Badge variant="outline">TEXT</Badge></div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between"><span className="font-mono">descricao</span><Badge variant="outline">TEXT</Badge></div>
                              <div className="flex justify-between"><span className="font-mono">ativo</span><Badge variant="outline">BOOLEAN</Badge></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tabelas de Log e Auditoria */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        📝 Sistema de Logs e Auditoria
                      </h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* SLA Action Logs */}
                        <div className="border rounded-lg p-4 bg-orange-50">
                          <h4 className="font-semibold text-orange-900 mb-2">sla_action_logs</h4>
                          <p className="text-sm text-orange-800 mb-3">Log de ações realizadas nos SLAs</p>
                          <div className="space-y-1 text-xs">
                            <div>• <strong>acao:</strong> Tipo de ação (criado, editado, etc.)</div>
                            <div>• <strong>autor_id/email:</strong> Quem executou</div>
                            <div>• <strong>dados_anteriores/novos:</strong> JSONB com mudanças</div>
                            <div>• <strong>timestamp:</strong> Quando ocorreu</div>
                          </div>
                        </div>

                        {/* SLA Comentários */}
                        <div className="border rounded-lg p-4 bg-teal-50">
                          <h4 className="font-semibold text-teal-900 mb-2">sla_comentarios_internos</h4>
                          <p className="text-sm text-teal-800 mb-3">Comentários e discussões internas</p>
                          <div className="space-y-1 text-xs">
                            <div>• <strong>comentario:</strong> Texto do comentário</div>
                            <div>• <strong>autor_nome:</strong> Nome do autor</div>
                            <div>• <strong>anexos:</strong> JSONB com arquivos</div>
                            <div>• <strong>setor_id:</strong> Setor relacionado</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Funções SQL Importantes */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        ⚙️ Funções SQL Principais
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            generate_ticket_number()
                          </h4>
                          <p className="text-sm text-muted-foreground mb-3">Gera números únicos de ticket no formato TICKET-YYYY-NNNN</p>
                          <div className="bg-muted/30 p-3 rounded-lg">
                            <code className="text-xs">
                              SELECT generate_ticket_number(); -- Retorna: TICKET-2025-0001
                            </code>
                          </div>
                        </div>

                        <div className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            log_sla_action()
                          </h4>
                          <p className="text-sm text-muted-foreground mb-3">Registra automaticamente todas as ações realizadas em SLAs</p>
                          <div className="bg-muted/30 p-3 rounded-lg">
                            <code className="text-xs">
                              SELECT log_sla_action(sla_id, 'criado', dados_json);
                            </code>
                          </div>
                        </div>

                        <div className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            is_admin() / user_has_setor_access()
                          </h4>
                          <p className="text-sm text-muted-foreground mb-3">Funções de controle de acesso (atualmente retornam sempre true)</p>
                          <div className="bg-muted/30 p-3 rounded-lg">
                            <code className="text-xs">
                              SELECT is_admin(); -- Retorna: true (sistema aberto)
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Consultas Úteis */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        🔍 Consultas SQL Úteis
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-2">Ver todos os SLAs com pontuação</h4>
                          <div className="bg-black text-green-400 p-3 rounded-lg text-xs font-mono">
                            <div className="mb-2">-- SLAs ordenados por criticidade e data</div>
                            <div>SELECT titulo, nivel_criticidade, pontuacao_total, data_criacao</div>
                            <div>FROM sla_demandas</div>
                            <div>ORDER BY pontuacao_total DESC, data_criacao DESC;</div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2"
                            onClick={() => copyToClipboard("SELECT titulo, nivel_criticidade, pontuacao_total, data_criacao FROM sla_demandas ORDER BY pontuacao_total DESC, data_criacao DESC;")}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar SQL
                          </Button>
                        </div>

                        <div className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-2">Estatísticas por período</h4>
                          <div className="bg-black text-green-400 p-3 rounded-lg text-xs font-mono">
                            <div className="mb-2">-- Contagem de SLAs por criticidade nos últimos 30 dias</div>
                            <div>SELECT nivel_criticidade, COUNT(*) as total</div>
                            <div>FROM sla_demandas</div>
                            <div>WHERE data_criacao &gt;= NOW() - INTERVAL '30 days'</div>
                            <div>GROUP BY nivel_criticidade</div>
                            <div>ORDER BY total DESC;</div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2"
                            onClick={() => copyToClipboard("SELECT nivel_criticidade, COUNT(*) as total FROM sla_demandas WHERE data_criacao >= NOW() - INTERVAL '30 days' GROUP BY nivel_criticidade ORDER BY total DESC;")}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar SQL
                          </Button>
                        </div>

                        <div className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-2">Log de ações por SLA</h4>
                          <div className="bg-black text-green-400 p-3 rounded-lg text-xs font-mono">
                            <div className="mb-2">-- Histórico completo de um SLA específico</div>
                            <div>SELECT acao, autor_email, timestamp</div>
                            <div>FROM sla_action_logs</div>
                            <div>WHERE sla_id = 'UUID_DO_SLA'</div>
                            <div>ORDER BY timestamp DESC;</div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2"
                            onClick={() => copyToClipboard("SELECT acao, autor_email, timestamp FROM sla_action_logs WHERE sla_id = 'UUID_DO_SLA' ORDER BY timestamp DESC;")}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar SQL
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Configuração Atual */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Configuração Atual - Sistema Aberto</h4>
                      <div className="text-sm text-yellow-800 space-y-2">
                        <p>• <strong>RLS (Row Level Security):</strong> Desabilitado para acesso público total</p>
                        <p>• <strong>Autenticação:</strong> Não requerida - todos são tratados como Super Admin</p>
                        <p>• <strong>Políticas de Segurança:</strong> Todas retornam TRUE para acesso irrestrito</p>
                        <p>• <strong>Auditoria:</strong> Mantida ativa para tracking de mudanças</p>
                      </div>
                    </div>

                    {/* Links Úteis */}
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Supabase Dashboard
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://supabase.com/docs/guides/database" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Docs PostgreSQL
                        </a>
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sla-creation" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>💬 Criação de SLA via Chat</CardTitle>
                    <CardDescription>
                      Como usar o chat inteligente para criar demandas SLA
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Use linguagem natural para descrever problemas. A IA classificará automaticamente por criticidade.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dashboard" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>📊 Dashboard de Métricas</CardTitle>
                    <CardDescription>
                      Visualização completa de indicadores de performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Dashboard em tempo real com métricas de SLAs, incluindo total, status, criticidade e tempos de resolução.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inbox" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>📥 Caixa de Entrada</CardTitle>
                    <CardDescription>
                      Central de gerenciamento de todos os SLAs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Lista completa de SLAs com filtros, busca, comentários e anexos.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="integrations" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>🔗 Integrações</CardTitle>
                    <CardDescription>
                      Configure conexões externas e automações
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Sistema de webhooks para integrar com ferramentas externas como Slack, Teams, etc.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="api" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>🔌 API & Webhooks</CardTitle>
                    <CardDescription>
                      Documentação de APIs e webhooks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">APIs RESTful via Supabase e sistema de webhooks para notificações automáticas.</p>
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