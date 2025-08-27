import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Copy, 
  ExternalLink, 
  Link2, 
  Eye, 
  Calendar, 
  Shield, 
  Trash2,
  RefreshCw,
  Clock,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketNumber: string;
}

interface ExternalLink {
  id: string;
  token: string;
  expires_at: string | null;
  has_password: boolean;
  include_attachments: boolean;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
}

export const TicketShareModal: React.FC<TicketShareModalProps> = ({
  isOpen,
  onClose,
  ticketId,
  ticketNumber
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal');
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [existingLinks, setExistingLinks] = useState<ExternalLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  // Configurações do link externo
  const [expiryOption, setExpiryOption] = useState<'24h' | '7d' | '30d' | 'never'>('7d');
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');

  const internalLink = `${window.location.origin}/ticket/${ticketNumber}?view=modal`;

  useEffect(() => {
    if (isOpen && activeTab === 'external') {
      loadExistingLinks();
    }
  }, [isOpen, activeTab, ticketId]);

  const loadExistingLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const { data, error } = await supabase
        .from('ticket_external_links')
        .select('*')
        .eq('ticket_id', ticketId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingLinks(data || []);
    } catch (error) {
      console.error('Erro ao carregar links:', error);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Link copiado!",
        description: `${type} copiado para a área de transferência.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  const calculateExpiryDate = (option: string): Date | null => {
    if (option === 'never') return null;
    
    const now = new Date();
    switch (option) {
      case '24h':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  };

  const createExternalLink = async () => {
    if (hasPassword && !password.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma senha para proteger o link.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingLink(true);
    try {
      // Gerar token único
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_share_token');

      if (tokenError) throw tokenError;

      const expiresAt = calculateExpiryDate(expiryOption);
      let passwordHash = null;

      // Se tem senha, fazer hash
      if (hasPassword && password.trim()) {
        passwordHash = btoa(password); // Base64 simples por enquanto
      }

      // Criar link no banco
      const { data, error } = await supabase
        .from('ticket_external_links')
        .insert({
          ticket_id: ticketId,
          token: tokenData,
          created_by: user?.id,
          expires_at: expiresAt?.toISOString(),
          has_password: hasPassword,
          password_hash: passwordHash,
          include_attachments: includeAttachments
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar no histórico do ticket
      await supabase.rpc('log_sla_action', {
        p_sla_id: ticketId,
        p_acao: 'link_externo_criado',
        p_justificativa: `Link externo gerado - Validade: ${expiryOption === 'never' ? 'Sem expiração' : expiryOption}, Anexos: ${includeAttachments ? 'Inclusos' : 'Ocultos'}, Senha: ${hasPassword ? 'Sim' : 'Não'}`,
        p_dados_novos: {
          token: tokenData,
          expires_at: expiresAt?.toISOString(),
          include_attachments: includeAttachments,
          has_password: hasPassword
        }
      });

      toast({
        title: "Link criado!",
        description: "Link externo criado com sucesso.",
      });

      // Limpar formulário
      setPassword('');
      setHasPassword(false);
      
      // Recarregar links
      loadExistingLinks();

    } catch (error) {
      console.error('Erro ao criar link:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o link externo.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingLink(false);
    }
  };

  const revokeLink = async (linkId: string, token: string) => {
    try {
      const { error } = await supabase
        .from('ticket_external_links')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', linkId);

      if (error) throw error;

      // Registrar no histórico
      await supabase.rpc('log_sla_action', {
        p_sla_id: ticketId,
        p_acao: 'link_externo_revogado',
        p_justificativa: 'Link externo revogado pelo usuário',
        p_dados_anteriores: { token }
      });

      toast({
        title: "Link revogado!",
        description: "O link foi revogado e não pode mais ser acessado.",
      });

      loadExistingLinks();
    } catch (error) {
      console.error('Erro ao revogar link:', error);
      toast({
        title: "Erro",
        description: "Não foi possível revogar o link.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getExternalLink = (token: string) => {
    return `${window.location.origin}/share/${token}`;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Compartilhar Ticket #{ticketNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('internal')}
              className={cn(
                "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
                activeTab === 'internal'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Link Interno
            </button>
            <button
              onClick={() => setActiveTab('external')}
              className={cn(
                "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
                activeTab === 'external'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ExternalLink className="h-4 w-4 inline mr-2" />
              Link Externo
            </button>
          </div>

          {/* Conteúdo das abas */}
          {activeTab === 'internal' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Link para usuários logados</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Este link abrirá o modal do ticket diretamente para usuários que já estão logados no sistema.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={internalLink}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    onClick={() => copyToClipboard(internalLink, 'Link interno')}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'external' && (
            <div className="space-y-6">
              {/* Formulário para criar novo link */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Criar Link Externo
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Validade</Label>
                    <Select value={expiryOption} onValueChange={(value: any) => setExpiryOption(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24 horas</SelectItem>
                        <SelectItem value="7d">7 dias</SelectItem>
                        <SelectItem value="30d">30 dias</SelectItem>
                        <SelectItem value="never">Sem expiração</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="attachments"
                      checked={includeAttachments}
                      onCheckedChange={setIncludeAttachments}
                    />
                    <Label htmlFor="attachments">Incluir anexos</Label>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="password"
                    checked={hasPassword}
                    onCheckedChange={setHasPassword}
                  />
                  <Label htmlFor="password">Proteger com senha</Label>
                </div>

                {hasPassword && (
                  <div>
                    <Label htmlFor="password-input">Senha</Label>
                    <Input
                      id="password-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite uma senha"
                    />
                  </div>
                )}

                <Button
                  onClick={createExternalLink}
                  disabled={isCreatingLink}
                  className="w-full"
                >
                  {isCreatingLink ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Criar Link Externo
                    </>
                  )}
                </Button>
              </div>

              {/* Links existentes */}
              <div>
                <h3 className="font-medium mb-4">Links Ativos</h3>
                {isLoadingLinks ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : existingLinks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum link externo ativo.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {existingLinks.map((link) => (
                      <div key={link.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={isExpired(link.expires_at) ? "destructive" : "secondary"}>
                              {isExpired(link.expires_at) ? "Expirado" : "Ativo"}
                            </Badge>
                            {link.has_password && (
                              <Badge variant="outline">
                                <Shield className="h-3 w-3 mr-1" />
                                Com senha
                              </Badge>
                            )}
                            <Badge variant="outline">
                              <Eye className="h-3 w-3 mr-1" />
                              {link.view_count} visualizações
                            </Badge>
                          </div>
                          <Button
                            onClick={() => revokeLink(link.id, link.token)}
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Input
                            value={getExternalLink(link.token)}
                            readOnly
                            className="font-mono text-xs"
                          />
                          <Button
                            onClick={() => copyToClipboard(getExternalLink(link.token), 'Link externo')}
                            size="sm"
                            variant="outline"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Criado em {formatDate(link.created_at)}
                          </span>
                          {link.expires_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expira em {formatDate(link.expires_at)}
                            </span>
                          )}
                          {link.last_viewed_at && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Último acesso: {formatDate(link.last_viewed_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};