import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Inbox, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Navigation() {
  const location = useLocation();
  
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
            variant={isActive('/inbox') ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/inbox" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Caixa de Entrada
            </Link>
          </Button>
        </nav>
      </div>
    </Card>
  );
}