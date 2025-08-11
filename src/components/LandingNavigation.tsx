import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSystemConfig } from "@/contexts/SystemConfigContext";

interface NavItem {
  id: string;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { id: "sobre", label: "Sobre", href: "#sobre" },
  { id: "recursos", label: "Recursos", href: "#recursos" },
  { id: "como-funciona", label: "Como Funciona", href: "#como-funciona" },
  { id: "planos", label: "Planos", href: "#planos" },
  { id: "contato", label: "Contato", href: "#contato" }
];

export default function LandingNavigation() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { systemName, systemLogo, isInitialized } = useSystemConfig();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
    setMobileMenuOpen(false);
  };

  const NavLink = ({ item, mobile = false }: { item: NavItem; mobile?: boolean }) => {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`
          transition-all duration-200 hover:text-primary
          ${mobile ? 'w-full justify-start' : ''}
        `}
        onClick={() => scrollToSection(item.id)}
      >
        {item.label}
      </Button>
    );
  };

  return (
    <div className="sticky top-0 z-50 p-2 sm:p-4">
      <Card className="rounded-xl sm:rounded-2xl bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/60 border-border/40 shadow-lg">
        <div className="container-responsive">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <div className="flex items-center gap-2 hover-scale cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
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
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink key={item.id} item={item} />
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* Auth Buttons */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Entrar</span>
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Criar Conta</span>
              </Button>

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
                      {navItems.map((item) => (
                        <NavLink key={item.id} item={item} mobile />
                      ))}
                    </nav>
                    
                    <div className="border-t pt-4 flex flex-col gap-2">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/auth')}
                        className="w-full flex items-center gap-2"
                      >
                        <LogIn className="h-4 w-4" />
                        Entrar
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => navigate('/auth')}
                        className="w-full flex items-center gap-2"
                      >
                        <User className="h-4 w-4" />
                        Criar Conta
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}