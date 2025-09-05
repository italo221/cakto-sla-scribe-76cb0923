import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { subscribeToChannel } from '@/lib/realtimeManager';

interface Notification {
  id: string;
  user_id: string;
  ticket_id?: string;
  comment_id?: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Buscar notificações iniciais
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchNotifications();
  }, [user]);

  // ❌ REALTIME COMPLETAMENTE DESABILITADO - Reduzir egress e overhead
  useEffect(() => {
    console.warn('⚠️ Realtime de notificações desabilitado permanentemente');
    return;
  }, [user, toast]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, ticket_id, type, title, is_read, created_at') // Apenas campos essenciais
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20); // Reduzir ainda mais para diminuir egress

      if (error) throw error;

      // Transformar dados para interface completa
      const notificationsData: Notification[] = data?.map(item => ({
        id: item.id,
        user_id: user.id,
        ticket_id: item.ticket_id,
        comment_id: undefined,
        type: item.type,
        title: item.title,
        message: '', // Não carregar message para reduzir egress
        is_read: item.is_read,
        created_at: item.created_at,
        updated_at: ''
      })) || [];
      
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como lida
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navegar para o ticket relacionado
    if (notification.ticket_id) {
      // Se já estamos na inbox, apenas adicionar o parâmetro
      if (location.pathname === '/inbox') {
        navigate(`/inbox?ticket=${notification.ticket_id}`, { replace: true });
      } else {
        navigate(`/inbox?ticket=${notification.ticket_id}`);
      }
      
      // Disparar evento customizado para abrir o modal
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openTicketModal', { 
          detail: { ticketId: notification.ticket_id } 
        }));
      }, 100);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    refreshNotifications: fetchNotifications
  };
}