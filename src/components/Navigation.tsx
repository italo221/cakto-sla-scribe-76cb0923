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
  Menu
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;
  
  // Sistema aberto - todos têm acesso a tudo
  const filteredNavItems = navItems;

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
    // Sistema aberto - sempre mostra usuário admin
    const userInitials = "SA"; // Super Admin

    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-medium">
            Super Administrador
          </span>
          <Badge variant="default" className="text-xs">
            Acesso Total
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-b rounded-none sticky top-0 z-50 bg-card/95 backdrop-blur-sm">
      <div className="container-responsive">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover-scale">
            <img 
              src="/lovable-uploads/a6bb798c-787b-43e9-861b-cdffe6d3aee2.png" 
              alt="Manhattan Logo" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold text-gradient">Manhattan</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Sistema SLA
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
                    <img 
                      src="/lovable-uploads/a6bb798c-787b-43e9-861b-cdffe6d3aee2.png" 
                      alt="Manhattan Logo" 
                      className="h-8 w-auto"
                    />
                    <div>
                      <h2 className="font-semibold">Manhattan</h2>
                      <p className="text-sm text-muted-foreground">Sistema SLA</p>
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