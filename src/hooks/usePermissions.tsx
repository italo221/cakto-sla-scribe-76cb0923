import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserSetor {
  id: string;
  user_id: string;
  setor_id: string;
  is_leader: boolean;
  setor: {
    id: string;
    nome: string;
  };
}

export const usePermissions = () => {
  const { user, profile, isSuperAdmin } = useAuth();
  const [userSetores, setUserSetores] = useState<UserSetor[]>([]);
  const [setorPermissions, setSetorPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserSetores();
    }
  }, [user]);

  const fetchUserSetores = async () => {
    if (!user) return;

    try {
      const [userSetoresData, setorPermissionsData] = await Promise.all([
        supabase
          .from('user_setores')
          .select(`
            *,
            setor:setores(id, nome)
          `)
          .eq('user_id', user.id),
        supabase
          .from('setor_permissoes')
          .select('*')
      ]);

      if (userSetoresData.error) throw userSetoresData.error;
      if (setorPermissionsData.error) throw setorPermissionsData.error;

      setUserSetores(userSetoresData.data || []);
      setSetorPermissions(setorPermissionsData.data || []);
    } catch (error) {
      console.error('Erro ao buscar setores do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const isLeaderOfSetor = (setorId: string) => {
    return userSetores.some(us => us.setor_id === setorId && us.is_leader);
  };

  const isLeaderOfSetorByName = (setorName: string) => {
    return userSetores.some(us => us.setor?.nome === setorName && us.is_leader);
  };

  const canEditTicket = (ticket: any) => {
    // Super Admin pode editar qualquer ticket
    if (isSuperAdmin) return true;

    // Verificar permissões por setor primeiro
    const userSetorIds = userSetores.map(us => us.setor_id);
    const setorPermission = setorPermissions.find(sp => 
      userSetorIds.includes(sp.setor_id) || 
      (ticket.setor_id && sp.setor_id === ticket.setor_id)
    );

    // Se há permissão por setor configurada e ela não permite editar
    if (setorPermission && !setorPermission.pode_editar_ticket) {
      // Apenas o próprio criador pode editar se não há permissão geral
      return ticket.solicitante === user?.email;
    }

    // Operadores podem editar apenas tickets que criaram (baseado no email)
    if (profile?.role === 'operador') {
      return ticket.solicitante === user?.email;
    }

    // Usuários de outros setores não podem editar tickets de outros setores
    // Apenas podem editar seus próprios tickets
    if (ticket.solicitante === user?.email) {
      return true;
    }

    // Líderes do setor podem editar qualquer ticket do próprio setor
    if (ticket.setor_id && isLeaderOfSetor(ticket.setor_id)) {
      return true;
    }

    // Também verificar por nome do setor (fallback para líderes)
    if (ticket.time_responsavel && isLeaderOfSetorByName(ticket.time_responsavel)) {
      return true;
    }

    return false;
  };

  const canDeleteTicket = (ticket: any) => {
    // Super Admin pode excluir QUALQUER ticket sem restrições
    if (isSuperAdmin) return true;

    // Verificar permissões por setor
    const userSetorIds = userSetores.map(us => us.setor_id);
    const setorPermission = setorPermissions.find(sp => 
      userSetorIds.includes(sp.setor_id) || 
      (ticket.setor_id && sp.setor_id === ticket.setor_id)
    );

    // Se há permissão por setor configurada e ela não permite excluir
    if (setorPermission && !setorPermission.pode_excluir_ticket) {
      return false;
    }

    // Operadores NÃO podem excluir tickets (nem os próprios)
    if (profile?.role === 'operador') return false;

    // Líderes do setor podem excluir qualquer ticket do próprio setor
    if (ticket.setor_id && isLeaderOfSetor(ticket.setor_id)) {
      return true;
    }

    // Também verificar por nome do setor (fallback para líderes)
    if (ticket.time_responsavel && isLeaderOfSetorByName(ticket.time_responsavel)) {
      return true;
    }

    return false;
  };

  const hasAnySetor = () => {
    return isSuperAdmin || userSetores.length > 0;
  };

  const canCreateTicket = () => {
    return hasAnySetor();
  };

  const getSetorValidationMessage = () => {
    if (!hasAnySetor()) {
      return "Você precisa ser atribuído a um setor/time antes de criar ou editar tickets. Contate um administrador.";
    }
    return null;
  };

  return {
    userSetores,
    loading,
    isLeaderOfSetor,
    isLeaderOfSetorByName,
    canEditTicket,
    canDeleteTicket,
    hasAnySetor,
    canCreateTicket,
    getSetorValidationMessage,
    refreshUserSetores: fetchUserSetores
  };
};