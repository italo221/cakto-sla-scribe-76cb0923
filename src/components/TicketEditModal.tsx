import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Upload, X } from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: string;
  titulo: string;
  descricao: string;
  tipo_ticket: string;
  nivel_criticidade: string;
  time_responsavel: string;
  solicitante: string;
  status: string;
  observacoes?: string;
  tags?: string[];
}

interface TicketEditModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TicketEditModal({ ticket, isOpen, onClose, onUpdate }: TicketEditModalProps) {
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo_ticket: '',
    nivel_criticidade: '',
    time_responsavel: '',
    solicitante: '',
    status: '',
    observacoes: '',
    tags: ''
  });

  useEffect(() => {
    if (ticket && isOpen) {
      setFormData({
        titulo: ticket.titulo || '',
        descricao: ticket.descricao || '',
        tipo_ticket: ticket.tipo_ticket || '',
        nivel_criticidade: ticket.nivel_criticidade || '',
        time_responsavel: ticket.time_responsavel || '',
        solicitante: ticket.solicitante || '',
        status: ticket.status || '',
        observacoes: ticket.observacoes || '',
        tags: ticket.tags ? ticket.tags.join(', ') : ''
      });
    }
  }, [ticket, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !canEdit) return;

    setLoading(true);
    try {
      const updateData = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim(),
        tipo_ticket: formData.tipo_ticket,
        nivel_criticidade: formData.nivel_criticidade,
        time_responsavel: formData.time_responsavel,
        solicitante: formData.solicitante.trim(),
        status: formData.status,
        observacoes: formData.observacoes.trim() || null,
        tags: formData.tags.trim() ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('sla_demandas')
        .update(updateData)
        .eq('id', ticket.id);

      if (error) throw error;

      // Log da ação
      await supabase.rpc('log_sla_action', {
        p_sla_id: ticket.id,
        p_acao: 'edicao_ticket',
        p_justificativa: 'Ticket editado pelo usuário',
        p_dados_anteriores: {
          titulo: ticket.titulo,
          descricao: ticket.descricao,
          tipo_ticket: ticket.tipo_ticket,
          nivel_criticidade: ticket.nivel_criticidade
        },
        p_dados_novos: updateData
      });

      toast({
        title: "Ticket atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar ticket",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ticket</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="solicitante">Solicitante</Label>
              <Input
                id="solicitante"
                value={formData.solicitante}
                onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo_ticket">Tipo do Ticket</Label>
              <Select value={formData.tipo_ticket} onValueChange={(value) => setFormData({ ...formData, tipo_ticket: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="suporte">Suporte</SelectItem>
                  <SelectItem value="melhoria">Melhoria</SelectItem>
                  <SelectItem value="solicitacao">Solicitação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nivel_criticidade">Prioridade</Label>
              <Select value={formData.nivel_criticidade} onValueChange={(value) => setFormData({ ...formData, nivel_criticidade: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">P0 - Crítico</SelectItem>
                  <SelectItem value="P1">P1 - Alto</SelectItem>
                  <SelectItem value="P2">P2 - Médio</SelectItem>
                  <SelectItem value="P3">P3 - Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="time_responsavel">Time Responsável</Label>
              <Select value={formData.time_responsavel} onValueChange={(value) => setFormData({ ...formData, time_responsavel: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Compliance">Compliance</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Produto">Produto</SelectItem>
                  <SelectItem value="Suporte">Suporte</SelectItem>
                  <SelectItem value="TI Suporte">TI Suporte</SelectItem>
                  <SelectItem value="Jurídico">Jurídico</SelectItem>
                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="ex: urgent, customer, bug"
            />
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}