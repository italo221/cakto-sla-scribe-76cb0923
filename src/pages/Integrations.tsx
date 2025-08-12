import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Key, 
  Webhook, 
  Zap, 
  Bot, 
  ExternalLink, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Copy,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";


interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  icon: any;
  category: string;
  lastSync?: string;
}

export default function Integrations() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("apis");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [zapierUrl, setZapierUrl] = useState("");

  const integrations: Integration[] = [
    {
      id: "perplexity",
      name: "Perplexity AI",
      description: "Geração automática de tags inteligentes para SLAs",
      status: "connected", // Verificar se PERPLEXITY_API_KEY existe
      icon: Bot,
      category: "ai",
      lastSync: "2 minutos atrás"
    },
    {
      id: "zapier", 
      name: "Zapier",
      description: "Automação de workflows e notificações",
      status: "disconnected",
      icon: Zap,
      category: "automation"
    },
    {
      id: "webhooks",
      name: "Webhooks",
      description: "Notificações em tempo real para sistemas externos",
      status: "disconnected", 
      icon: Webhook,
      category: "api"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected': return <Badge className="bg-green-100 text-green-800">Conectado</Badge>;
      case 'error': return <Badge variant="destructive">Erro</Badge>;
      default: return <Badge variant="secondary">Desconectado</Badge>;
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      toast({
        title: "Erro",
        description: "Insira uma URL de webhook válida",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          event: "test",
          timestamp: new Date().toISOString(),
          data: {
            sla_id: "test-123",
            titulo: "Teste de Webhook",
            status: "aberto",
            criticidade: "P1"
          }
        }),
      });

      toast({
        title: "Webhook Enviado",
        description: "Teste de webhook enviado com sucesso. Verifique seu endpoint.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao enviar webhook de teste",
        variant: "destructive",
      });
    }
  };

  const handleTestZapier = async () => {
    if (!zapierUrl) {
      toast({
        title: "Erro", 
        description: "Insira uma URL do Zapier válida",
        variant: "destructive",
      });
      return;
    }

    try {
      await fetch(zapierUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          triggered_from: "SLA System",
          test_data: {
            sla_id: "test-456",
            titulo: "Nova demanda de teste",
            criticidade: "P0",
            time_responsavel: "Tecnologia"
          }
        }),
      });

      toast({
        title: "Zapier Acionado",
        description: "Teste enviado para o Zapier. Verifique o histórico do seu Zap.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao acionar o Zapier",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Integrações
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure conexões com serviços externos e automações
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <TabsTrigger value="apis" className={isMobile ? 'text-xs' : ''}>APIs & Chaves</TabsTrigger>
            <TabsTrigger value="automation" className={isMobile ? 'text-xs' : ''}>Automação</TabsTrigger>
            {!isMobile && <TabsTrigger value="webhooks">Webhooks</TabsTrigger>}
            {!isMobile && <TabsTrigger value="overview">Visão Geral</TabsTrigger>}
          </TabsList>
          
          {/* Mobile secondary tabs */}
          {isMobile && (
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="webhooks" className="text-xs">Webhooks</TabsTrigger>
              <TabsTrigger value="overview" className="text-xs">Visão Geral</TabsTrigger>
            </TabsList>
          )}

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id} className="p-4 sm:p-6">
                  <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center justify-between'}`}>
                    <div className={`flex items-center gap-4 ${isMobile ? 'w-full' : ''}`}>
                      <div className="p-2 rounded-lg bg-muted">
                        <integration.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{integration.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {integration.description}
                        </p>
                        {integration.lastSync && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Última sincronização: {integration.lastSync}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 ${isMobile ? 'w-full justify-start' : ''}`}>
                      {getStatusIcon(integration.status)}
                      {getStatusBadge(integration.status)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* APIs & Chaves */}
          <TabsContent value="apis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Chaves de API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Perplexity AI */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Perplexity AI</h3>
                      <p className="text-sm text-muted-foreground">
                        Para geração automática de tags inteligentes
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <Badge className="bg-green-100 text-green-800">Configurado</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Chave configurada via Supabase Secrets. Sistema funcionando normalmente.
                  </div>
                </div>

                <Separator />

                {/* Configuração de outras APIs */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Outras Integrações</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure chaves de API adicionais conforme necessário para expandir 
                    as funcionalidades do sistema.
                  </p>
                  <Button variant="outline" className="w-full">
                    <Key className="h-4 w-4 mr-2" />
                    Adicionar Nova API
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automação */}
          <TabsContent value="automation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Zapier Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure webhooks do Zapier para automatizar notificações e workflows 
                  quando SLAs são criados ou atualizados.
                </p>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium">URL do Webhook Zapier</label>
                  <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                    <Input
                      placeholder="https://hooks.zapier.com/hooks/catch/..."
                      value={zapierUrl}
                      onChange={(e) => setZapierUrl(e.target.value)}
                      className={isMobile ? 'w-full' : ''}
                    />
                    <Button onClick={handleTestZapier} variant="outline" className={isMobile ? 'w-full' : ''}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Testar
                    </Button>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium">Como configurar:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Crie um novo Zap no Zapier</li>
                    <li>Adicione um trigger "Webhooks by Zapier"</li>
                    <li>Escolha "Catch Hook"</li>
                    <li>Copie a URL fornecida pelo Zapier</li>
                    <li>Cole a URL acima e teste a conexão</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Configuração de Webhooks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure endpoints para receber notificações em tempo real sobre 
                  eventos do sistema de SLA.
                </p>

                <div className="space-y-3">
                  <label className="text-sm font-medium">URL do Endpoint</label>
                  <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                    <Input
                      placeholder="https://seu-sistema.com/webhooks/sla"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className={isMobile ? 'w-full' : ''}
                    />
                    <Button onClick={handleTestWebhook} variant="outline" className={isMobile ? 'w-full' : ''}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Testar
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Eventos Disponíveis</h4>
                  <div className="space-y-2">
                    {[
                      { event: "sla.created", description: "Quando um novo SLA é criado" },
                      { event: "sla.updated", description: "Quando um SLA é atualizado" },
                      { event: "sla.status_changed", description: "Quando o status de um SLA muda" },
                      { event: "tag.added", description: "Quando uma tag é adicionada" }
                    ].map((item) => (
                      <div key={item.event} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {item.event}
                          </code>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </div>
                        <Switch />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Formato do Payload</h4>
                  <pre className="text-xs bg-background p-3 rounded border overflow-auto">
{`{
  "event": "sla.created",
  "timestamp": "2025-01-21T10:30:00Z",
  "data": {
    "id": "uuid",
    "ticket_number": "TICKET-2025-0001",
    "titulo": "Nome da demanda",
    "status": "aberto",
    "nivel_criticidade": "P1",
    "time_responsavel": "Tecnologia",
    "tags": ["tag1", "tag2"]
  }
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}