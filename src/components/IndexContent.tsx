import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import TicketChat from "@/components/TicketChat";
import SupabaseStatus from "@/components/SupabaseStatus";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Inbox } from "lucide-react";

export default function IndexContent() {
  const navigate = useNavigate();
  const { user, canEdit, isSuperAdmin } = useAuth();
  
  // Verificar se o usuário pode criar tickets
  const canCreateTickets = canEdit || isSuperAdmin;

  return (
    <div className="container-responsive py-8 space-y-8">
      {!isSupabaseConfigured && (
        <div className="animate-fade-in">
          <SupabaseStatus />
        </div>
      )}

      {/* Main Chat Component - Apenas para usuários com permissão */}
      {user && canCreateTickets ? (
        <div className="animate-fade-in-up">
          <TicketChat />
        </div>
      ) : user && !canCreateTickets ? (
        <Card className="card-elevated bg-muted/10 border-dashed">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Acesso Restrito
            </h3>
            <p className="text-muted-foreground mb-4">
              Você não possui permissão para criar tickets. Entre em contato com o administrador do sistema.
            </p>
            <Button 
              onClick={() => navigate('/inbox')}
              variant="outline"
              className="gap-2"
            >
              <Inbox className="h-4 w-4" />
              Ver Tickets Existentes
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}