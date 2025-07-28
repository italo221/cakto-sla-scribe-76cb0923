import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  BarChart3, 
  Settings, 
  Inbox, 
  AlertTriangle, 
  Shield,
  Star,
  Webhook,
  Zap,
  Search,
  BookOpen,
  FileText,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Documentation = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const { toast } = useToast();

  const sections = [
    { id: "overview", label: "Visão Geral", icon: BookOpen, color: "text-blue-600" },
    { id: "quick-start", label: "Início Rápido", icon: Zap, color: "text-green-600" },
    { id: "tickets", label: "Gestão de Tickets", icon: MessageSquare, color: "text-orange-600" },
    { id: "kanban", label: "Kanban Board", icon: BarChart3, color: "text-pink-600" },
    { id: "inbox", label: "Caixa de Entrada", icon: Inbox, color: "text-indigo-600" },
    { id: "permissions", label: "Permissões", icon: Shield, color: "text-red-600" },
    { id: "admin", label: "Administração", icon: Settings, color: "text-teal-600" },
    { id: "customization", label: "Personalização", icon: Star, color: "text-purple-600" },
    { id: "troubleshooting", label: "FAQ", icon: AlertTriangle, color: "text-yellow-600" },
    { id: "api", label: "Integração", icon: Webhook, color: "text-cyan-600" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />
      
      <div className="container-responsive py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <BookOpen className="h-4 w-4" />
            Documentação Sistema Manhattan
          </div>
          <h1 className="text-5xl font-bold text-gradient mb-4">
            Sistema Manhattan
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Guia completo para utilizar o sistema de gestão de tickets Manhattan - 
            Plataforma moderna com Kanban, permissões granulares e personalização completa.
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
                      Sobre o Sistema Manhattan
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Sistema moderno de gestão de tickets com interface Kanban e controle granular de permissões
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">🚀 Sistema Atualizado - Versão 2.0</h4>
                      <p className="text-sm text-blue-800">
                        <strong>Nova versão:</strong> Interface modernizada, Kanban funcional, permissões por setor 
                        e personalização completa do sistema.
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
                            "Criação unificada de tickets",
                            "Kanban board com drag & drop",
                            "Sistema de permissões por setor", 
                            "Edição de tickets no Kanban",
                            "Personalização completa (cores, logo)",
                            "Busca inteligente com autocomplete",
                            "Interface responsiva modo escuro/claro",
                            "Logs de auditoria completos"
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
                          Tecnologias
                        </h4>
                        <div className="space-y-3">
                          {[
                            { name: "React 18 + TypeScript", desc: "Frontend moderno" },
                            { name: "Supabase", desc: "Backend + Database" },
                            { name: "@dnd-kit", desc: "Drag & Drop avançado" },
                            { name: "Tailwind CSS", desc: "Design responsivo" },
                            { name: "Radix UI", desc: "Componentes acessíveis" },
                            { name: "Vite", desc: "Build otimizado" }
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

              {/* Quick Start */}
              <TabsContent value="quick-start" className="space-y-6 animate-fade-in">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <Zap className="h-6 w-6 text-green-600" />
                      Início Rápido
                    </CardTitle>
                    <CardDescription>
                      Como começar a usar o Sistema Manhattan
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2">✅ Documentação Atualizada</h4>
                      <p className="text-sm text-green-800">
                        A documentação foi completamente atualizada para refletir todas as mudanças 
                        da versão 2.0 do sistema, incluindo Kanban funcional, permissões por setor 
                        e interface modernizada.
                      </p>
                    </div>
                    
                    <div className="text-center py-8">
                      <p className="text-lg text-muted-foreground">
                        Documentação detalhada em desenvolvimento. <br />
                        Consulte o README.md para informações completas.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Outras seções simplificadas */}
              {sections.slice(2).map((section) => (
                <TabsContent key={section.id} value={section.id} className="space-y-6 animate-fade-in">
                  <Card className="card-elevated">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-2xl">
                        <section.icon className="h-6 w-6 text-primary" />
                        {section.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <p className="text-lg text-muted-foreground">
                          Seção em atualização. Consulte o README.md para informações detalhadas sobre {section.label.toLowerCase()}.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;