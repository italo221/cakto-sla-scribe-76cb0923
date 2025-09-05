import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, ExternalLink, Database, Copy } from 'lucide-react';
import { getSupabaseConfig } from '@/lib/supabase-config';
import { useToast } from '@/hooks/use-toast';

export default function SupabaseStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const config = getSupabaseConfig();

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch(`${config.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': config.anonKey,
          'Authorization': `Bearer ${config.anonKey}`
        }
      });

      if (response.status === 429) {
        console.error('Supabase rate limit exceeded while checking status');
        setErrorMessage('Limite de recursos do Supabase excedido, tente novamente mais tarde ou contate o administrador');
        setIsConnected(false);
        return;
      }

      setIsConnected(response.ok);
    } catch (error) {
      console.error('Erro ao verificar conexão com o Supabase:', error);
      setIsConnected(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
    });
  };

  if (errorMessage) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {errorMessage}
        </AlertDescription>
      </Alert>
    );
  }

  if (isConnected === true) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          ✅ Supabase conectado e funcionando corretamente!
        </AlertDescription>
      </Alert>
    );
  }

  if (isConnected === false || !config.isConfigured) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ Supabase não configurado. Siga o passo a passo de instalação no README para ativar seu banco.
          </AlertDescription>
        </Alert>

        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Database className="h-5 w-5" />
              Configuração Necessária
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Para usar este sistema, você precisa:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Criar uma conta gratuita no Supabase</li>
                <li>Executar o script SQL de configuração</li>
                <li>Conectar o projeto ao seu banco</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowInstructions(!showInstructions)}
              >
                {showInstructions ? 'Ocultar' : 'Ver'} Instruções Completas
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://supabase.com', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ir para Supabase
              </Button>
            </div>

            {showInstructions && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">1. Criar Projeto Supabase</h4>
                      <p>Acesse <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">supabase.com</a> e crie um novo projeto.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">2. Executar Script SQL</h4>
                      <p>No SQL Editor do Supabase, execute o script completo disponível no README.md</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">3. Obter Credenciais</h4>
                      <p>Em Settings → API, copie:</p>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 text-xs bg-background p-2 rounded border">
                          <code className="flex-1">URL: https://seuprojetoid.supabase.co</code>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard('https://seuprojetoid.supabase.co', 'URL')}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-xs bg-background p-2 rounded border">
                          <code className="flex-1">anon key: eyJ...</code>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard('eyJ...', 'Anon key')}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">4. Conectar ao Lovable</h4>
                      <p>No Lovable, vá em Project Settings → Integrations → Supabase e cole as credenciais.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Alert>
      <Database className="h-4 w-4" />
      <AlertDescription>
        🔄 Verificando conexão com o Supabase...
      </AlertDescription>
    </Alert>
  );
}