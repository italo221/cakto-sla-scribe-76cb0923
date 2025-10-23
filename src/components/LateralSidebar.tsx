import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Inbox, 
  Plus, 
  BarChart3, 
  Settings, 
  BookOpen, 
  Shield, 
  LogOut,
  UserCog,
  Palette,
  Columns3,
  Menu,
  User,
  Bell,
  Users,
  Lightbulb
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSystemConfig } from "@/contexts/SystemConfigContext";
import UserProfileSettings from "@/components/UserProfileSettings";
import NotificationCenter from "@/components/NotificationCenter";
import NavbarCustomization from "@/components/NavbarCustomization";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface NavItem {
  path: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
  requireCreatePermission?: boolean;
  hideForViewer?: boolean;
}

interface LateralSidebarProps {
  glassEffect?: boolean;
}

const navItems: NavItem[] = [
  { path: "/", label: "Criar Ticket", icon: Plus, requireCreatePermission: true },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/time", label: "Time", icon: Users, hideForViewer: true },
  { path: "/inbox", label: "Caixa de Entrada", icon: Inbox, hideForViewer: true },
  { path: "/kanban", label: "Kanban", icon: Columns3, hideForViewer: true },
  { path: "/melhorias", label: "Melhorias", icon: Lightbulb, hideForViewer: true },
  { path: "/integrations", label: "Integrações", icon: Settings, adminOnly: true },
  { path: "/customization", label: "Personalização", icon: Palette, adminOnly: true },
  { path: "/admin", label: "Admin", icon: Shield, adminOnly: true },
  { path: "/documentation", label: "Documentação", icon: BookOpen }
];

export default function LateralSidebar({ glassEffect = false }: LateralSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, profile, isSuperAdmin, canEdit, signOut } = useAuth();
  const { systemName, systemLogo } = useSystemConfig();
  
  // Anti-jitter: prevent collapse when user menu is open
  const shouldExpand = expanded || userMenuOpen;
  
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

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path);
    return (
      <Button
        variant={active ? 'default' : 'ghost'}
        size="sm"
        asChild
        className={`
          w-full justify-start transition-all duration-200
          ${active ? 'shadow-sm' : 'hover:bg-accent'}
          ${shouldExpand ? 'px-3' : 'px-2 justify-center'}
        `}
      >
        <Link to={item.path} className="flex items-center gap-3">
          <item.icon className="h-4 w-4 flex-shrink-0" />
          {shouldExpand && <span className="truncate">{item.label}</span>}
        </Link>
      </Button>
    );
  };

  const getUserInitials = () => {
    if (!user) return "U";
    return profile?.nome_completo
      ? profile.nome_completo.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : user.email?.substring(0, 2).toUpperCase() || "U";
  };

  const getRoleBadge = () => {
    if (profile?.role === 'super_admin' || profile?.user_type === 'administrador_master') {
      return { label: 'Super Admin', variant: 'default' as const };
    }
    if (profile?.role === 'operador') {
      return { label: 'Operador', variant: 'secondary' as const };
    }
    return { label: 'Viewer', variant: 'outline' as const };
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <div 
        className={`
          fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out flex flex-col
          ${shouldExpand ? 'w-64' : 'w-16'}
          ${glassEffect 
            ? 'bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-r border-border/40' 
            : 'bg-background border-r border-border'
          }
        `}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => !userMenuOpen && setExpanded(false)}
      >
        {/* Header - Logo + Notificações */}
        <div className="p-4 border-b border-border/40">
          <div className="flex items-center justify-between">
            {/* Logo e Nome */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {systemLogo && (
                <img 
                  src={systemLogo} 
                  alt="Logo" 
                  className="h-8 w-8 object-contain flex-shrink-0" 
                />
              )}
              {shouldExpand && (
                <div className="truncate">
                  <h1 className="text-lg font-bold text-gradient truncate">
                    {systemName}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Sistema Tickets
                  </p>
                </div>
              )}
            </div>
            
            {/* Notificações - Expandida: ao lado da logo, Colapsada: canto superior direito */}
            {user && shouldExpand && (
              <div className="ml-4 flex-shrink-0">
                <NotificationCenter />
              </div>
            )}
          </div>
        </div>

        {/* Notificações quando colapsada - ancorada no canto superior direito da sidebar */}
        {user && !shouldExpand && (
          <div className="absolute top-2 right-2 z-50">
            <NotificationCenter />
          </div>
        )}

        {/* Navigation - Flexível */}
        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </div>

        {/* Footer - Fixo no rodapé */}
        <div className="mt-auto p-2 border-t border-border/40">
          {/* Theme Toggle - Acima do card do usuário */}
          <div className={`flex mb-2 ${shouldExpand ? 'justify-start' : 'justify-center'}`}>
            <ThemeToggle />
          </div>
          
          {/* User Card - Sempre no rodapé */}
          {user && (
            <div>
              <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={`w-full transition-all duration-200 ${
                      shouldExpand ? 'justify-start' : 'justify-center px-2'
                    }`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    {shouldExpand && (
                      <div className="ml-3 flex flex-col items-start truncate">
                        <span className="text-sm font-medium truncate">
                          {profile?.nome_completo || user.email}
                        </span>
                        <Badge variant={getRoleBadge().variant} className="text-xs">
                          {getRoleBadge().label}
                        </Badge>
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setProfileSettingsOpen(true)}>
                    <UserCog className="mr-2 h-4 w-4" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCustomizationOpen(true)}>
                    <Palette className="mr-2 h-4 w-4" />
                    Customização
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
          )}
        </div>
      </div>

      {/* User Profile Settings Modal */}
      <UserProfileSettings 
        open={profileSettingsOpen} 
        onOpenChange={setProfileSettingsOpen} 
      />

      {/* Customization Sheet */}
      <Sheet open={customizationOpen} onOpenChange={setCustomizationOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[500px]">
          <SheetHeader>
            <SheetTitle>Customização</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <NavbarCustomization />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}