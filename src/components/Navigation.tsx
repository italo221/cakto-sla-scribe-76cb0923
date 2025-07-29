import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  MessageSquare, 
  Inbox, 
  Home, 
  BarChart3, 
  Settings, 
  BookOpen, 
  Shield, 
  Menu,
  LogOut,
  User,
  Palette,
  Columns3,
  UserCog
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSystemConfig } from "@/contexts/SystemConfigContext";
import UserProfileSettings from "@/components/UserProfileSettings";

interface NavItem {
  path: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
  requireCreatePermission?: boolean;
  hideForViewer?: boolean;
}

const navItems: NavItem[] = [
  { path: "/", label: "Criar Ticket", icon: Home, requireCreatePermission: true },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/inbox", label: "Caixa de Entrada", icon: Inbox, hideForViewer: true },
  { path: "/kanban", label: "Kanban", icon: Columns3, hideForViewer: true },
  { path: "/integrations", label: "Integrações", icon: Settings, adminOnly: true },
  { path: "/customization", label: "Personalização", icon: Palette, adminOnly: true },
  { path: "/admin", label: "Admin", icon: Shield, adminOnly: true },
  { path: "/documentation", label: "Documentação", icon: BookOpen }
];

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const { user, profile, isSuperAdmin, canEdit, signOut } = useAuth();
  const { systemName, systemLogo, isInitialized } = useSystemConfig();
  
  const isActive = (path: string) => location.pathname === path;
  
  // Verificar se é viewer
  const isViewer = profile?.role === 'viewer';
  
  // Filtrar itens de navegação baseado no role do usuário
  const filteredNavItems = navItems.filter(item => {
    // ADMIN MENU: Apenas Super Admin pode ver
    if (item.adminOnly && !isSuperAdmin) {
      return false;
    }
    // Verificar permissão de criação para o item "Criar Ticket"
    if (item.requireCreatePermission && !canEdit && !isSuperAdmin) {
      return false;
    }
    // Ocultar itens específicos para viewer
    if (item.hideForViewer && isViewer) {
      return false;
    }
    return true;
  });

  const NavLink = ({ item, mobile = false }: { item: NavItem; mobile?: boolean }) => {
    const active = isActive(item.path);
    return (
      <Button
        variant={active ? 'default' : 'ghost'}
        size="sm"
        asChild
        className={`
          nav-item transition-all duration-200
          ${mobile ? 'w-full justify-start' : ''}
          ${active ? 'nav-item-active shadow-sm' : 'nav-item-inactive hover-lift'}
        `}
        onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
      >
        <Link to={item.path} className="flex items-center gap-2">
          <item.icon className="h-4 w-4" />
          {mobile || <span className="hidden sm:inline">{item.label}</span>}
          {mobile && <span>{item.label}</span>}
        </Link>
      </Button>
    );
  };

  const UserMenu = () => {
    if (!user) {
      return (
        <Button onClick={() => navigate('/auth')} variant="outline" size="sm">
          Fazer Login
        </Button>
      );
    }

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

    const handleSignOut = async () => {
      await signOut();
      navigate('/');
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 p-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium">
                {profile?.nome_completo || user.email}
              </span>
              <Badge variant={roleBadge.variant} className="text-xs">
                {roleBadge.label}
              </Badge>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
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
    );
  };

  return (
    <>
      <Card className="border-b rounded-none sticky top-0 z-50 bg-card/95 backdrop-blur-sm">
        <div className="container-responsive">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 hover-scale">
              {systemLogo && (
                <img 
                  src={systemLogo} 
                  alt="Logo do sistema" 
                  className="h-8 w-8 object-contain" 
                />
              )}
              <div>
                {!isInitialized ? (
                  <div className="w-20 h-6 bg-muted animate-pulse rounded"></div>
                ) : (
                  <h1 className="text-xl font-bold text-gradient">
                    {systemName}
                  </h1>
                )}
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Sistema Tickets
                </p>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {filteredNavItems.map((item) => (
                <NavLink key={item.path} item={item} />
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* User Menu */}
              <UserMenu />

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[350px] md:w-[400px] max-w-[90vw]">
                  <div className="flex flex-col gap-4 mt-8">
                    <div className="flex items-center gap-3 pb-4 border-b">
                      {systemLogo && (
                        <img 
                          src={systemLogo} 
                          alt="Logo do sistema" 
                          className="h-8 w-8 object-contain" 
                        />
                      )}
                      <div>
                        {!isInitialized ? (
                          <div className="w-24 h-5 bg-muted animate-pulse rounded"></div>
                        ) : (
                          <h2 className="font-semibold">{systemName}</h2>
                        )}
                        <p className="text-sm text-muted-foreground">Sistema Tickets</p>
                      </div>
                    </div>
                    
                    <nav className="flex flex-col gap-2">
                      {filteredNavItems.map((item) => (
                        <NavLink key={item.path} item={item} mobile />
                      ))}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </Card>

      {/* User Profile Settings Modal */}
      <UserProfileSettings 
        open={profileSettingsOpen} 
        onOpenChange={setProfileSettingsOpen} 
      />
    </>
  );
}