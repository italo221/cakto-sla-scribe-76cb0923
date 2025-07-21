import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { 
  MessageSquare, 
  Send, 
  ArrowRightLeft, 
  Calendar, 
  User, 
  Building, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  X,
  FileText,
  Tag,
  Target,
  ThumbsUp,
  MoreHorizontal,
  Play,
  Pause,
  Square,
  RotateCcw,
  History,
  Reply,
  Heart,
  Share,
  Edit3,
  Smile
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SLACountdown } from "@/components/SLACountdown";

interface SLA {
  id: string;
  ticket_number: string;
  titulo: string;
  time_responsavel: string;
  solicitante: string;
  descricao: string;
  status: string;
  nivel_criticidade: string;
  pontuacao_total: number;
  pontuacao_financeiro: number;
  pontuacao_cliente: number;
  pontuacao_reputacao: number;
  pontuacao_urgencia: number;
  pontuacao_operacional: number;
  data_criacao: string;
  observacoes?: string;
  tags?: string[];
  setor_id?: string;
  responsavel_interno?: string;
  prazo_interno?: string;
  prioridade_operacional?: string;
}

interface Comment {
  id: string;
  comentario: string;
  autor_nome: string;
  autor_id: string;
  setor_id: string;
  created_at: string;
}

interface Setor {
  id: string;
  nome: string;
  descricao: string;
}

interface SLADetailModalProps {
  sla: SLA | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface ActionLog {
  id: string;
  acao: string;
  autor_email: string;
  timestamp: string;
  justificativa?: string;
  setor_origem_id?: string;
  setor_destino_id?: string;
  dados_anteriores?: any;
  dados_novos?: any;
}

export default function SLADetailModal({ sla, isOpen, onClose, onUpdate }: SLADetailModalProps) {
  const { user, isAdmin, setores: userSetores } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [setores, setSetores] = useState<Setor[]>([]);
  const [selectedSetor, setSelectedSetor] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const { toast } = useToast();

  useEffect(() => {
    if (sla && isOpen && user) {
      loadComments();
      loadActionLogs();
      loadSetores();
    }
  }, [sla, isOpen, user]);

  const loadComments = async () => {
    if (!sla) return;
    
    try {
      const { data, error } = await supabase
        .from('sla_comentarios_internos')
        .select('*')
        .eq('sla_id', sla.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
    }
  };

  const loadActionLogs = async () => {
    if (!sla) return;
    
    try {
      const { data, error } = await supabase
        .from('sla_action_logs')
        .select('*')
        .eq('sla_id', sla.id)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setActionLogs(data || []);
    } catch (error) {
      console.error('Erro ao carregar logs de ação:', error);
    }
  };

  const loadSetores = async () => {
    try {
      const { data, error } = await supabase
        .from('setores')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setSetores(data || []);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    }
  };

  const handleAddComment = async () => {
    if (!sla || !newComment.trim() || !user) return;

    setCommentLoading(true);
    try {
      let comentarioSetorId;
      
      if (isAdmin) {
        comentarioSetorId = sla.setor_id;
      } else {
        const setorDoUsuario = userSetores.find(us => us.setor_id === sla.setor_id);
        if (setorDoUsuario) {
          comentarioSetorId = setorDoUsuario.setor_id;
        } else if (userSetores.length > 0) {
          comentarioSetorId = userSetores[0].setor_id;
        }
      }
      
      if (!comentarioSetorId) {
        toast({
          title: "Erro",
          description: "Você não tem permissão para comentar neste SLA.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.rpc('add_sla_comment', {
        p_sla_id: sla.id,
        p_setor_id: comentarioSetorId,
        p_comentario: newComment.trim()
      });

      if (error) throw error;

      toast({
        title: "Comentário publicado",
        description: "Seu comentário foi adicionado com sucesso.",
      });

      setNewComment('');
      loadComments();
    } catch (error: any) {
      toast({
        title: "Erro ao publicar comentário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCommentLoading(false);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!sla) return;

    setStatusLoading(true);
    try {
      const oldStatus = sla.status;
      
      const { error } = await supabase
        .from('sla_demandas')
        .update({ status: newStatus })
        .eq('id', sla.id);

      if (error) throw error;

      await supabase.rpc('log_sla_action', {
        p_sla_id: sla.id,
        p_acao: `mudanca_status_${oldStatus}_para_${newStatus}`,
        p_justificativa: `Status alterado de "${oldStatus}" para "${newStatus}"`,
        p_dados_anteriores: { status: oldStatus },
        p_dados_novos: { status: newStatus }
      });

      toast({
        title: "Status alterado",
        description: `SLA ${newStatus === 'fechado' ? 'fechado' : 'alterado'} com sucesso.`,
      });

      onUpdate();
      loadActionLogs();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleTransferSetor = async () => {
    if (!sla || !selectedSetor) return;

    setTransferLoading(true);
    try {
      const { error } = await supabase
        .from('sla_demandas')
        .update({ setor_id: selectedSetor })
        .eq('id', sla.id);

      if (error) throw error;

      await supabase.rpc('log_sla_action', {
        p_sla_id: sla.id,
        p_acao: 'transferencia_setor',
        p_setor_destino_id: selectedSetor,
        p_justificativa: 'Transferência via interface de detalhes'
      });

      toast({
        title: "SLA transferido",
        description: "O SLA foi transferido para o setor selecionado.",
      });

      onUpdate();
      loadActionLogs();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao transferir SLA",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'aberto': { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
      'em_andamento': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      'resolvido': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      'fechado': { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: X }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.aberto;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon size={12} />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getCriticalityBadge = (criticality: string) => {
    const criticalityConfig = {
      'P0': { color: 'bg-red-500 text-white', label: 'Crítico' },
      'P1': { color: 'bg-orange-500 text-white', label: 'Alto' },
      'P2': { color: 'bg-yellow-500 text-white', label: 'Médio' },
      'P3': { color: 'bg-blue-500 text-white', label: 'Baixo' }
    };

    const config = criticalityConfig[criticality as keyof typeof criticalityConfig] || criticalityConfig.P3;

    return (
      <Badge className={config.color}>
        {criticality} - {config.label}
      </Badge>
    );
  };

  if (!sla) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {sla.ticket_number || `#${sla.id.slice(0, 8)}`} - {sla.titulo}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <SLACountdown 
                dataCriacao={sla.data_criacao}
                criticidade={sla.nivel_criticidade}
                status={sla.status}
              />
              {getStatusBadge(sla.status)}
              {getCriticalityBadge(sla.nivel_criticidade)}
            </div>
          </div>
          
          {/* Tags logo abaixo do título */}
          {sla.tags && sla.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sla.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Ações de Status */}
          <div className="flex gap-2 mb-6">
            {sla.status === 'aberto' && (
              <Button 
                variant="default" 
                onClick={() => handleChangeStatus('em_andamento')}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Iniciar
              </Button>
            )}
            
            {sla.status === 'em_andamento' && (
              <>
                <Button 
                  variant="default" 
                  onClick={() => handleChangeStatus('resolvido')}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Resolver
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleChangeStatus('pausado')}
                  className="gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Pausar
                </Button>
              </>
            )}
            
            {sla.status === 'pausado' && (
              <Button 
                variant="default" 
                onClick={() => handleChangeStatus('em_andamento')}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Retomar
              </Button>
            )}
            
            {sla.status === 'resolvido' && (
              <>
                <Button 
                  variant="default" 
                  onClick={() => handleChangeStatus('fechado')}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Fechar SLA
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleChangeStatus('em_andamento')}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reabrir SLA
                </Button>
              </>
            )}
          </div>

          {/* Tabs de Discussão e Histórico */}
          <div className="flex gap-4 border-b mb-6">
            <Button
              variant={activeTab === 'comments' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('comments')}
              className="flex items-center gap-2 px-4 py-2 rounded-b-none"
            >
              <MessageSquare className="h-4 w-4" />
              Discussão
              {comments.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {comments.length}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === 'history' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('history')}
              className="flex items-center gap-2 px-4 py-2 rounded-b-none"
            >
              <History className="h-4 w-4" />
              Histórico
              {actionLogs.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {actionLogs.length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Conteúdo das Tabs */}
          <div className="mb-6">
            {activeTab === 'comments' ? (
              <Card className="flex-1 flex flex-col min-h-[400px] max-h-[400px]">
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                  {/* Área de Novo Comentário */}
                  {user && (
                    <div className="p-4 border-b bg-muted/10 flex-shrink-0">
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {user.user_metadata?.nome_completo?.substring(0, 2)?.toUpperCase() || 'EU'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-3 min-w-0">
                          <Textarea
                            placeholder="Escreva um comentário..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[60px] max-h-[100px] resize-none border-0 bg-background shadow-sm focus:ring-2 focus:ring-primary/20"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" className="h-8">
                                <Smile className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button 
                              onClick={handleAddComment}
                              disabled={!newComment.trim() || commentLoading}
                              size="sm"
                              className="h-8"
                            >
                              {commentLoading ? (
                                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              {commentLoading ? 'Publicando...' : 'Publicar'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista de Comentários */}
                  <ScrollArea className="flex-1 p-4 overflow-y-auto">
                    {!user ? (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-30" />
                        <h3 className="font-medium mb-2">Faça login para ver comentários</h3>
                        <p className="text-sm">Você precisa estar logado para visualizar discussões</p>
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-30" />
                        <h3 className="font-medium mb-2">Nenhum comentário ainda</h3>
                        <p className="text-sm">Seja o primeiro a comentar neste SLA</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3 group animate-fade-in">
                            <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                              <AvatarFallback className="text-xs">
                                {comment.autor_nome.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{comment.autor_nome}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(comment.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed break-words">{comment.comentario}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex-1 flex flex-col min-h-[400px] max-h-[400px]">
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                  <ScrollArea className="flex-1 p-4 overflow-y-auto">
                    {actionLogs.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <History className="h-8 w-8 mx-auto mb-3 opacity-30" />
                        <h3 className="font-medium mb-2">Nenhuma ação registrada</h3>
                        <p className="text-sm">As ações realizadas neste SLA aparecerão aqui</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {actionLogs.map((log) => (
                          <div key={log.id} className="flex gap-3 pb-3 border-b border-border/30 last:border-0 animate-fade-in">
                            <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{log.acao}</span>
                                <span className="text-xs text-muted-foreground">
                                  por {log.autor_email}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">
                                {format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                              {log.justificativa && (
                                <p className="text-sm mt-1 text-muted-foreground italic">
                                  "{log.justificativa}"
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Solicitante</label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4" />
                    <span>{sla.solicitante}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Time Responsável</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building className="h-4 w-4" />
                    <span>{sla.time_responsavel}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Criação</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(sla.data_criacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Responsável Interno</label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4" />
                    <span>{sla.responsavel_interno || 'Não atribuído'}</span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <p className="mt-1 text-sm">{sla.descricao}</p>
              </div>
              
              {sla.observacoes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Observações</label>
                  <p className="mt-1 text-sm">{sla.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};