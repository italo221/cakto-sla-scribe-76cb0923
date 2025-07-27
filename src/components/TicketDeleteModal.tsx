import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, AlertTriangle } from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: string;
  titulo: string;
  solicitante: string;
}

interface TicketDeleteModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}

export default function TicketDeleteModal({ ticket, isOpen, onClose, onDelete }: TicketDeleteModalProps) {
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!ticket || !isSuperAdmin) return;

    setLoading(true);
    try {
      // Log da ação antes de deletar
      await supabase.rpc('log_sla_action', {
        p_sla_id: ticket.id,
        p_acao: 'exclusao_ticket',
        p_justificativa: 'Ticket excluído pelo administrador',
        p_dados_anteriores: {
          titulo: ticket.titulo,
          solicitante: ticket.solicitante
        }
      });

      // Deletar comentários primeiro (devido às foreign keys)
      await supabase
        .from('sla_comentarios_internos')
        .delete()
        .eq('sla_id', ticket.id);

      // Deletar logs de ação
      await supabase
        .from('sla_action_logs')
        .delete()
        .eq('sla_id', ticket.id);

      // Deletar o ticket
      const { error } = await supabase
        .from('sla_demandas')
        .delete()
        .eq('id', ticket.id);

      if (error) throw error;

      toast({
        title: "Ticket excluído",
        description: "O ticket foi removido permanentemente do sistema.",
      });

      onDelete();
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

  if (!isSuperAdmin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Confirmar Exclusão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">
              Você está prestes a excluir permanentemente o ticket:
            </p>
            <div className="font-medium">
              <p className="text-destructive">{ticket?.ticket_number || `#${ticket?.id.slice(0, 8)}`}</p>
              <p className="text-foreground">{ticket?.titulo}</p>
              <p className="text-sm text-muted-foreground">Solicitante: {ticket?.solicitante}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-medium mb-1">
              ⚠️ Esta ação não pode ser desfeita
            </p>
            <p className="text-xs text-amber-700">
              Todos os comentários, anexos e histórico relacionados a este ticket também serão removidos permanentemente.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir Permanentemente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}