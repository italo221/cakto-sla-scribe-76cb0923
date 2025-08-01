import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, RefreshCw, Search } from "lucide-react";
import { auditTickets, type TicketAuditResult } from "@/utils/ticketAuditService";

export default function TicketAuditReport() {
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<TicketAuditResult | null>(null);
  const { toast } = useToast();

  const runAudit = async () => {
    setLoading(true);
    try {
      const result = await auditTickets();
      setAuditResult(result);
      
      if (result.problematic === 0) {
        toast({
          title: "Auditoria concluída",
          description: "Nenhum ticket com problemas foi encontrado!",
        });
      } else {
        toast({
          title: "Auditoria concluída",
          description: `Encontrados ${result.problematic} ticket(s) com problemas.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro na auditoria:', error);
      toast({
        title: "Erro na auditoria",
        description: "Não foi possível executar a auditoria de tickets.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Auditoria de Tickets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <Button 
            onClick={runAudit} 
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Executando auditoria...' : 'Executar Auditoria'}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Verifica todos os tickets em busca de dados incompletos ou ausentes
          </p>
        </div>

        {auditResult && (
          <div className="space-y-4">
            {/* Resumo da auditoria */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{auditResult.total}</div>
                  <div className="text-sm text-muted-foreground">Total de Tickets</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-destructive">{auditResult.problematic}</div>
                  <div className="text-sm text-muted-foreground">Com Problemas</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{auditResult.total - auditResult.problematic}</div>
                  <div className="text-sm text-muted-foreground">Sem Problemas</div>
                </CardContent>
              </Card>
            </div>

            {/* Status geral */}
            {auditResult.problematic === 0 ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Excelente!</strong> Todos os tickets estão com dados completos.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-destructive bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  <strong>Atenção!</strong> {auditResult.problematic} ticket(s) encontrado(s) com dados incompletos.
                </AlertDescription>
              </Alert>
            )}

            {/* Lista de tickets problemáticos */}
            {auditResult.problematic > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Tickets com Problemas</h3>
                
                {auditResult.tickets.map((ticket) => (
                  <Card key={ticket.id} className="border-destructive/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {ticket.titulo || '(Título ausente)'}
                            </span>
                            <Badge variant="destructive" className="text-xs">
                              {ticket.issues.length} problema(s)
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            <p><strong>ID:</strong> {ticket.id}</p>
                            <p><strong>Data:</strong> {new Date(ticket.data_criacao).toLocaleString()}</p>
                            <p><strong>Status:</strong> {ticket.status || '(Status ausente)'}</p>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-destructive">Problemas encontrados:</p>
                            {ticket.issues.map((issue, index) => (
                              <Badge key={index} variant="outline" className="text-xs mr-1">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}