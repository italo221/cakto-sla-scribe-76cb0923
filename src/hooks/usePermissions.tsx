import { useState, useEffect, useRef } from 'react';
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
  const [loading, setLoading] = useState(true);

  // Cache global para evitar múltiplas chamadas simultâneas
  const cacheRef = useRef<{
    data: UserSetor[] | null;
    loading: boolean;
    lastFetch: number;
  }>({
    data: null,
    loading: false,
    lastFetch: 0
  });

  useEffect(() => {
    if (user) {
      fetchUserSetores();
    } else {
      setUserSetores([]);
      setLoading(false);
    }
  }, [user?.id]); // Mudança: usar user.id ao invés de user inteiro

  const fetchUserSetores = async () => {
    if (!user) return;

    const now = Date.now();
    const CACHE_DURATION = 5000; // 5 segundos de cache

    // Se há dados em cache e são recentes, usar cache
    if (cacheRef.current.data && (now - cacheRef.current.lastFetch) < CACHE_DURATION) {
      setUserSetores(cacheRef.current.data);
      setLoading(false);
      return;
    }

    // Se já está carregando, aguardar
    if (cacheRef.current.loading) {
      const checkCache = () => {
        if (!cacheRef.current.loading && cacheRef.current.data) {
          setUserSetores(cacheRef.current.data);
          setLoading(false);
        } else {
          setTimeout(checkCache, 100);
        }
      };
      checkCache();
      return;
    }

    // Marcar como carregando
    cacheRef.current.loading = true;

    try {
      const { data, error } = await supabase
        .from('user_setores')
        .select(`
          *,
          setor:setores(id, nome)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const setoresData = data || [];
      
      // Atualizar cache
      cacheRef.current.data = setoresData;
      cacheRef.current.lastFetch = now;
      
      setUserSetores(setoresData);
    } catch (error) {
      console.error('Erro ao buscar setores do usuário:', error);
      // Em caso de erro, não atualizar o cache para tentar novamente
      setUserSetores([]);
    } finally {
      setLoading(false);
      cacheRef.current.loading = false;
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

    // Se é operador, pode editar apenas tickets que criou
    if (profile?.role === 'operador') {
      return ticket.solicitante === user?.email;
    }

    // Se é líder do setor, pode editar tickets do seu setor
    if (ticket.setor_id && isLeaderOfSetor(ticket.setor_id)) {
      return true;
    }

    // Também verificar por nome do setor (fallback)
    if (ticket.time_responsavel && isLeaderOfSetorByName(ticket.time_responsavel)) {
      return true;
    }

    return false;
  };

  const canStartOrResolveTicket = (ticket: any) => {
    // Super Admin pode iniciar/resolver qualquer ticket
    if (isSuperAdmin) return true;

    // Verificar se o usuário pertence ao setor responsável pelo ticket
    const belongsToResponsibleTeam = () => {
      // Verificar por setor_id se disponível
      if (ticket.setor_id) {
        return userSetores.some(us => us.setor_id === ticket.setor_id);
      }

      // Verificar por nome do setor (fallback)
      if (ticket.time_responsavel) {
        return userSetores.some(us => us.setor?.nome === ticket.time_responsavel);
      }

      return false;
    };

    return belongsToResponsibleTeam();
  };

  const canDeleteTicket = (ticket: any) => {
    // Apenas Super Admin pode excluir tickets
    if (isSuperAdmin) return true;

    // Apenas líderes do setor podem excluir tickets do seu setor
    // Operadores e membros NÃO podem excluir tickets (nem os próprios)
    if (profile?.role === 'operador') return false;

    // Líder do setor pode excluir tickets do seu setor
    if (ticket.setor_id && isLeaderOfSetor(ticket.setor_id)) {
      return true;
    }

    // Também verificar por nome do setor (fallback)
    if (ticket.time_responsavel && isLeaderOfSetorByName(ticket.time_responsavel)) {
      return true;
    }

    return false;
  };

  const canCloseTicket = (ticket: any) => {
    // Super Admin pode fechar qualquer ticket
    if (isSuperAdmin) return true;

    // Líderes do setor podem fechar tickets do seu setor
    if (ticket.setor_id && isLeaderOfSetor(ticket.setor_id)) {
      return true;
    }

    if (ticket.time_responsavel && isLeaderOfSetorByName(ticket.time_responsavel)) {
      return true;
    }

    // Quem criou o ticket pode sempre fechá-lo (independente do setor)
    if (ticket.status === 'resolvido' && ticket.solicitante === user?.email) {
      return true;
    }

    // Membros do setor responsável podem fechar tickets resolvidos do seu setor
    if (ticket.status === 'resolvido') {
      // Verificar se o usuário pertence ao setor responsável pelo ticket
      const belongsToResponsibleTeam = () => {
        // Verificar por setor_id se disponível
        if (ticket.setor_id) {
          return userSetores.some(us => us.setor_id === ticket.setor_id);
        }

        // Verificar por nome do setor (fallback)
        if (ticket.time_responsavel) {
          return userSetores.some(us => us.setor?.nome === ticket.time_responsavel);
        }

        return false;
      };

      if (belongsToResponsibleTeam()) {
        return true;
      }
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

  const getStartResolveValidationMessage = (ticket: any) => {
    if (!canStartOrResolveTicket(ticket)) {
      return "⛔ Você não pode iniciar ou resolver este ticket, pois não pertence ao time responsável.";
    }
    return null;
  };

  const getDeleteValidationMessage = (ticket: any) => {
    if (!canDeleteTicket(ticket) && !isSuperAdmin) {
      return "⛔ Apenas o líder do setor pode excluir tickets.";
    }
    return null;
  };

  const getCloseValidationMessage = (ticket: any) => {
    if (!canCloseTicket(ticket)) {
      return "⛔ Você não pode fechar este ticket. Apenas membros do setor responsável ou quem criou o ticket podem fechá-lo.";
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
    canStartOrResolveTicket,
    canCloseTicket,
    hasAnySetor,
    canCreateTicket,
    getSetorValidationMessage,
    getStartResolveValidationMessage,
    getDeleteValidationMessage,
    getCloseValidationMessage,
    refreshUserSetores: fetchUserSetores
  };
};