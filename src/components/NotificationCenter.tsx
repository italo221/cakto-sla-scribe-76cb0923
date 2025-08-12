import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavbarSettings } from '@/hooks/useNavbarSettings';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificationCenter() {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAllAsRead, 
    handleNotificationClick 
  } = useNotifications();
  
  const { settings } = useNavbarSettings();

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR
    });
  };

  // Determinar alinhamento baseado na posição da navbar
  const dropdownAlign = settings.navbar_position === 'left' ? 'start' : 'end';
  const dropdownSide = settings.navbar_position === 'left' ? 'right' : 'bottom';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="default" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align={dropdownAlign as 'start' | 'center' | 'end'} 
        side={dropdownSide as 'top' | 'right' | 'bottom' | 'left'}
        className="w-80 z-[100]"
        sideOffset={settings.navbar_position === 'left' ? 12 : 8}
        alignOffset={settings.navbar_position === 'left' ? -8 : 0}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="text-sm font-semibold">
            Notificações
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando notificações...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Nenhuma notificação
          </div>
        ) : (
          <ScrollArea className="h-96">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title}
                      </h4>
                      {!notification.is_read && (
                        <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${!notification.is_read ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {formatTimeAgo(notification.created_at)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}