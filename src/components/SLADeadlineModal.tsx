import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, Save, X } from 'lucide-react';
import { format, addHours, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSLAEvents, type CreateSLAEventData } from '@/hooks/useSLAPolicies';

interface SLADeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  currentDeadline?: string;
  isOverride?: boolean;
  onUpdate: () => void;
}

export const SLADeadlineModal = ({ 
  isOpen, 
  onClose, 
  ticketId, 
  currentDeadline,
  isOverride = false,
  onUpdate 
}: SLADeadlineModalProps) => {
  const [deadline, setDeadline] = useState(() => {
    if (currentDeadline) {
      const date = new Date(currentDeadline);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    }
    return format(addHours(new Date(), 24), "yyyy-MM-dd'T'HH:mm");
  });
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { createEvent } = useSLAEvents();

  const handleQuickSelect = (hours: number) => {
    const newDate = addHours(new Date(), hours);
    setDeadline(format(newDate, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleQuickSelectDays = (days: number) => {
    const newDate = addDays(new Date(), days);
    setDeadline(format(newDate, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleSave = async () => {
    if (!user || !deadline) return;

    setLoading(true);
    try {
      const deadlineDate = new Date(deadline);
      
      // Atualizar o prazo_interno do ticket
      const { error: updateError } = await supabase
        .from('sla_demandas')
        .update({ prazo_interno: deadlineDate.toISOString() })
        .eq('id', ticketId);

      if (updateError) throw updateError;

      // Registrar evento de SLA
      const eventData: CreateSLAEventData = {
        ticket_id: ticketId,
        action: isOverride ? 'OVERRIDE' : 'SET_CUSTOM',
        old_deadline: currentDeadline || undefined,
        new_deadline: deadlineDate.toISOString(),
        note: note || undefined,
        actor_id: user.id,
      };

      await createEvent(eventData);

      // Registrar no histórico do ticket
      await supabase.rpc('log_sla_action', {
        p_sla_id: ticketId,
        p_acao: isOverride ? 'override_prazo' : 'definir_prazo',
        p_justificativa: note || `Prazo ${isOverride ? 'forçado' : 'definido'} para ${format(deadlineDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
        p_dados_novos: {
          prazo_interno: deadlineDate.toISOString(),
          metodo: isOverride ? 'override' : 'custom',
        }
      });

      toast({
        title: isOverride ? "Prazo forçado" : "Prazo definido",
        description: `Prazo ${isOverride ? 'forçado' : 'definido'} para ${format(deadlineDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao definir prazo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isOverride ? 'Forçar Prazo' : 'Definir Prazo'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Data e Hora */}
          <div className="space-y-2">
            <Label htmlFor="deadline">Data e Hora do Prazo</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            />
          </div>

          {/* Opções Rápidas */}
          <div className="space-y-2">
            <Label>Opções Rápidas</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(4)}
              >
                +4h
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(24)}
              >
                +24h
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelectDays(3)}
              >
                +3d
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelectDays(7)}
              >
                +7d
              </Button>
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="note">
              {isOverride ? 'Justificativa (obrigatório para override)' : 'Motivo/Observação (opcional)'}
            </Label>
            <Textarea
              id="note"
              placeholder={isOverride 
                ? "Explique o motivo do override do prazo..." 
                : "Descreva o motivo para este prazo..."
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          {isOverride && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800">
                <strong>Atenção:</strong> Você está forçando um prazo em um setor com SLA fixo.
                Esta ação será registrada no histórico.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || (isOverride && !note.trim())}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : (isOverride ? 'Forçar Prazo' : 'Definir Prazo')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};