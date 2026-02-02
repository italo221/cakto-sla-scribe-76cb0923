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
          flex items-center gap-3 px-3 h-10 rounded-md transition-all duration-150
          text-[13px] font-medium
          ${active 
            ? 'bg-white/[0.08] text-[#E5E7EB] font-semibold' 
            : 'text-[#9CA3AF] hover:bg-white/[0.04] hover:text-[#D1D5DB]'
          }
          ${shouldExpand ? '' : 'justify-center px-2'}
        `}
      >
        <item.icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-[#E5E7EB]' : 'text-[#6B7280]'}`} />
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
          fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out flex flex-col
          ${shouldExpand ? 'w-56' : 'w-14'}
          bg-[#0A0A0B] border-r border-white/[0.08]
        `}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => !userMenuOpen && setExpanded(false)}
      >
        {/* Header - Logo */}
        <div className="p-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between min-w-0">
            {shouldExpand && (
              <span className="text-[14px] font-semibold text-white truncate">
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

        {/* Footer - User Card */}
        <div className="mt-auto p-2 border-t border-white/[0.06]">
          {/* User Card */}
          {user && (
            <div className="flex items-center gap-2">
              <div 
                className={`
                  flex items-center gap-2 flex-1 min-w-0 p-2 rounded-md
                  hover:bg-white/[0.04] cursor-pointer transition-colors
                  ${shouldExpand ? '' : 'justify-center'}
                `}
                onClick={() => setProfileSettingsOpen(true)}
              >
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="bg-white/10 text-[#9CA3AF] text-[11px] font-medium">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {shouldExpand && (
                  <span className="text-[13px] text-[#9CA3AF] truncate">
                    {profile?.nome_completo || user.email?.split('@')[0]}
                  </span>
                )}
              </div>
              
              {shouldExpand && (
                <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded hover:bg-white/[0.04] text-[#6B7280] hover:text-[#9CA3AF] transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-[#18181B] border-white/10">
                    <DropdownMenuItem 
                      onClick={() => setProfileSettingsOpen(true)}
                      className="text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] cursor-pointer"
                    >
                      <UserCog className="mr-2 h-4 w-4" />
                      Configurações
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setCustomizationOpen(true)}
                      className="text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] cursor-pointer"
                    >
                      <Palette className="mr-2 h-4 w-4" />
                      Customização
                    </DropdownMenuItem>
                    {isSuperAdmin && (
                      <>
                        <DropdownMenuSeparator className="bg-white/[0.06]" />
                        <DropdownMenuItem 
                          onClick={() => navigate('/admin')}
                          className="text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] cursor-pointer"
                        >
                          <User className="mr-2 h-4 w-4" />
                          Gerenciar Usuários
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator className="bg-white/[0.06]" />
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      className="text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] cursor-pointer"
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
