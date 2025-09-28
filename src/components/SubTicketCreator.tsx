import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';

interface Ticket {
  id: string;
  titulo: string;
  setor_id: string;
  nivel_criticidade: string;
  time_responsavel: string;
  tipo_ticket: string;
  tags: string[];
  prioridade_operacional: string;
}

interface SubTicketCreatorProps {
  parentTicket: Ticket;
  onSubTicketCreated: () => void;
}

export function SubTicketCreator({ parentTicket, onSubTicketCreated }: SubTicketCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const handleCreateSubTicket = useCallback(async () => {
    if (!description.trim()) {
      toast({
        title: "Erro",
        description: "A descrição é obrigatória para criar um sub-ticket.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 Iniciando criação de sub-ticket para parent:', parentTicket.id);

      // 1. Verificar autenticação ANTES de tudo
      const { data: currentUser, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser?.user?.id) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      console.log('✅ Usuário autenticado:', currentUser.user.id);

      // 1.5. Buscar nome do usuário para usar como solicitante
      const solicitanteNome = profile?.nome_completo || profile?.email || currentUser.user.email || 'Usuário';
      console.log('✅ Solicitante identificado:', solicitanteNome);

      // 2. Obter próximo número sequencial
      const { data: sequenceData, error: sequenceError } = await supabase
        .rpc('get_next_subticket_sequence', { p_parent_ticket_id: parentTicket.id });

      if (sequenceError) {
        console.error('❌ Erro ao obter sequência:', sequenceError);
        throw sequenceError;
      }

      const sequenceNumber = sequenceData;
      console.log('✅ Número sequencial obtido:', sequenceNumber);

      // 3. Criar título com sufixo
      const subTicketTitle = `${parentTicket.titulo} #${sequenceNumber.toString().padStart(2, '0')}`;
      console.log('✅ Título do sub-ticket:', subTicketTitle);

      // 4. Criar o ticket filho herdando dados do pai
      const { data: newTicket, error: ticketError } = await supabase
        .from('sla_demandas')
        .insert({
          titulo: subTicketTitle,
          descricao: description,
          setor_id: parentTicket.setor_id,
          nivel_criticidade: parentTicket.nivel_criticidade,
          time_responsavel: parentTicket.time_responsavel,
          tipo_ticket: parentTicket.tipo_ticket,
          tags: parentTicket.tags,
          prioridade_operacional: parentTicket.prioridade_operacional as 'alta' | 'media' | 'baixa',
          status: 'aberto',
          solicitante: solicitanteNome,
          // Campos obrigatórios de pontuação
          pontuacao_financeiro: 0,
          pontuacao_cliente: 0,
          pontuacao_reputacao: 0,
          pontuacao_urgencia: 0,
          pontuacao_operacional: 0,
          pontuacao_total: 0
        })
        .select()
        .single();

      if (ticketError) {
        console.error('❌ Erro ao criar ticket:', ticketError);
        throw ticketError;
      }

      console.log('✅ Ticket criado:', newTicket.id, newTicket.ticket_number);

      // 5. Criar vínculo na tabela subtickets
      console.log('🔗 Criando vínculo parent-child:', {
        parent_ticket_id: parentTicket.id,
        child_ticket_id: newTicket.id,
        sequence_number: sequenceNumber,
        created_by: currentUser.user.id
      });

      const { error: linkError } = await supabase
        .from('subtickets')
        .insert({
          parent_ticket_id: parentTicket.id,
          child_ticket_id: newTicket.id,
          sequence_number: sequenceNumber,
          created_by: currentUser.user.id
        });

      if (linkError) {
        console.error('❌ Erro ao criar vínculo:', linkError);
        throw linkError;
      }

      console.log('✅ Vínculo criado com sucesso');

      toast({
        title: "Sub-ticket criado",
        description: `Sub-ticket #${sequenceNumber.toString().padStart(2, '0')} (${newTicket.ticket_number}) criado com sucesso.`,
      });

      setDescription('');
      setIsOpen(false);
      onSubTicketCreated();

    } catch (error: any) {
      console.error('❌ Erro ao criar sub-ticket:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar sub-ticket. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [description, parentTicket, toast, onSubTicketCreated]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Criar Sub-Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Sub-Ticket</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Ticket Pai
            </Label>
            <p className="text-sm font-medium">{parentTicket.titulo}</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Dados Herdados
            </Label>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Setor: {parentTicket.time_responsavel}</p>
              <p>• Prioridade: {parentTicket.nivel_criticidade}</p>
              <p>• Tipo: {parentTicket.tipo_ticket}</p>
              {parentTicket.tags && parentTicket.tags.length > 0 && (
                <p>• Tags: {parentTicket.tags.join(', ')}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              placeholder="Descreva o sub-ticket..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSubTicket}
              disabled={isLoading || !description.trim()}
            >
              {isLoading ? 'Criando...' : 'Criar Sub-Ticket'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}