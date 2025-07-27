import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
  id: string;
  comentario: string;
  autor_nome: string;
  autor_id: string;
  created_at: string;
}

interface CommentDeleteModalProps {
  comment: Comment | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}

export default function CommentDeleteModal({ comment, isOpen, onClose, onDelete }: CommentDeleteModalProps) {
  const { user, canEdit, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const canDeleteComment = () => {
    if (!user || !comment) return false;
    return (canEdit && user.id === comment.autor_id) || isSuperAdmin;
  };

  const handleDelete = async () => {
    if (!comment || !canDeleteComment()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sla_comentarios_internos')
        .delete()
        .eq('id', comment.id);

      if (error) throw error;

      toast({
        title: "Comentário excluído",
        description: "O comentário foi removido permanentemente.",
      });

      onDelete();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir comentário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canDeleteComment()) return null;

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
              Você está prestes a excluir permanentemente este comentário:
            </p>
            <div className="space-y-2">
              <div className="font-medium text-foreground">
                Por: {comment?.autor_nome}
              </div>
              <div className="text-sm text-muted-foreground">
                {comment && format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
              <div className="bg-white/80 border rounded p-3 text-sm max-h-20 overflow-y-auto">
                {comment?.comentario}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800 font-medium mb-1">
              ⚠️ Esta ação não pode ser desfeita
            </p>
            <p className="text-xs text-amber-700">
              O comentário e seus anexos serão removidos permanentemente.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir Comentário
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}