import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface ConnectionStatus {
  supabaseConnected: boolean;
  authWorking: boolean;
  databaseAccess: boolean;
  lastCheck: Date;
  error?: string;
}

export function ConnectionDiagnostic() {
  const [status, setStatus] = useState<ConnectionStatus>({
    supabaseConnected: false,
    authWorking: false,
    databaseAccess: false,
    lastCheck: new Date()
  });
  const [testing, setTesting] = useState(false);

  const runDiagnostic = async () => {
    setTesting(true);
    const newStatus: ConnectionStatus = {
      supabaseConnected: false,
      authWorking: false,
      databaseAccess: false,
      lastCheck: new Date()
    };

    try {
      // Teste 1: Conexão básica com timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      const testQuery = supabase.from('sla_demandas').select('count', { count: 'exact' }).limit(1);
      
      await Promise.race([testQuery, timeoutPromise]);
      newStatus.supabaseConnected = true;

      // Teste 2: Acesso ao banco
      const { data, error } = await supabase
        .from('sla_demandas')
        .select('id')
        .limit(1);

      if (!error && data !== null) {
        newStatus.databaseAccess = true;
      }

      // Teste 3: Auth
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        newStatus.authWorking = true;
      }

    } catch (error) {
      newStatus.error = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Diagnostic error:', error);
    } finally {
      setStatus(newStatus);
      setTesting(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const getOverallStatus = () => {
    if (status.supabaseConnected && status.databaseAccess && status.authWorking) {
      return { label: 'Conectado', color: 'success', icon: CheckCircle };
    } else if (status.supabaseConnected && status.databaseAccess) {
      return { label: 'Parcial', color: 'warning', icon: AlertTriangle };
    } else {
      return { label: 'Desconectado', color: 'destructive', icon: WifiOff };
    }
  };

  const overall = getOverallStatus();
  const Icon = overall.icon;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" />
          Diagnóstico de Conexão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status Geral:</span>
          <Badge variant={overall.color === 'success' ? 'default' : overall.color === 'warning' ? 'secondary' : 'destructive'}>
            {overall.label}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Supabase:</span>
            <Badge variant={status.supabaseConnected ? 'default' : 'destructive'}>
              {status.supabaseConnected ? 'OK' : 'Falha'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Base de Dados:</span>
            <Badge variant={status.databaseAccess ? 'default' : 'destructive'}>
              {status.databaseAccess ? 'OK' : 'Falha'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Autenticação:</span>
            <Badge variant={status.authWorking ? 'default' : 'destructive'}>
              {status.authWorking ? 'OK' : 'Falha'}
            </Badge>
          </div>
        </div>

        {status.error && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
            <strong>Erro:</strong> {status.error}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Última verificação:</span>
          <span>{status.lastCheck.toLocaleTimeString()}</span>
        </div>

        <Button 
          onClick={runDiagnostic} 
          disabled={testing}
          className="w-full"
          size="sm"
        >
          {testing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Testar Novamente
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}