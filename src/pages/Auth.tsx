import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageSquare, Shield, Users, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [userType, setUserType] = useState<"administrador_master" | "colaborador_setor">("colaborador_setor");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se já está logado
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkAuth();
  }, [navigate]);

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue mesmo se o signOut falhar
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          setError("E-mail ou senha incorretos. Verifique suas credenciais.");
        } else {
          setError(error.message);
        }
        return;
      }

      if (data.user) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o sistema...",
        });
        
        // Force page reload para garantir estado limpo
        window.location.href = '/';
      }
    } catch (error: any) {
      setError("Erro inesperado. Tente novamente.");
      console.error("Erro no login:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue mesmo se o signOut falhar
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome_completo: nomeCompleto,
            user_type: userType
          }
        }
      });

      if (error) {
        if (error.message === "User already registered") {
          setError("Este e-mail já está cadastrado. Faça login ou use outro e-mail.");
        } else {
          setError(error.message);
        }
        return;
      }

      if (data.user) {
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Você pode fazer login agora.",
        });
        
        // Limpar formulário
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setNomeCompleto("");
        setUserType("colaborador_setor");
        
        // Mudar para aba de login
        const loginTab = document.querySelector('[data-state="inactive"]') as HTMLElement;
        if (loginTab) {
          loginTab.click();
        }
      }
    } catch (error: any) {
      setError("Erro inesperado. Tente novamente.");
      console.error("Erro no cadastro:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Sistema SLA</h1>
          </div>
          <p className="text-muted-foreground">
            Sistema de gerenciamento de Service Level Agreement
          </p>
        </div>

        <Card className="border-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Acesso ao Sistema</CardTitle>
            <CardDescription className="text-center">
              Faça login ou cadastre-se para continuar
            </CardDescription>
            
            {/* Credenciais de Teste */}
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>🔑 Credenciais de Teste:</strong><br />
                E-mail: <code className="bg-muted px-1 rounded">teste@gmail.com</code><br />
                Senha: <code className="bg-muted px-1 rounded">123456</code><br />
                <small className="text-muted-foreground">Este usuário já é administrador master</small>
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Cadastro</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="teste@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="123456"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>


                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    Use as credenciais de teste acima ou crie uma nova conta
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Seu nome completo"
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo-usuario">Tipo de Usuário</Label>
                    <Select value={userType} onValueChange={(value: any) => setUserType(value)} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="colaborador_setor">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Colaborador de Setor
                          </div>
                        </SelectItem>
                        <SelectItem value="administrador_master">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Administrador Master
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Senha</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Digite a senha novamente"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>


                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      "Cadastrar"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <strong>Colaborador de Setor</strong>
              </div>
              <p className="text-muted-foreground">
                Acesso limitado aos SLAs do próprio setor. Pode gerenciar demandas e adicionar comentários internos.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-primary" />
                <strong>Administrador Master</strong>
              </div>
              <p className="text-muted-foreground">
                Acesso completo ao sistema. Pode gerenciar setores, usuários e todos os SLAs.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;