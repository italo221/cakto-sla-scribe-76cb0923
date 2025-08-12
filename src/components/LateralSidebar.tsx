import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  MessageSquare, 
  Inbox, 
  Plus, 
  BarChart3, 
  Settings, 
  BookOpen, 
  Shield, 
  LogOut,
  User,
  Palette,
  Columns3,
  UserCog,
  ChevronRight,
  Bell
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSystemConfig } from "@/contexts/SystemConfigContext";
import UserProfileSettings from "@/components/UserProfileSettings";
import NotificationCenter from "@/components/NotificationCenter";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
  requireCreatePermission?: boolean;
  hideForViewer?: boolean;
}

const navItems: NavItem[] = [
  { path: "/", label: "Criar Ticket", icon: Plus, requireCreatePermission: true },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/inbox", label: "Caixa de Entrada", icon: Inbox, hideForViewer: true },
  { path: "/kanban", label: "Kanban", icon: Columns3, hideForViewer: true },
  { path: "/integrations", label: "Integrações", icon: Settings, adminOnly: true },
  { path: "/customization", label: "Personalização", icon: Palette, adminOnly: true },
  { path: "/admin", label: "Admin", icon: Shield, adminOnly: true },
  { path: "/documentation", label: "Documentação", icon: BookOpen }
];

interface LateralSidebarProps {
  glassEffect?: boolean;
}

export default function LateralSidebar({ glassEffect = false }: LateralSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const { user, profile, isSuperAdmin, canEdit, signOut } = useAuth();
  const { systemName, systemLogo, isInitialized } = useSystemConfig();
  
  const isActive = (path: string) => location.pathname === path;
  
  // Verificar se é viewer
  const isViewer = profile?.role === 'viewer';
  
  // Filtrar itens de navegação baseado no role do usuário
  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && !isSuperAdmin) return false;
    if (item.requireCreatePermission && !canEdit && !isSuperAdmin) return false;
    if (item.hideForViewer && isViewer) return false;
    return true;
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) return null;

  const userInitials = profile?.nome_completo
    ? profile.nome_completo.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.substring(0, 2).toUpperCase();

  const getRoleBadge = () => {
    if (profile?.role === 'super_admin' || profile?.user_type === 'administrador_master') {
      return { label: 'Super Admin', variant: 'default' as const };
    }
    if (profile?.role === 'operador') {
      return { label: 'Operador', variant: 'secondary' as const };
    }
    return { label: 'Viewer', variant: 'outline' as const };
  };

  const roleBadge = getRoleBadge();

  const sidebarClasses = cn(
    "fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out border-r border-border/40",
    glassEffect 
      ? "bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60" 
      : "bg-background",
    isExpanded ? "w-64" : "w-16"
  );

  return (
    <>
      <div 
        className={sidebarClasses}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              {systemLogo && (
                <img 
                  src={systemLogo} 
                  alt="Logo do sistema" 
                  className="h-8 w-8 object-contain flex-shrink-0" 
                />
              )}
              {isExpanded && (
                <div className="min-w-0 flex-1">
                  {!isInitialized ? (
                    <div className="w-20 h-5 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <h1 className="text-sm font-bold text-gradient truncate">
                      {systemName}
                    </h1>
                  )}
                  <p className="text-xs text-muted-foreground truncate">
                    Sistema Tickets
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-b border-border/40">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full p-2 h-auto justify-start">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  {isExpanded && (
                    <div className="ml-3 flex flex-col items-start min-w-0 flex-1">
                      <span className="text-sm font-medium truncate w-full">
                        {profile?.nome_completo || user.email}
                      </span>
                      <Badge variant={roleBadge.variant} className="text-xs">
                        {roleBadge.label}
                      </Badge>
                    </div>
                  )}
                  {isExpanded && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => setProfileSettingsOpen(true)}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                {isSuperAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <User className="mr-2 h-4 w-4" />
                      Gerenciar Usuários
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {filteredNavItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Button
                    key={item.path}
                    variant={active ? 'default' : 'ghost'}
                    size="sm"
                    asChild
                    className={cn(
                      "w-full transition-all duration-200",
                      isExpanded ? "justify-start" : "justify-center",
                      active ? "shadow-sm" : "hover:bg-accent/50"
                    )}
                  >
                    <Link to={item.path} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {isExpanded && (
                        <span className="text-sm truncate">{item.label}</span>
                      )}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-border/40 space-y-2">
            {/* Notifications */}
            <div className="flex justify-center">
              <NotificationCenter />
            </div>
            
            {/* Theme Toggle */}
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Settings Modal */}
      <UserProfileSettings 
        open={profileSettingsOpen} 
        onOpenChange={setProfileSettingsOpen} 
      />
    </>
  );
}