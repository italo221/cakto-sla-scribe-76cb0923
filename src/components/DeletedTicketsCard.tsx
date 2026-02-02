import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, RotateCcw, Loader2, Clock, User, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DeletedTicket {
  id: string;
  ticket_number: string | null;
  titulo: string;
  deleted_at: string;
  deleted_by_name: string | null;
  deleted_by_email: string | null;
  deletion_reason: string | null;
  deletion_type: string | null;
  status: string;
}

export default function DeletedTicketsCard() {
  const [deletedTickets, setDeletedTickets] = useState<DeletedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  
  // Restore modal state
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoringTicket, setRestoringTicket] = useState<DeletedTicket | null>(null);
  const [restoreReason, setRestoreReason] = useState("");
  const [restoring, setRestoring] = useState(false);
  
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();

  const fetchDeletedTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sla_demandas_deleted')
        .select('id, ticket_number, titulo, deleted_at, deleted_by_name, deleted_by_email, deletion_reason, deletion_type, status')
        .order('deleted_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setDeletedTickets((data || []) as DeletedTicket[]);
    } catch (error: any) {
      console.error('Erro ao carregar tickets excluídos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedTickets();
  }, []);

  const openRestoreModal = (ticket: DeletedTicket) => {
    setRestoringTicket(ticket);
    setRestoreReason("");
    setRestoreModalOpen(true);
  };

  const handleRestore = async () => {
    if (!restoringTicket) return;

    if (!restoreReason.trim() || restoreReason.trim().length < 10) {
      toast({
        title: "Motivo insuficiente",
        description: "O motivo da restauração deve ter no mínimo 10 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setRestoring(true);
    try {
      const { data, error } = await supabase.rpc('restore_ticket', {
        p_ticket_id: restoringTicket.id,
        p_restore_reason: restoreReason.trim(),
      });

      if (error) throw error;
      if (!data) throw new Error('Falha ao restaurar ticket');

      toast({
        title: "Ticket restaurado",
        description: `${restoringTicket.ticket_number || restoringTicket.titulo} foi restaurado com sucesso.`,
      });
      setRestoreModalOpen(false);
      setRestoringTicket(null);
      fetchDeletedTickets();
    } catch (error: any) {
      toast({
        title: "Erro ao restaurar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };

  if (deletedTickets.length === 0 && !loading) {
    return null;
  }

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-destructive/10 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Tickets Excluídos</CardTitle>
                <Badge variant="destructive" className="ml-2">
                  {deletedTickets.length}
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <CardDescription>
              Tickets removidos do sistema (clique para expandir)
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              deletedTickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  className="flex flex-col gap-2 p-4 border border-destructive/20 rounded-lg bg-background"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="font-medium line-clamp-1">{ticket.titulo}</p>
                    </div>
                    
                    {isSuperAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openRestoreModal(ticket)}
                        className="ml-2 shrink-0"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restaurar
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{ticket.deleted_by_name || ticket.deleted_by_email || 'Desconhecido'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(ticket.deleted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  
                  {ticket.deletion_reason && (
                    <div className="flex items-start gap-1 text-xs bg-destructive/10 p-2 rounded">
                      <FileText className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
                      <span className="text-destructive/80">{ticket.deletion_reason}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Restore Modal */}
      <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Restaurar Ticket
            </DialogTitle>
            <DialogDescription>
              Restaurar {restoringTicket?.ticket_number || restoringTicket?.titulo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Informe o motivo da restauração (mínimo 10 caracteres):
              </p>
              <Textarea
                placeholder="Motivo da restauração..."
                value={restoreReason}
                onChange={(e) => setRestoreReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {restoreReason.length}/10 caracteres mínimos
              </p>
            </div>
            
            {restoringTicket?.deletion_reason && (
              <div className="text-sm bg-muted p-3 rounded">
                <p className="font-medium mb-1">Motivo da exclusão original:</p>
                <p className="text-muted-foreground">{restoringTicket.deletion_reason}</p>
              </div>
            )}
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRestoreModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleRestore} 
                disabled={restoring || restoreReason.trim().length < 10}
              >
                {restoring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar Restauração
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
