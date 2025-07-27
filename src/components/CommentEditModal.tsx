import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface Comment {
  id: string;
  comentario: string;
  autor_nome: string;
  autor_id: string;
  created_at: string;
}

interface CommentEditModalProps {
  comment: Comment | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CommentEditModal({ comment, isOpen, onClose, onUpdate }: CommentEditModalProps) {
  const { user, canEdit } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (comment && isOpen) {
      setNewComment(comment.comentario);
    }
  }, [comment, isOpen]);

  const canEditComment = () => {
    if (!user || !comment) return false;
    return canEdit && user.id === comment.autor_id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment || !canEditComment() || !newComment.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sla_comentarios_internos')
        .update({ 
          comentario: newComment.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', comment.id);

      if (error) throw error;

      toast({
        title: "Comentário atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar comentário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canEditComment()) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Comentário</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="comentario">Comentário</Label>
            <Textarea
              id="comentario"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={6}
              required
              placeholder="Digite seu comentário..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !newComment.trim()}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}