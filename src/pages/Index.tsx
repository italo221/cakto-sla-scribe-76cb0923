import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import TicketChat from "@/components/TicketChat";
import Navigation from "@/components/Navigation";
import SupabaseStatus from "@/components/SupabaseStatus";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Zap, Shield, BarChart3, LogIn, Inbox } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, canEdit, isSuperAdmin } = useAuth();
  
  // Verificar se o usuário pode criar tickets
  const canCreateTickets = canEdit || isSuperAdmin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />
      
      <div className="container-responsive py-8 space-y-8">
        {!isSupabaseConfigured && (
          <div className="animate-fade-in">
            <SupabaseStatus />
          </div>
        )}

        {/* Header Section */}
        <div className="text-center space-y-4 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Zap className="h-4 w-4" />
            Criar Novo Ticket
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gradient leading-tight py-2">
            Sistema Inteligente de Tickets
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Utilize nosso assistente de IA para criar tickets de forma rápida e precisa, 
            com classificação automática de criticidade.
          </p>

          {/* Botão de Login/Dashboard */}
          {!user ? (
            <div className="pt-4">
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="gap-2"
              >
                <LogIn className="h-4 w-4" />
                Fazer Login
              </Button>
            </div>
          ) : (
            <div className="pt-4">
              <Button 
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Ir para Dashboard
              </Button>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-elevated hover-lift">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-2">
                <MessageSquare className="h-6 w-6 text-success" />
              </div>
              <CardTitle className="text-lg">Chat Inteligente</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Converse naturalmente com nosso assistente para criar demandas
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated hover-lift">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-2">
                <Shield className="h-6 w-6 text-warning" />
              </div>
              <CardTitle className="text-lg">Classificação Automática</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                IA analisa e classifica automaticamente a criticidade da demanda
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated hover-lift">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center mb-2">
                <BarChart3 className="h-6 w-6 text-info" />
              </div>
              <CardTitle className="text-lg">Métricas Avançadas</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Acompanhe performance e cumprimento de tickets em tempo real
              </p>
            </CardContent>
          </Card>
        </div>

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
    </div>
  );
};

export default Index;
