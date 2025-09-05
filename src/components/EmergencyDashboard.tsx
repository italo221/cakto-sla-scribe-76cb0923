import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface BasicTicket {
  id: string;
  ticket_number: string;
  titulo: string;
  status: string;
  nivel_criticidade: string;
  data_criacao: string;
}

export const EmergencyDashboard = () => {
  const [tickets, setTickets] = useState<BasicTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchBasicData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Query super simples - só o essencial
      const { data, error } = await supabase
        .from('sla_demandas')
        .select('id, ticket_number, titulo, status, nivel_criticidade, data_criacao')
        .order('data_criacao', { ascending: false })
        .limit(50);

      if (error) throw error;

      setTickets(data || []);
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      console.error('Erro ao carregar:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBasicData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto': return 'destructive';
      case 'em_andamento': return 'default';
      case 'resolvido': return 'secondary';
      case 'fechado': return 'outline';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aberto': return <AlertCircle className="w-4 h-4" />;
      case 'em_andamento': return <Clock className="w-4 h-4" />;
      case 'resolvido': return <CheckCircle className="w-4 h-4" />;
      case 'fechado': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getCriticalityColor = (nivel: string) => {
    switch (nivel) {
      case 'P0': return 'bg-red-500 text-white';
      case 'P1': return 'bg-orange-500 text-white';
      case 'P2': return 'bg-yellow-500 text-black';
      case 'P3': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Estatísticas básicas
  const stats = {
    total: tickets.length,
    abertos: tickets.filter(t => t.status === 'aberto').length,
    em_andamento: tickets.filter(t => t.status === 'em_andamento').length,
    resolvidos: tickets.filter(t => t.status === 'resolvido').length,
    fechados: tickets.filter(t => t.status === 'fechado').length,
    criticos: tickets.filter(t => t.nivel_criticidade === 'P0').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Carregando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard - Modo Emergência</h1>
          <p className="text-muted-foreground">
            Sistema simplificado para visualização básica
            {lastUpdate && ` • Última atualização: ${lastUpdate}`}
          </p>
        </div>
        <Button onClick={fetchBasicData} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>Erro: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.abertos}</div>
            <p className="text-xs text-muted-foreground">Abertos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.em_andamento}</div>
            <p className="text-xs text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.resolvidos}</div>
            <p className="text-xs text-muted-foreground">Resolvidos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-600">{stats.fechados}</div>
            <p className="text-xs text-muted-foreground">Fechados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-800">{stats.criticos}</div>
            <p className="text-xs text-muted-foreground">Críticos (P0)</p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets Recentes ({tickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum ticket encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div 
                  key={ticket.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-blue-600">
                        {ticket.ticket_number}
                      </span>
                      <Badge 
                        variant={getStatusColor(ticket.status)}
                        className="flex items-center gap-1"
                      >
                        {getStatusIcon(ticket.status)}
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getCriticalityColor(ticket.nivel_criticidade)}`}>
                        {ticket.nivel_criticidade}
                      </span>
                    </div>
                    <h3 className="font-medium truncate">{ticket.titulo}</h3>
                    <p className="text-sm text-muted-foreground">
                      Criado em: {new Date(ticket.data_criacao).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center text-blue-800">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="text-sm">
              <strong>Modo Emergência Ativo:</strong> Funcionalidades limitadas para garantir estabilidade. 
              Sistema funcionando com dados básicos.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};