import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeactivateUserModalProps {
  userId: string;
  userName: string;
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeactivateUserModal({ 
  userId, 
  userName, 
  userEmail, 
  isOpen, 
  onClose,
  onSuccess 
}: DeactivateUserModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeactivate = async () => {
    if (confirmText !== 'DESATIVAR') {
      toast.error('Digite "DESATIVAR" para confirmar');
      return;
    }

    if (!reason.trim() || reason.length < 10) {
      toast.error('Motivo deve ter no mínimo 10 caracteres');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('deactivate_user', {
        p_user_id: userId,
        p_reason: reason
      });

      if (error) throw error;

      toast.success(`Usuário ${userName} desativado com sucesso`);
      
      // Log da ação administrativa
      await supabase.rpc('log_admin_activity', {
        p_action: 'USER_DEACTIVATED',
        p_target_user_id: userId,
        p_target_email: userEmail,
        p_details: { reason, nome: userName }
      });

      onSuccess();
      handleClose();
      
    } catch (error: any) {
      console.error('Erro ao desativar usuário:', error);
      toast.error(error.message || 'Erro ao desativar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Desativar usuário
          </DialogTitle>
          <DialogDescription className="space-y-4 pt-4">
            <p className="font-medium text-foreground">
              {userName} ({userEmail})
            </p>

            <p className="text-sm">
              Esta ação irá:
            </p>

            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>Desativar a conta do usuário</li>
              <li>Impedir novos logins</li>
              <li>Manter tickets e comentários existentes</li>
              <li>Permitir reativação futura</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">
              Motivo da desativação (mínimo 10 caracteres)
            </label>
            <Textarea
              placeholder="Explique o motivo da desativação do usuário..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length}/10 caracteres mínimos
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-destructive">
              Digite "DESATIVAR" para confirmar
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="DESATIVAR"
              className="mt-1 font-mono"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeactivate}
            disabled={loading || confirmText !== 'DESATIVAR' || reason.length < 10}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Desativando...
              </>
            ) : (
              'Desativar usuário'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
