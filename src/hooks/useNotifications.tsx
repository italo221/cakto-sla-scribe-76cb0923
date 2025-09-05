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

  // Configurar realtime para novas notificações
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToChannel('notifications-changes', (channel) => {
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1);
            }

            // Mostrar toast para nova notificação
            toast({
              title: newNotification.title,
              description: newNotification.message,
              duration: 5000,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const updatedNotification = payload.new as Notification;
            setNotifications(prev =>
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );

            // Atualizar contador se foi marcada como lida
            if (updatedNotification.is_read && payload.old?.is_read === false) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        );
    });

    return () => {
      unsubscribe();
    };
  }, [user, toast]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
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