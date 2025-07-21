import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Zap
} from "lucide-react";

const Documentation = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Documentação do Sistema SLA</h1>
          <p className="text-xl text-muted-foreground">
            Guia completo para utilizar todas as funcionalidades do sistema de gerenciamento de SLA
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="sla-creation">Criar SLA</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="inbox">Caixa de Entrada</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="api">API & Webhook</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Sobre o Sistema SLA
                </CardTitle>
                <CardDescription>
                  Sistema inteligente de gerenciamento de Service Level Agreement (SLA)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  O Sistema SLA é uma plataforma completa para criar, gerenciar e monitorar acordos de nível de serviço. 
                  Utiliza inteligência artificial para classificação automática e oferece dashboards avançados para acompanhamento.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Principais Funcionalidades:</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• Criação de SLA via chat inteligente</li>
                      <li>• Classificação automática por criticidade</li>
                      <li>• Sistema de pontuação multidimensional</li>
                      <li>• Dashboard com métricas em tempo real</li>
                      <li>• Geração automática de tags com IA</li>
                      <li>• Sistema de notificações e webhooks</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Tecnologias Utilizadas:</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• React + TypeScript</li>
                      <li>• Supabase (Backend + Database)</li>
                      <li>• Inteligência Artificial (Perplexity)</li>
                      <li>• Tailwind CSS</li>
                      <li>• shadcn/ui Components</li>
                      <li>• Recharts para gráficos</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fluxo de Trabalho</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold">1. Criação</h4>
                    <p className="text-sm text-muted-foreground">
                      Chat inteligente para criar SLAs
                    </p>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <AlertTriangle className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold">2. Classificação</h4>
                    <p className="text-sm text-muted-foreground">
                      IA classifica criticidade automaticamente
                    </p>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold">3. Monitoramento</h4>
                    <p className="text-sm text-muted-foreground">
                      Dashboard com métricas em tempo real
                    </p>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold">4. Integração</h4>
                    <p className="text-sm text-muted-foreground">
                      Webhooks e automações
                    </p>
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
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  O sistema gera automaticamente tags relevantes para cada SLA usando inteligência artificial.
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">Comandos de Chat para Tags:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <code>/tags</code> - Lista todas as tags disponíveis</li>
                    <li>• <code>/tags:tecnologia</code> - Busca tags relacionadas a "tecnologia"</li>
                    <li>• <code>/add-tag:infraestrutura</code> - Adiciona tag ao último SLA criado</li>
                  </ul>
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
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Gráficos Disponíveis:</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Por Criticidade:</strong> Distribuição por níveis</li>
                      <li>• <strong>Por Equipe:</strong> Performance das equipes</li>
                      <li>• <strong>Histórico Temporal:</strong> Evolução ao longo do tempo</li>
                      <li>• <strong>Taxa de Resolução:</strong> Indicadores de eficiência</li>
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
                  <h4 className="font-semibold">Busca por Tags:</h4>
                  <p className="text-sm text-muted-foreground">
                    Digite palavras-chave no campo de busca para encontrar SLAs relacionados. 
                    O sistema busca tanto nas tags automáticas quanto no conteúdo dos SLAs.
                  </p>
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
  );
};

export default Documentation;