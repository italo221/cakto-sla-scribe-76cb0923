import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeExternalContent } from '@/lib/sanitize';
import { 
  Eye, 
  Calendar, 
  User, 
  Building2, 
  Tag, 
  MessageSquare, 
  Paperclip,
  Lock,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketData {
  id: string;
  titulo: string;
  descricao: string;
  status: string;
  nivel_criticidade: string;
  solicitante: string;
  time_responsavel: string;
  data_criacao: string;
  updated_at: string;
  tags: string[] | null;
  anexos: any;
  responsavel_interno?: string;
  setor?: {
    nome: string;
  };
}

interface Comment {
  id: string;
  comentario: string;
  autor_nome: string;
  created_at: string;
  anexos?: any;
}

interface LinkData {
  ticket_id: string;
  include_attachments: boolean;
  has_password: boolean;
  password_hash: string | null;
  view_count: number;
}

export const SharedTicket: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isValidating, setIsValidating] = useState(true);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      validateLink();
    }
  }, [token]);

  const validateLink = async () => {
    try {
      setIsValidating(true);
      setError(null);

      // Registrar tentativa de acesso
      await supabase.rpc('log_external_link_access', {
        p_token: token,
        p_ip_address: null, // O IP será capturado no servidor se necessário
        p_user_agent: navigator.userAgent,
        p_success: false // Será atualizado se for bem-sucedido
      });

      // Validar o link
      const { data, error } = await supabase
        .rpc('validate_external_link', { p_token: token });

      if (error) throw error;

      if (!data || data.length === 0) {
        setError('Link inválido, expirado ou revogado.');
        return;
      }

      const linkInfo = data[0];
      setLinkData(linkInfo);

      if (linkInfo.has_password) {
        setIsPasswordRequired(true);
      } else {
        await loadTicketData(linkInfo.ticket_id, linkInfo.include_attachments);
      }

    } catch (error) {
      console.error('Erro ao validar link:', error);
      setError('Erro ao validar o link. Tente novamente.');
    } finally {
      setIsValidating(false);
    }
  };

  const verifyPassword = async () => {
    if (!password.trim() || !linkData) return;

    setIsVerifyingPassword(true);
    try {
      // Server-side password verification via edge function
      const { data, error } = await supabase.functions.invoke('verify-ticket-link-password', {
        body: { token, password }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao verificar senha');
      }

      if (!data.valid) {
        toast({
          title: "Senha incorreta",
          description: data.error || "A senha informada está incorreta.",
          variant: "destructive",
        });
        return;
      }

      // Password verified server-side - load ticket data
      setIsPasswordRequired(false);
      await loadTicketData(data.ticket_id, data.include_attachments);

    } catch (error: any) {
      console.error('Erro ao verificar senha:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao verificar a senha.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const loadTicketData = async (ticketId: string, includeAttachments: boolean) => {
    setIsLoadingTicket(true);
    try {
      // Carregar dados do ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('sla_demandas')
        .select(`
          *,
          setor:setores(nome)
        `)
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;
      setTicketData(ticket);

      // Carregar comentários
      const { data: commentsData, error: commentsError } = await supabase
        .from('sla_comentarios_internos')
        .select('id, comentario, autor_nome, created_at, anexos')
        .eq('sla_id', ticketId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;
      
      // Filtrar anexos dos comentários se necessário
      const processedComments = commentsData?.map(comment => ({
        ...comment,
        anexos: includeAttachments ? comment.anexos : null
      })) || [];

      setComments(processedComments);

      // Atualizar log de acesso como bem-sucedido
      await supabase.rpc('log_external_link_access', {
        p_token: token,
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
        p_success: true
      });

    } catch (error) {
      console.error('Erro ao carregar dados do ticket:', error);
      setError('Erro ao carregar os dados do ticket.');
    } finally {
      setIsLoadingTicket(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'aberto': { label: 'Aberto', variant: 'destructive' as const },
      'em_andamento': { label: 'Em Andamento', variant: 'default' as const },
      'resolvido': { label: 'Resolvido', variant: 'secondary' as const },
      'fechado': { label: 'Fechado', variant: 'outline' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: 'outline' as const };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCriticalityBadge = (level: string) => {
    const levelConfig = {
      'P0': { label: 'P0 - Crítico', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
      'P1': { label: 'P1 - Alto', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
      'P2': { label: 'P2 - Médio', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
      'P3': { label: 'P3 - Baixo', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    };

    const config = levelConfig[level as keyof typeof levelConfig] || 
                  { label: level, className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' };

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const renderCommentContent = (content: string) => {
    // Use secure sanitization for external content
    return sanitizeExternalContent(content);
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Validando link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Acesso Negado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
              variant="outline"
            >
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPasswordRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Acesso Protegido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Este link está protegido por senha. Digite a senha para continuar.
            </p>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Digite a senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
              />
              <Button 
                onClick={verifyPassword}
                disabled={isVerifyingPassword || !password.trim()}
                className="w-full"
              >
                {isVerifyingPassword ? 'Verificando...' : 'Acessar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingTicket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Carregando ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Ticket não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Ticket Compartilhado</h1>
              <Badge variant="outline" className="hidden sm:flex">
                <Eye className="h-3 w-3 mr-1" />
                Somente leitura
              </Badge>
            </div>
            <Button 
              onClick={() => window.open(window.location.origin, '_blank')}
              variant="outline"
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ir para o sistema
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-2xl">{ticketData.titulo}</CardTitle>
              <div className="flex flex-wrap gap-2">
                {getStatusBadge(ticketData.status)}
                {getCriticalityBadge(ticketData.nivel_criticidade)}
                {ticketData.tags?.includes("info-incompleta") && (
                  <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-600">
                    Info incompleta
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Solicitante:</span>
                <span className="text-sm">{ticketData.solicitante}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Time:</span>
                <span className="text-sm">{ticketData.time_responsavel}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Criado em:</span>
                <span className="text-sm">{formatDate(ticketData.data_criacao)}</span>
              </div>

              {ticketData.updated_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Atualizado em:</span>
                  <span className="text-sm">{formatDate(ticketData.updated_at)}</span>
                </div>
              )}

              {ticketData.responsavel_interno && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Responsável:</span>
                  <span className="text-sm">{ticketData.responsavel_interno}</span>
                </div>
              )}

              {ticketData.setor?.nome && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Setor:</span>
                  <span className="text-sm">{ticketData.setor.nome}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {ticketData.tags && ticketData.tags.filter(tag => tag !== "info-incompleta").length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </label>
                <div className="flex flex-wrap gap-1">
                  {ticketData.tags
                    .filter(tag => tag !== "info-incompleta")
                    .map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Descrição */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Descrição</label>
              <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{ticketData.descricao}</p>
              </div>
            </div>

            {/* Anexos do ticket */}
            {linkData?.include_attachments && ticketData.anexos && ticketData.anexos.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <Paperclip className="h-4 w-4" />
                  Anexos do Ticket
                </label>
                <div className="space-y-2">
                  {ticketData.anexos.map((anexo, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{anexo.name || `Anexo ${index + 1}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comentários */}
            {comments.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
                  <MessageSquare className="h-4 w-4" />
                  Comentários ({comments.length})
                </label>
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{comment.autor_nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      
                      <div 
                        className="text-sm prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: renderCommentContent(comment.comentario) 
                        }}
                      />

                      {linkData?.include_attachments && comment.anexos && comment.anexos.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2 mb-2">
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Anexos:</span>
                          </div>
                          <div className="space-y-1">
                            {comment.anexos.map((anexo: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                <Paperclip className="h-3 w-3 text-muted-foreground" />
                                <span>{anexo.name || `Anexo ${index + 1}`}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!linkData?.include_attachments && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Os anexos não estão disponíveis neste compartilhamento.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};