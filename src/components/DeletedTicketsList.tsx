import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw, Loader2, Clock, User, FileText, Trash2, Inbox as InboxIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface DeletedTicketsListProps {
  tickets: DeletedTicket[];
  onRestore: () => void;
}

export default function DeletedTicketsList({ tickets, onRestore }: DeletedTicketsListProps) {
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoringTicket, setRestoringTicket] = useState<DeletedTicket | null>(null);
  const [restoreReason, setRestoreReason] = useState("");
  const [restoring, setRestoring] = useState(false);
  
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();

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
      onRestore();
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

  if (tickets.length === 0) {
    return (
      <Card className="border-dashed bg-card">
        <CardContent className="p-8 text-center">
          <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhum ticket excluído
          </h3>
          <p className="text-muted-foreground">
            Tickets removidos aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {tickets.map((ticket) => (
        <Card 
          key={ticket.id} 
          className="border border-destructive/20 bg-card hover:bg-muted/60 transition-colors"
        >
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-muted-foreground">
                      {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {ticket.status}
                    </Badge>
                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                      <Trash2 className="h-3 w-3" />
                      Excluído
                    </Badge>
                  </div>
                  <p className="font-medium text-foreground">{ticket.titulo}</p>
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
                  <span>Excluído por: {ticket.deleted_by_name || ticket.deleted_by_email || 'Desconhecido'}</span>
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
                  <span className="text-destructive/80">Motivo: {ticket.deletion_reason}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

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
    </>
  );
}
