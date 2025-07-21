import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Inbox, Home, BarChart3, Settings, BookOpen, Shield, LogOut, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Navigation() {
  const location = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <Card className="border-b rounded-none">
      <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Sistema SLA</h1>
        </div>
        
        <nav className="flex items-center gap-2">
          <Button
            variant={isActive('/') ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Criar SLA
            </Link>
          </Button>
          
          <Button
            variant={isActive('/dashboard') ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>

          <Button
            variant={isActive('/integrations') ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/integrations" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Integrações
            </Link>
          </Button>

          <Button
            variant={isActive('/admin') ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          </Button>
          
          <Button
            variant={isActive('/inbox') ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/inbox" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Caixa de Entrada
            </Link>
          </Button>
          
          <Button
            variant={isActive('/documentation') ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/documentation" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Documentação
            </Link>
          </Button>

          {/* User Status Section */}
          {user && profile ? (
            <div className="flex items-center gap-3 ml-4 pl-4 border-l">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{profile.nome_completo}</span>
                  <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
                    {isAdmin ? "Admin Master" : "Colaborador"}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="flex items-center gap-2 text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          ) : (
            <Button
              variant={isActive('/auth') ? 'default' : 'outline'}
              size="sm"
              asChild
              className="ml-4"
            >
              <Link to="/auth" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Login
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </Card>
  );
}