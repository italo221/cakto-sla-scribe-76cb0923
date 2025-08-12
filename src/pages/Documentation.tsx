import { useState } from "react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

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
  const { systemName } = useSystemSettings();

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
      <div className="container-responsive py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <BookOpen className="h-4 w-4" />
            Documentação Sistema {systemName}
          </div>
          <h1 className="text-5xl font-bold text-gradient mb-4">
            Sistema {systemName}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Guia completo para utilizar o sistema de gestão de tickets {systemName} - 
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
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-success" />
                        1. Configuração Inicial
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <h5 className="font-medium mb-2">🔗 Conectar Supabase</h5>
                          <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>• Criar projeto no Supabase</li>
                            <li>• Obter URL e API Key</li>
                            <li>• Configurar integração</li>
                          </ul>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <h5 className="font-medium mb-2">👤 Primeiro Usuário</h5>
                          <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>• Acessar /auth</li>
                            <li>• Cadastrar Super Admin</li>
                            <li>• Fazer login inicial</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5 text-blue-500" />
                        2. Configurações Básicas
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">1</div>
                          <div>
                            <p className="font-medium">Criar Setores</p>
                            <p className="text-sm text-muted-foreground">Acesse /admin → Setores para criar departamentos</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">2</div>
                          <div>
                            <p className="font-medium">Gerenciar Usuários</p>
                            <p className="text-sm text-muted-foreground">Atribuir usuários aos setores e definir líderes</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">3</div>
                          <div>
                            <p className="font-medium">Personalizar Sistema</p>
                            <p className="text-sm text-muted-foreground">Configurar cores, logo e nome do sistema</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">💡 Dica Importante</h4>
                      <p className="text-sm text-blue-800">
                        <strong>Usuários devem estar atribuídos a um setor</strong> antes de poder criar ou editar tickets. 
                        Configure isto no painel administrativo primeiro.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Gestão de Tickets */}
              <TabsContent value="tickets" className="space-y-6 animate-fade-in">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <MessageSquare className="h-6 w-6 text-orange-600" />
                      Gestão de Tickets
                    </CardTitle>
                    <CardDescription>
                      Como criar, editar e gerenciar tickets no sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">📝 Criação de Tickets</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <h5 className="font-medium text-green-900 mb-2">Campos Obrigatórios</h5>
                          <ul className="text-sm text-green-800 space-y-1">
                            <li>• Título do ticket</li>
                            <li>• Descrição detalhada</li>
                            <li>• Tipo de ticket</li>
                            <li>• Prioridade (P0-P3)</li>
                            <li>• Time responsável</li>
                          </ul>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h5 className="font-medium text-blue-900 mb-2">Tipos de Ticket</h5>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Bug/Problema</li>
                            <li>• Feature/Melhoria</li>
                            <li>• Suporte Técnico</li>
                            <li>• Solicitação</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">🔄 Fluxo de Status</h4>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {['Aberto', 'Em Andamento', 'Resolvido', 'Fechado'].map((status, index) => (
                          <div key={status} className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                              {status}
                            </div>
                            {index < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        ))}
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h5 className="font-medium text-yellow-900 mb-2">⏰ Prazos Automáticos</h5>
                        <p className="text-sm text-yellow-800">
                          P0: 4 horas • P1: 24 horas • P2: 3 dias • P3: 7 dias
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Kanban Board */}
              <TabsContent value="kanban" className="space-y-6 animate-fade-in">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <BarChart3 className="h-6 w-6 text-pink-600" />
                      Kanban Board
                    </CardTitle>
                    <CardDescription>
                      Visualização e organização de tickets em colunas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">🎯 Funcionalidades</h4>
                        <div className="space-y-3">
                          {[
                            "Drag & drop entre colunas",
                            "Edição rápida de tickets",
                            "Visualização por status",
                            "Interface responsiva",
                            "Atualização em tempo real"
                          ].map((feature, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">📋 Colunas</h4>
                        <div className="space-y-2">
                          {[
                            { name: "Aberto", color: "bg-red-100 text-red-800" },
                            { name: "Em Andamento", color: "bg-blue-100 text-blue-800" },
                            { name: "Resolvido", color: "bg-yellow-100 text-yellow-800" },
                            { name: "Fechado", color: "bg-green-100 text-green-800" }
                          ].map((col, index) => (
                            <div key={index} className={`p-2 rounded-lg ${col.color} text-sm font-medium`}>
                              {col.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Permissões */}
              <TabsContent value="permissions" className="space-y-6 animate-fade-in">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <Shield className="h-6 w-6 text-red-600" />
                      Sistema de Permissões
                    </CardTitle>
                    <CardDescription>
                      Controle granular de acesso por perfis e setores
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">👥 Perfis de Usuário</h4>
                        <div className="space-y-3">
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <h5 className="font-medium text-red-900">Super Admin</h5>
                            <p className="text-sm text-red-800">Acesso total ao sistema</p>
                          </div>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <h5 className="font-medium text-blue-900">Líder de Setor</h5>
                            <p className="text-sm text-blue-800">Gerencia tickets do setor</p>
                          </div>
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <h5 className="font-medium text-green-900">Operador</h5>
                            <p className="text-sm text-green-800">Cria e edita próprios tickets</p>
                          </div>
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <h5 className="font-medium text-gray-900">Viewer</h5>
                            <p className="text-sm text-gray-800">Apenas visualização</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">🏢 Setores</h4>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h5 className="font-medium text-blue-900 mb-2">Regra Principal</h5>
                          <p className="text-sm text-blue-800">
                            Usuários devem estar atribuídos a um setor antes de 
                            criar ou editar tickets. Apenas 1 líder por setor é permitido.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Demais seções com conteúdo reduzido */}
              {sections.slice(5).map((section) => (
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
                          Seção em desenvolvimento. Consulte o README.md para informações detalhadas.
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