import { Bell, Check, CheckCheck } from 'lucide-react';
import { useState } from 'react';
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
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavbarSettings } from '@/hooks/useNavbarSettings';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAllAsRead, 
    handleNotificationClick 
  } = useNotifications();
  
  const { settings } = useNavbarSettings();

  console.log('🔔 NotificationCenter - Configurações:', settings);

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR
    });
  };

  // Usar Popover para sidebar esquerda (mais confiável)
  const usePopover = settings.navbar_position === 'left';

  const NotificationButton = (
    <Button 
      variant="ghost" 
      size="sm" 
      className="relative"
      onClick={() => {
        console.log('🔔 NotificationCenter - Botão clicado!');
        if (usePopover) setOpen(!open);
      }}
    >
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
  );

  const NotificationContent = (
    <div className="w-80">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold">Notificações</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="h-auto px-2 py-1 text-xs flex-shrink-0"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Marcar todas
          </Button>
        )}
      </div>
      
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
            <div
              key={notification.id}
              className="flex flex-col items-start p-3 cursor-pointer hover:bg-muted/50 border-b border-border/40 last:border-b-0"
              onClick={() => {
                handleNotificationClick(notification);
                if (usePopover) setOpen(false);
              }}
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
            </div>
          ))}
        </ScrollArea>
      )}
    </div>
  );

  // Para navbar à esquerda, usar Popover
  if (usePopover) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {NotificationButton}
        </PopoverTrigger>
        <PopoverContent 
          side="right" 
          align="start" 
          className="p-0 z-[9999] bg-popover border border-border shadow-lg"
          sideOffset={12}
        >
          {NotificationContent}
        </PopoverContent>
      </Popover>
    );
  }

  // Para navbar no topo, usar DropdownMenu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {NotificationButton}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        side="bottom"
        className="w-80 z-[9999] bg-popover border border-border shadow-lg"
        sideOffset={8}
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