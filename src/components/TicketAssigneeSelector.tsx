import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { UserPlus, X, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  user_id: string;
  nome_completo: string;
  email: string;
  avatar_url?: string;
}

interface TicketAssigneeSelectorProps {
  ticketId: string;
  currentAssigneeId?: string | null;
  currentAssignee?: User | null;
  ticketSectorId?: string;
  onAssigneeChange?: (assigneeId: string | null, assignee: User | null) => void;
}

export const TicketAssigneeSelector: React.FC<TicketAssigneeSelectorProps> = ({
  ticketId,
  currentAssigneeId,
  currentAssignee,
  ticketSectorId,
  onAssigneeChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const { user, isSuperAdmin } = useAuth();
  const { userSetores } = usePermissions();
  const { toast } = useToast();

  // Verificar se o usuário atual pode atribuir no setor do ticket
  const canAssignInTicketSector = isSuperAdmin || 
    (ticketSectorId && userSetores.some(us => us.setor_id === ticketSectorId));

  useEffect(() => {
    if (isOpen && canAssignInTicketSector) {
      fetchUsers();
    }
  }, [isOpen, canAssignInTicketSector, ticketSectorId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          user_id,
          nome_completo,
          email,
          avatar_url
        `)
        .eq('ativo', true)
        .order('nome_completo');

      // Se não é super admin, filtrar apenas usuários do setor do ticket
      if (!isSuperAdmin && ticketSectorId) {
        const { data: sectorUsers } = await supabase
          .from('user_setores')
          .select('user_id')
          .eq('setor_id', ticketSectorId);
        
        if (sectorUsers && sectorUsers.length > 0) {
          const userIds = sectorUsers.map(su => su.user_id);
          query = query.in('user_id', userIds);
        } else {
          setUsers([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de usuários",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async (selectedUser: User | null) => {
    if (!canAssignInTicketSector) {
      toast({
        title: "Permissão negada",
        description: "Você não tem permissão para atribuir responsáveis neste setor",
        variant: "destructive"
      });
      return;
    }

    setAssigning(true);
    try {
      const { error } = await supabase
        .from('sla_demandas')
        .update({ assignee_user_id: selectedUser?.user_id || null })
        .eq('id', ticketId);

      if (error) throw error;

      // Registrar no histórico
      const actionType = currentAssigneeId && selectedUser ? 'responsavel_alterado' : 
                        selectedUser ? 'responsavel_atribuido' : 'responsavel_removido';
      
      let justificativa = '';
      if (actionType === 'responsavel_atribuido') {
        justificativa = `Responsável atribuído: ${selectedUser?.nome_completo}`;
      } else if (actionType === 'responsavel_alterado') {
        justificativa = `Responsável alterado de ${currentAssignee?.nome_completo} para ${selectedUser?.nome_completo}`;
      } else {
        justificativa = `Responsável removido: ${currentAssignee?.nome_completo}`;
      }

      await supabase.rpc('log_sla_action', {
        p_sla_id: ticketId,
        p_acao: actionType,
        p_justificativa: justificativa,
        p_dados_anteriores: currentAssigneeId ? { assignee_anterior: currentAssigneeId } : null,
        p_dados_novos: { assignee_novo: selectedUser?.user_id || null }
      });

      // Criar notificação para o usuário atribuído (se houver)
      if (selectedUser && selectedUser.user_id !== user?.id) {
        // Buscar informações do ticket para a notificação
        const { data: ticketData } = await supabase
          .from('sla_demandas')
          .select('titulo')
          .eq('id', ticketId)
          .single();

        if (ticketData) {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: selectedUser.user_id,
              ticket_id: ticketId,
              type: 'ticket_assignment',
              title: 'Ticket atribuído a você',
              message: `Você foi designado como responsável pelo ticket: ${ticketData.titulo}`
            });

          if (notificationError) {
            console.error('Erro ao criar notificação:', notificationError);
          }
        }
      }

      // Notificar mudança
      onAssigneeChange?.(selectedUser?.user_id || null, selectedUser);
      
      toast({
        title: "Sucesso",
        description: justificativa,
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao atribuir responsável:', error);
      toast({
        title: "Erro",
        description: "Erro ao atribuir responsável",
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignToMe = () => {
    const currentUserProfile = users.find(u => u.user_id === user?.id);
    if (currentUserProfile) {
      handleAssignUser(currentUserProfile);
    }
  };

  if (!canAssignInTicketSector) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <UserPlus className="h-4 w-4 mr-1" />
          Atribuir
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Buscar usuário..." 
            className="border-0 focus:ring-0 focus:ring-offset-0" 
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Carregando..." : "Nenhum usuário encontrado"}
            </CommandEmpty>
            <CommandGroup>
              {/* Ações rápidas */}
              <CommandItem
                onSelect={handleAssignToMe}
                disabled={assigning || currentAssigneeId === user?.id}
              >
                <Check className="h-4 w-4 mr-2" />
                Atribuir a mim
              </CommandItem>
              
              {currentAssigneeId && (
                <CommandItem
                  onSelect={() => handleAssignUser(null)}
                  disabled={assigning}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remover responsável
                </CommandItem>
              )}
              
              {users.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t">
                    Usuários disponíveis
                  </div>
                  {users.map((user) => (
                    <CommandItem
                      key={user.user_id}
                      onSelect={() => handleAssignUser(user)}
                      disabled={assigning || currentAssigneeId === user.user_id}
                    >
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {user.nome_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm">{user.nome_completo}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                        {currentAssigneeId === user.user_id && (
                          <Check className="h-4 w-4 ml-auto" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};