import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Key, 
  Copy, 
  Clock, 
  User, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Search,
  RefreshCw,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Profile {
  user_id: string;
  email: string;
  nome_completo: string;
  ativo: boolean;
  role: string;
}

interface RecoveryToken {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  invalidated_at: string | null;
  created_by: string;
  user_profile?: Profile;
  creator_profile?: Profile;
}

interface AuditLog {
  id: string;
  token_id: string | null;
  user_id: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  ip_address: unknown;
  user_agent: string | null;
  details: unknown;
  created_at: string;
}

export default function AdminPasswordRecovery() {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [tokens, setTokens] = useState<RecoveryToken[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [expirationMinutes, setExpirationMinutes] = useState('15');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [tokenExpiry, setTokenExpiry] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load active users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, email, nome_completo, ativo, role')
        .eq('ativo', true)
        .order('nome_completo');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Load recent tokens
      const { data: tokensData, error: tokensError } = await supabase
        .from('password_recovery_tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (tokensError) {
        console.warn('Could not load tokens:', tokensError);
      } else {
        setTokens(tokensData || []);
      }

      // Load audit logs
      const { data: auditData, error: auditError } = await supabase
        .from('password_recovery_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditError) {
        console.warn('Could not load audit logs:', auditError);
      } else {
        setAuditLogs(auditData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!selectedUser) {
      toast.error('Selecione um usuário');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc('generate_recovery_token', {
        p_target_user_id: selectedUser.user_id,
        p_expiration_minutes: parseInt(expirationMinutes)
      });

      if (error) throw error;

      const result = data as { success: boolean; token?: string; expires_at?: string; error?: string };

      if (!result.success) {
        toast.error(result.error || 'Erro ao gerar token');
        return;
      }

      setGeneratedToken(result.token || null);
      setTokenExpiry(result.expires_at || null);
      setShowTokenDialog(true);
      loadData(); // Refresh tokens list

      toast.success('Token gerado com sucesso!');
    } catch (error: unknown) {
      console.error('Error generating token:', error);
      toast.error('Erro ao gerar token de recuperação');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const filteredUsers = users.filter(user => 
    user.nome_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'token_created':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Token Criado</Badge>;
      case 'token_used':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Token Usado</Badge>;
      case 'token_expired':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Expirado</Badge>;
      case 'token_invalidated':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Invalidado</Badge>;
      case 'attempt_failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Tentativa Falhou</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getTokenStatus = (token: RecoveryToken) => {
    if (token.used_at) {
      return <Badge className="bg-green-100 text-green-700">Usado</Badge>;
    }
    if (token.invalidated_at) {
      return <Badge className="bg-orange-100 text-orange-700">Invalidado</Badge>;
    }
    if (new Date(token.expires_at) < new Date()) {
      return <Badge className="bg-yellow-100 text-yellow-700">Expirado</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700">Ativo</Badge>;
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Acesso restrito a Super Administradores</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Recuperação de Conta
          </CardTitle>
          <CardDescription>
            Gere tokens de recuperação para usuários que esqueceram a senha. 
            O token é de uso único e expira em poucos minutos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="generate">Gerar Token</TabsTrigger>
              <TabsTrigger value="tokens">Tokens Recentes</TabsTrigger>
              <TabsTrigger value="audit">Auditoria</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-6 pt-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Buscar Usuário</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Digite o nome ou email do usuário..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {searchQuery && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Nenhum usuário encontrado
                      </div>
                    ) : (
                      filteredUsers.slice(0, 10).map((user) => (
                        <button
                          key={user.user_id}
                          onClick={() => {
                            setSelectedUser(user);
                            setSearchQuery('');
                          }}
                          className="w-full p-3 text-left hover:bg-muted/50 flex items-center justify-between border-b last:border-b-0"
                        >
                          <div>
                            <p className="font-medium">{user.nome_completo}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <Badge variant="outline">{user.role}</Badge>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {selectedUser && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <User className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{selectedUser.nome_completo}</p>
                            <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label>Tempo de Expiração</Label>
                  <Select value={expirationMinutes} onValueChange={setExpirationMinutes}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 minutos</SelectItem>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    O token será invalidado após este período
                  </p>
                </div>

                <Button
                  onClick={handleGenerateToken}
                  disabled={!selectedUser || generating}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Gerar Token de Recuperação
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">Atenção</p>
                    <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                      O token será exibido apenas uma vez. Copie e envie ao usuário por um canal seguro.
                      Todas as ações são registradas para auditoria.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tokens" className="pt-4">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Criado Em</TableHead>
                      <TableHead>Expira Em</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum token registrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      tokens.map((token) => {
                        const targetUser = users.find(u => u.user_id === token.user_id);
                        return (
                          <TableRow key={token.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{targetUser?.nome_completo || 'Usuário'}</p>
                                <p className="text-xs text-muted-foreground">{targetUser?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(token.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {format(new Date(token.expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>{getTokenStatus(token)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="audit" className="pt-4">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Executor</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          Nenhum registro de auditoria
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell>
                            <p className="text-sm">{log.actor_email || 'Sistema'}</p>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">{String(log.ip_address || '-')}</code>
                          </TableCell>
                          <TableCell>
                            {log.details && (
                              <code className="text-xs block max-w-[200px] truncate">
                                {JSON.stringify(log.details)}
                              </code>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Token Generated Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Token Gerado com Sucesso
            </DialogTitle>
            <DialogDescription>
              Copie o token abaixo e envie ao usuário por um canal seguro.
              Este token só será exibido uma vez.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Token de Recuperação</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedToken || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => generatedToken && copyToClipboard(generatedToken)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {tokenExpiry && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Expira em: {format(new Date(tokenExpiry), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Instruções para o usuário:</strong><br />
                Acesse a página de recuperação de senha e insira o token junto com a nova senha.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowTokenDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
