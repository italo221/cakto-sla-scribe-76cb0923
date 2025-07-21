import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MessageSquare, Inbox, Home, BarChart3, Settings, BookOpen, User, LogOut, Shield, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Navigation() {
  const location = useLocation();
  const { profile, setores, isAdmin, signOut } = useAuth();
  
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

          {isAdmin && (
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
          )}

          {isAdmin && (
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
          )}
          
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

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden md:inline">{profile?.nome_completo}</span>
                {isAdmin ? (
                  <Badge variant="destructive" className="ml-2">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2">
                    <Users className="h-3 w-3 mr-1" />
                    Colaborador
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.nome_completo}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
              
              {!isAdmin && setores.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground mb-1">Setores:</p>
                    {setores.map((userSetor) => (
                      <Badge key={userSetor.setor_id} variant="outline" className="mr-1 mb-1 text-xs">
                        {userSetor.setor.nome}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </Card>
  );
}