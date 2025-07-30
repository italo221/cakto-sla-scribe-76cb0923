import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ui/tag-input";
import { useToast } from "@/hooks/use-toast";
import { useTags } from "@/hooks/useTags";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import FileUploader from "@/components/FileUploader";
import LinkInput from "@/components/LinkInput";
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
  link_referencia?: string;
  anexos?: string;
}

interface TicketEditModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TicketEditModal({ ticket, isOpen, onClose, onUpdate }: TicketEditModalProps) {
  const { user } = useAuth();
  const { canEditTicket, getSetorValidationMessage } = usePermissions();
  const { allTags, addTagToHistory } = useTags();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [anexos, setAnexos] = useState<Array<{id: string, name: string, url: string, type: string, size: number}>>([]);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo_ticket: '',
    nivel_criticidade: '',
    time_responsavel: '',
    solicitante: '',
    status: '',
    observacoes: '',
    link_referencia: ''
  });

  useEffect(() => {
    if (ticket && isOpen) {
      // Função helper para garantir string vazia em vez de null/undefined
      const safeString = (value: any) => value ? String(value).trim() : '';
      
      const newFormData = {
        titulo: safeString(ticket.titulo),
        descricao: safeString(ticket.descricao),
        tipo_ticket: safeString(ticket.tipo_ticket),
        nivel_criticidade: safeString(ticket.nivel_criticidade),
        time_responsavel: safeString(ticket.time_responsavel),
        solicitante: safeString(ticket.solicitante),
        status: safeString(ticket.status),
        observacoes: safeString(ticket.observacoes),
        link_referencia: safeString(ticket.link_referencia)
      };
      
      setFormData(newFormData);
      setSelectedTags(Array.isArray(ticket.tags) ? ticket.tags : []);
      
      // Carregar anexos
      try {
        const anexosData = ticket.anexos ? JSON.parse(ticket.anexos) : [];
        setAnexos(Array.isArray(anexosData) ? anexosData : []);
      } catch {
        setAnexos([]);
      }
    } else if (!ticket) {
      // Reset form quando não há ticket
      setFormData({
        titulo: '',
        descricao: '',
        tipo_ticket: '',
        nivel_criticidade: '',
        time_responsavel: '',
        solicitante: '',
        status: '',
        observacoes: '',
        link_referencia: ''
      });
      setSelectedTags([]);
      setAnexos([]);
    }
  }, [ticket, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar validações de setor
    const setorValidationMessage = getSetorValidationMessage();
    if (setorValidationMessage) {
      toast({
        title: "Acesso negado",
        description: setorValidationMessage,
        variant: "destructive",
      });
      return;
    }
    
    if (!ticket || !canEditTicket(ticket)) return;

    setLoading(true);
    try {
      const updateData = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim(),
        tipo_ticket: formData.tipo_ticket,
        nivel_criticidade: formData.nivel_criticidade,
        time_responsavel: formData.time_responsavel,
        // Não incluir solicitante na atualização - não pode ser alterado
        status: formData.status,
        observacoes: formData.observacoes.trim() || null,
        tags: selectedTags.length > 0 ? selectedTags : null,
        link_referencia: formData.link_referencia.trim() || null,
        anexos: anexos.length > 0 ? JSON.stringify(anexos) : null,
        updated_at: new Date().toISOString()
      };

      // Adicionar novas tags ao histórico
      selectedTags.forEach(tag => addTagToHistory(tag));

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

  if (!ticket || !canEditTicket(ticket)) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ticket</DialogTitle>
          <DialogDescription>
            Edite as informações do ticket abaixo. Os campos obrigatórios estão marcados com *.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
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
                disabled
                className="bg-muted text-muted-foreground"
                title="O solicitante não pode ser alterado"
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
                  <SelectItem value="solicitacao_tarefa">Solicitação/Tarefa</SelectItem>
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
                  <SelectItem value="TI">TI</SelectItem>
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
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Link de referência */}
          <div>
            <Label>Link de referência (opcional)</Label>
            <LinkInput
              value={formData.link_referencia}
              onChange={(value) => setFormData({ ...formData, link_referencia: value })}
              placeholder="https://exemplo.com/pagina-relacionada"
            />
          </div>

          {/* Anexos */}
          <div>
            <Label>Anexos</Label>
            <FileUploader
              files={anexos}
              onFilesChange={setAnexos}
              maxFiles={3}
              maxSizeMB={10}
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <TagInput
              tags={selectedTags}
              onTagsChange={setSelectedTags}
              suggestions={allTags}
              placeholder="Digite uma tag e pressione Enter"
              maxTags={5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Adicione tags para facilitar a organização e busca do ticket
            </p>
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