import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
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
  User,
  Users,
  Lightbulb,
  MoreHorizontal
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSystemConfig } from "@/contexts/SystemConfigContext";
import UserProfileSettings from "@/components/UserProfileSettings";
import NotificationCenter from "@/components/NotificationCenter";
import NavbarCustomization from "@/components/NavbarCustomization";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
      <Link 
        to={item.path} 
        className={`
          sidebar-item flex items-center gap-3 px-3 h-10 rounded-md transition-all duration-150
          ${active 
            ? 'active sidebar-item-active' 
            : 'sidebar-item-hover'
          }
          ${shouldExpand ? '' : 'justify-center px-2'}
        `}
      >
        <item.icon className={`h-4 w-4 flex-shrink-0 ${active ? 'sidebar-icon-active' : 'sidebar-icon'}`} />
        {shouldExpand && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const getUserInitials = () => {
    if (!user) return "U";
    return profile?.nome_completo
      ? profile.nome_completo.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : user.email?.substring(0, 2).toUpperCase() || "U";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <div 
        className={`
          sidebar-typography sidebar-container
          fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out flex flex-col
          ${shouldExpand ? 'w-56' : 'w-14'}
        `}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => !userMenuOpen && setExpanded(false)}
      >
        {/* Header - Logo */}
        <div className="p-3 border-b sidebar-border">
          <div className="flex items-center justify-between min-w-0">
            {shouldExpand && (
              <span className="sidebar-title sidebar-title-color truncate">
                {systemName}
              </span>
            )}
            {user && (
              <div className={shouldExpand ? '' : 'mx-auto'}>
                <NotificationCenter />
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </div>

        {/* Footer - Theme Toggle & User Card */}
        <div className="mt-auto p-2 border-t sidebar-border">
          {/* Theme Toggle */}
          <div className={`flex items-center ${shouldExpand ? 'px-2' : 'justify-center'} mb-1`}>
            <ThemeToggle />
          </div>
          {/* User Card */}
          {user && (
            <div className="flex items-center gap-2">
              <div 
                className={`
                  flex items-center gap-2 flex-1 min-w-0 p-2 rounded-md
                  sidebar-item-hover cursor-pointer transition-colors
                  ${shouldExpand ? '' : 'justify-center'}
                `}
                onClick={() => setProfileSettingsOpen(true)}
              >
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="sidebar-avatar text-[11px] font-normal">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {shouldExpand && (
                  <span className="sidebar-user-name truncate">
                    {profile?.nome_completo || user.email?.split('@')[0]}
                  </span>
                )}
              </div>
              
              {shouldExpand && (
                <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded sidebar-item-hover sidebar-icon hover:opacity-80 transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 sidebar-dropdown">
                    <DropdownMenuItem 
                      onClick={() => setProfileSettingsOpen(true)}
                      className="sidebar-dropdown-item cursor-pointer"
                    >
                      <UserCog className="mr-2 h-4 w-4" />
                      Configurações
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setCustomizationOpen(true)}
                      className="sidebar-dropdown-item cursor-pointer"
                    >
                      <Palette className="mr-2 h-4 w-4" />
                      Customização
                    </DropdownMenuItem>
                    {isSuperAdmin && (
                      <>
                        <DropdownMenuSeparator className="sidebar-separator" />
                        <DropdownMenuItem 
                          onClick={() => navigate('/admin')}
                          className="sidebar-dropdown-item cursor-pointer"
                        >
                          <User className="mr-2 h-4 w-4" />
                          Gerenciar Usuários
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator className="sidebar-separator" />
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      className="sidebar-dropdown-item cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
