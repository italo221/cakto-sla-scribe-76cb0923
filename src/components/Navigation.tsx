import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Inbox, 
  Home, 
  BarChart3, 
  Settings, 
  BookOpen, 
  Shield, 
  LogOut, 
  User, 
  Menu,
  ChevronDown
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface NavItem {
  path: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: "/", label: "Criar SLA", icon: Home },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/inbox", label: "Caixa de Entrada", icon: Inbox },
  { path: "/integrations", label: "Integrações", icon: Settings },
  { path: "/admin", label: "Admin", icon: Shield, adminOnly: true },
  { path: "/documentation", label: "Documentação", icon: BookOpen }
];

export default function Navigation() {
  const location = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;
  
  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

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
    if (!user || !profile) {
      return (
        <Button
          variant={isActive('/auth') ? 'default' : 'outline'}
          size="sm"
          asChild
          className="hover-lift"
        >
          <Link to="/auth" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Login</span>
          </Link>
        </Button>
      );
    }

    const userInitials = profile.nome_completo
      .split(' ')
      .map(name => name[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 hover:bg-muted/50 transition-colors p-2"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium truncate max-w-[120px]">
                {profile.nome_completo}
              </span>
              <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
                {isAdmin ? "Admin" : "Colaborador"}
              </Badge>
            </div>
            <ChevronDown className="h-4 w-4 hidden md:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{profile.nome_completo}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={signOut}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <Card className="border-b rounded-none sticky top-0 z-50 bg-card/95 backdrop-blur-sm">
      <div className="container-responsive">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover-scale">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">Sistema SLA</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Gerenciamento Inteligente
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
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col gap-4 mt-8">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold">Sistema SLA</h2>
                      <p className="text-sm text-muted-foreground">Menu de Navegação</p>
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
  );
}