import { Ban, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function RevokedAccessScreen() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
          <Ban className="w-10 h-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Acesso Revogado
          </h1>
          <p className="text-muted-foreground">
            Seu acesso ao sistema foi revogado pelo administrador.
          </p>
          {user?.email && (
            <p className="text-sm text-muted-foreground">
              Conta: <span className="font-medium">{user.email}</span>
            </p>
          )}
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            Se você acredita que isso foi um erro ou precisa de acesso novamente, 
            entre em contato com o administrador do sistema.
          </p>
        </div>

        <Button 
          onClick={signOut} 
          variant="outline" 
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da Conta
        </Button>
      </div>
    </div>
  );
}
