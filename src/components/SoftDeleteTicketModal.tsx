import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";

interface Ticket {
  id: string;
  ticket_number?: string | null;
  titulo: string;
  solicitante?: string;
}

interface SoftDeleteTicketModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

const MIN_REASON_LENGTH = 10;

export default function SoftDeleteTicketModal({ 
  ticket, 
  isOpen, 
  onClose, 
  onDeleted 
}: SoftDeleteTicketModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    setReason("");
    onClose();
  };

  const handleDelete = async () => {
    if (!ticket) return;

    const trimmedReason = reason.trim();
    
    if (trimmedReason.length < MIN_REASON_LENGTH) {
      toast({
        title: "Motivo obrigatório",
        description: `O motivo da exclusão deve ter no mínimo ${MIN_REASON_LENGTH} caracteres.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('soft_delete_ticket', {
        p_ticket_id: ticket.id,
        p_reason: trimmedReason,
      });

      if (error) throw error;
      if (!data) throw new Error('Falha ao excluir o ticket. Verifique suas permissões.');

      toast({
        title: "Ticket excluído",
        description: `${ticket.ticket_number || ticket.titulo} foi movido para a lixeira.`,
      });

      setReason("");
      onDeleted();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir ticket",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!ticket) return null;

  const isValidReason = reason.trim().length >= MIN_REASON_LENGTH;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Excluir Ticket
          </DialogTitle>
          <DialogDescription>
            O ticket será movido para a lixeira e poderá ser restaurado por um Super Admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ticket info */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">
              Você está excluindo o ticket:
            </p>
            <div className="font-medium">
              <p className="text-destructive">
                {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
              </p>
              <p className="text-foreground">{ticket.titulo}</p>
              {ticket.solicitante && (
                <p className="text-sm text-muted-foreground">
                  Solicitante: {ticket.solicitante}
                </p>
              )}
            </div>
          </div>

          {/* Reason input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Motivo da exclusão <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Descreva o motivo da exclusão (mínimo 10 caracteres)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={!isValidReason && reason.length > 0 ? "border-destructive" : ""}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={reason.trim().length < MIN_REASON_LENGTH ? "text-destructive" : "text-green-600"}>
                {reason.trim().length}/{MIN_REASON_LENGTH} caracteres mínimos
              </span>
              {!isValidReason && reason.length > 0 && (
                <span className="text-destructive">
                  Faltam {MIN_REASON_LENGTH - reason.trim().length} caracteres
                </span>
              )}
            </div>
          </div>

          {/* Info box */}
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-1">
              ℹ️ Exclusão lógica (Soft Delete)
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              O ticket não será removido permanentemente. Ele ficará visível na seção 
              "Tickets Excluídos" e poderá ser restaurado por um Super Admin se necessário.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={loading || !isValidReason}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Exclusão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
