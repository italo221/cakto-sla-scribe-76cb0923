import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface User {
  user_id: string;
  nome_completo: string;
  email: string;
  avatar_url?: string;
}

interface TicketAssigneeDisplayProps {
  assignee?: User | null;
  size?: 'sm' | 'md' | 'lg';
  showEmail?: boolean;
  variant?: 'full' | 'chip' | 'avatar';
}

export const TicketAssigneeDisplay: React.FC<TicketAssigneeDisplayProps> = ({
  assignee,
  size = 'md',
  showEmail = false,
  variant = 'full'
}) => {
  if (!assignee) {
    if (variant === 'chip' || variant === 'avatar') {
      return null;
    }
    return <span className="text-muted-foreground">—</span>;
  }

  const initials = assignee.nome_completo
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const avatarSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (variant === 'avatar') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className={avatarSizes[size]}>
              <AvatarImage src={assignee.avatar_url} />
              <AvatarFallback className={textSizes[size]}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">{assignee.nome_completo}</p>
              <p className="text-xs text-muted-foreground">{assignee.email}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'chip') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="flex items-center space-x-1 px-2 py-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={assignee.avatar_url} />
                <AvatarFallback className="text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">
                {assignee.nome_completo.split(' ')[0]}
              </span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">{assignee.nome_completo}</p>
              <p className="text-xs text-muted-foreground">{assignee.email}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // variant === 'full'
  return (
    <div className="flex items-center space-x-2">
      <Avatar className={avatarSizes[size]}>
        <AvatarImage src={assignee.avatar_url} />
        <AvatarFallback className={textSizes[size]}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className={`font-medium ${textSizes[size]}`}>
          {assignee.nome_completo}
        </span>
        {showEmail && (
          <span className={`text-muted-foreground ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
            {assignee.email}
          </span>
        )}
      </div>
    </div>
  );
};