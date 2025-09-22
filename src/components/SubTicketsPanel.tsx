import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Calendar, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SubTicketCreator } from './SubTicketCreator';

interface SubTicket {
  id: string;
  ticket_number: string;
  titulo: string;
  status: string;
  nivel_criticidade: string;
  tags: string[];
  data_criacao: string;
  sequence_number: number;
  responsavel_interno?: string;
}

interface Ticket {
  id: string;
  titulo: string;
  setor_id: string;
  nivel_criticidade: string;
  time_responsavel: string;
  tipo_ticket: string;
  tags: string[];
  prioridade_operacional: string;
}

interface SubTicketsPanelProps {
  parentTicket: Ticket;
  onSubTicketClick: (ticketId: string) => void;
}

// Cache para sub-tickets
const subTicketsCache = new Map<string, {
  data: SubTicket[];
  timestamp: number;
}>();

const CACHE_DURATION = 30000; // 30 segundos

export function SubTicketsPanel({ parentTicket, onSubTicketClick }: SubTicketsPanelProps) {
  const [subTickets, setSubTickets] = useState<SubTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Memoizar o parentTicket.id para evitar re-execuções
  const parentTicketId = useMemo(() => parentTicket.id, [parentTicket.id]);

  const loadSubTickets = useCallback(async () => {
    // Verificar cache primeiro
    const cached = subTicketsCache.get(parentTicketId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setSubTickets(cached.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Primeira query: buscar subtickets
      const { data: subTicketsData, error: subTicketsError } = await supabase
        .from('subtickets')
        .select('child_ticket_id, sequence_number')
        .eq('parent_ticket_id', parentTicketId)
        .order('sequence_number', { ascending: true });

      if (subTicketsError) throw subTicketsError;

      if (!subTicketsData || subTicketsData.length === 0) {
        const emptyResult: SubTicket[] = [];
        subTicketsCache.set(parentTicketId, {
          data: emptyResult,
          timestamp: Date.now()
        });
        setSubTickets(emptyResult);
        return;
      }

      // Segunda query: buscar dados dos tickets filhos em uma única query
      const childTicketIds = subTicketsData.map(item => item.child_ticket_id);
      
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('sla_demandas')
        .select('id, ticket_number, titulo, status, nivel_criticidade, tags, data_criacao, responsavel_interno')
        .in('id', childTicketIds);

      if (ticketsError) throw ticketsError;

      // Combinar dados de forma otimizada
      const formattedSubTickets: SubTicket[] = subTicketsData
        .map((subTicketItem) => {
          const ticketData = ticketsData?.find(ticket => ticket.id === subTicketItem.child_ticket_id);
          
          if (!ticketData) return null;
          
          return {
            id: ticketData.id,
            ticket_number: ticketData.ticket_number,
            titulo: ticketData.titulo,
            status: ticketData.status,
            nivel_criticidade: ticketData.nivel_criticidade,
            tags: ticketData.tags || [],
            data_criacao: ticketData.data_criacao,
            sequence_number: subTicketItem.sequence_number,
            responsavel_interno: ticketData.responsavel_interno
          };
        })
        .filter(Boolean) as SubTicket[];

      // Atualizar cache
      subTicketsCache.set(parentTicketId, {
        data: formattedSubTickets,
        timestamp: Date.now()
      });

      setSubTickets(formattedSubTickets);
    } catch (error) {
      console.error('Erro ao carregar sub-tickets:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar sub-tickets.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [parentTicketId, toast]);

  useEffect(() => {
    loadSubTickets();
  }, [loadSubTickets]);

  // Função para limpar cache e recarregar
  const handleSubTicketCreated = useCallback(() => {
    subTicketsCache.delete(parentTicketId);
    loadSubTickets();
  }, [parentTicketId, loadSubTickets]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'em_andamento': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'resolvido': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'fechado': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0': return 'bg-red-100 text-red-800 border-red-300';
      case 'P1': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'P2': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'P3': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sub-Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground mt-2">Carregando sub-tickets...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Sub-Tickets</CardTitle>
        <SubTicketCreator 
          parentTicket={parentTicket} 
          onSubTicketCreated={handleSubTicketCreated}
        />
      </CardHeader>
      <CardContent>
        {subTickets.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mt-2">
              Nenhum sub-ticket criado ainda.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {subTickets.map((subTicket) => (
              <div
                key={subTicket.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        #{subTicket.sequence_number.toString().padStart(2, '0')}
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(subTicket.status)}`}>
                        {subTicket.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${getPriorityColor(subTicket.nivel_criticidade)}`}>
                        {subTicket.nivel_criticidade}
                      </Badge>
                    </div>
                    
                    <h4 className="font-medium text-sm leading-tight mb-2 truncate">
                      {subTicket.titulo}
                    </h4>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(subTicket.data_criacao)}
                      </div>
                      {subTicket.responsavel_interno && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {subTicket.responsavel_interno}
                        </div>
                      )}
                    </div>

                    {subTicket.tags && subTicket.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {subTicket.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {subTicket.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{subTicket.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSubTicketClick(subTicket.id)}
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}