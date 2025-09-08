import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

export const PasswordChecker = () => {
  const [email, setEmail] = useState('matheus.moreiracosta300@gmail.com');
  const [tempPassword, setTempPassword] = useState('TempPass2025!');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSetTempPassword = async () => {
    if (!email || !tempPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { email, newPassword: tempPassword }
      });

      if (error) {
        throw error;
      }

      setTestResult(`✅ Senha definida com sucesso! 
      
📧 Email: ${email}
🔑 Senha temporária: ${tempPassword}
      
⚠️ IMPORTANTE: Comunique essa senha temporária ao usuário para que ele possa fazer login e alterá-la.`);

      toast({
        title: "Sucesso",
        description: "Senha temporária definida com sucesso",
      });

    } catch (error) {
      console.error('Error setting temp password:', error);
      setTestResult(`❌ Erro ao definir senha: ${error.message || 'Erro desconhecido'}`);
      toast({
        title: "Erro",
        description: "Erro ao definir senha temporária",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    if (!email || !tempPassword) {
      toast({
        title: "Erro", 
        description: "Preencha email e senha para testar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Salvar sessão atual
      const currentSession = await supabase.auth.getSession();
      
      // Tentar login com a senha temporária
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: tempPassword
      });

      if (error) {
        setTestResult(`❌ Teste de login falhou: ${error.message}`);
      } else {
        setTestResult(`✅ Teste de login bem-sucedido! A senha ${tempPassword} funciona para ${email}`);
        
        // Restaurar sessão anterior imediatamente
        if (currentSession.data.session) {
          await supabase.auth.setSession(currentSession.data.session);
        }
      }
    } catch (error) {
      setTestResult(`❌ Erro no teste: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Definir Senha Temporária</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Senhas são criptografadas e não podem ser "descobertas". 
            Use esta ferramenta para definir uma senha temporária conhecida.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email do usuário</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@exemplo.com"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Senha temporária</Label>
          <Input
            id="password"
            type="text"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            placeholder="Senha temporária"
          />
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={handleSetTempPassword} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Definindo...' : 'Definir Senha Temporária'}
          </Button>
          
          <Button 
            onClick={handleTestLogin} 
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? 'Testando...' : 'Testar Login'}
          </Button>
        </div>

        {testResult && (
          <Alert className={testResult.includes('✅') ? 'border-green-500' : 'border-red-500'}>
            {testResult.includes('✅') ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className="whitespace-pre-line">
              {testResult}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};