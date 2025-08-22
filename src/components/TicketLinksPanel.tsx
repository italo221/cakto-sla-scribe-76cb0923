import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link, Plus, X, ExternalLink, Search, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TicketLink {
  id: string;
  target_ticket_id: string;
  created_at: string;
  created_by: string;
  ticket: {
    id: string;
    ticket_number: string;
    titulo: string;
    status: string;
    nivel_criticidade: string;
    data_criacao: string;
  };
}

interface AvailableTicket {
  id: string;
  ticket_number: string;
  titulo: string;
  status: string;
  nivel_criticidade: string;
}

interface TicketLinksPanelProps {
  ticketId: string;
  onTicketOpen?: (ticketId: string) => void;
}

export default function TicketLinksPanel({ ticketId, onTicketOpen }: TicketLinksPanelProps) {
  const [linkedTickets, setLinkedTickets] = useState<TicketLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [availableTickets, setAvailableTickets] = useState<AvailableTicket[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'aberto': { variant: 'destructive' as const, label: 'Aberto' },
      'em_andamento': { variant: 'default' as const, label: 'Em Andamento' },
      'resolvido': { variant: 'secondary' as const, label: 'Resolvido' },
      'fechado': { variant: 'outline' as const, label: 'Fechado' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCriticalityBadge = (level: string) => {
    const criticalityConfig = {
      'P0': { variant: 'destructive' as const, label: 'P0 - Crítico' },
      'P1': { variant: 'destructive' as const, label: 'P1 - Alto' },
      'P2': { variant: 'default' as const, label: 'P2 - Médio' },
      'P3': { variant: 'secondary' as const, label: 'P3 - Baixo' }
    };
    
    const config = criticalityConfig[level as keyof typeof criticalityConfig] || { variant: 'outline' as const, label: level };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const loadLinkedTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ticket_links')
        .select(`
          id,
          target_ticket_id,
          created_at,
          created_by
        `)
        .eq('source_ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar detalhes dos tickets vinculados separadamente
      const ticketIds = (data || []).map(link => link.target_ticket_id);
      let ticketDetails: Record<string, any> = {};
      
      if (ticketIds.length > 0) {
        const { data: tickets } = await supabase
          .from('sla_demandas')
          .select('id, ticket_number, titulo, status, nivel_criticidade, data_criacao')
          .in('id', ticketIds);

        if (tickets) {
          ticketDetails = tickets.reduce((acc, ticket) => {
            acc[ticket.id] = ticket;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Combinar dados dos links com detalhes dos tickets
      const linksWithTickets = (data || []).map(link => ({
        ...link,
        ticket: ticketDetails[link.target_ticket_id]
      })).filter(link => link.ticket); // Filtrar apenas links com tickets válidos

      setLinkedTickets(linksWithTickets);
    } catch (error) {
      console.error('Erro ao carregar tickets vinculados:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar tickets vinculados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTickets = async () => {
    try {
      // Buscar tickets que não estão resolvidos/fechados e não são o próprio ticket
      const { data, error } = await supabase
        .from('sla_demandas')
        .select('id, ticket_number, titulo, status, nivel_criticidade')
        .not('status', 'in', '(resolvido,fechado)')
        .neq('id', ticketId)
        .order('data_criacao', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Filtrar tickets já vinculados
      const linkedIds = linkedTickets.map(link => link.target_ticket_id);
      const available = (data || []).filter(ticket => !linkedIds.includes(ticket.id));
      
      setAvailableTickets(available);
    } catch (error) {
      console.error('Erro ao carregar tickets disponíveis:', error);
    }
  };

  const handleAddLinks = async () => {
    if (!user || selectedTickets.length === 0) return;

    try {
      setSaving(true);
      
      // Criar vínculos para todos os tickets selecionados
      const links = selectedTickets.map(targetId => ({
        source_ticket_id: ticketId,
        target_ticket_id: targetId,
        created_by: user.id
      }));

      const { error } = await supabase
        .from('ticket_links')
        .insert(links);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${selectedTickets.length} ticket(s) vinculado(s) com sucesso`,
      });

      setSelectedTickets([]);
      setShowAddDialog(false);
      loadLinkedTickets();
    } catch (error) {
      console.error('Erro ao vincular tickets:', error);
      toast({
        title: "Erro",
        description: "Falha ao vincular tickets",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('ticket_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Vínculo removido com sucesso",
      });

      loadLinkedTickets();
    } catch (error) {
      console.error('Erro ao remover vínculo:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover vínculo",
        variant: "destructive"
      });
    }
  };

  const filteredTickets = availableTickets.filter(ticket =>
    ticket.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.titulo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadLinkedTickets();
  }, [ticketId]);

  useEffect(() => {
    if (showAddDialog) {
      loadAvailableTickets();
    }
  }, [showAddDialog, linkedTickets]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Tickets Vinculados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Tickets Vinculados
            {linkedTickets.length > 0 && (
              <Badge variant="secondary">{linkedTickets.length}</Badge>
            )}
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                Vincular Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Vincular Tickets</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={searchOpen}
                        className="w-full justify-between"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Buscar tickets...
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar por número ou título..." 
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum ticket encontrado.</CommandEmpty>
                          <CommandGroup>
                            {filteredTickets.map((ticket) => (
                              <CommandItem
                                key={ticket.id}
                                onSelect={() => {
                                  setSelectedTickets(prev => 
                                    prev.includes(ticket.id) 
                                      ? prev.filter(id => id !== ticket.id)
                                      : [...prev, ticket.id]
                                  );
                                }}
                                className="flex items-center gap-2 p-3"
                              >
                                <div className={cn(
                                  "w-4 h-4 border rounded flex items-center justify-center",
                                  selectedTickets.includes(ticket.id) && "bg-primary border-primary"
                                )}>
                                  {selectedTickets.includes(ticket.id) && (
                                    <Check className="h-3 w-3 text-primary-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                      {ticket.ticket_number}
                                    </span>
                                    {getStatusBadge(ticket.status)}
                                    {getCriticalityBadge(ticket.nivel_criticidade)}
                                  </div>
                                  <div className="text-sm truncate">{ticket.titulo}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedTickets.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      Tickets selecionados ({selectedTickets.length}):
                    </div>
                    <div className="space-y-1">
                      {selectedTickets.map(ticketId => {
                        const ticket = availableTickets.find(t => t.id === ticketId);
                        if (!ticket) return null;
                        
                        return (
                          <div key={ticketId} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{ticket.ticket_number}</span>
                              <span className="text-sm truncate">{ticket.titulo}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTickets(prev => prev.filter(id => id !== ticketId))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddLinks} 
                    disabled={selectedTickets.length === 0 || saving}
                  >
                    {saving ? "Salvando..." : `Vincular ${selectedTickets.length} ticket(s)`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {linkedTickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <div className="text-sm">Nenhum ticket vinculado até o momento.</div>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {linkedTickets.map((link, index) => (
                <div key={link.id}>
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          {link.ticket.ticket_number}
                        </span>
                        {getStatusBadge(link.ticket.status)}
                        {getCriticalityBadge(link.ticket.nivel_criticidade)}
                      </div>
                      <div className="font-medium text-sm mb-1 truncate">
                        {link.ticket.titulo}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Criado em {format(new Date(link.ticket.data_criacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTicketOpen?.(link.target_ticket_id)}
                        title="Abrir ticket"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLink(link.id)}
                        title="Remover vínculo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {index < linkedTickets.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}