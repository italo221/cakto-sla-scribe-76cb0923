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
      // Para administradores, usar o setor do SLA
      // Para colaboradores, usar um dos setores do usuário
      let comentarioSetorId;
      
      if (isAdmin) {
        comentarioSetorId = sla.setor_id;
      } else {
        // Usuário colaborador: usar um setor que ele tem acesso
        const setorDoUsuario = userSetores.find(us => us.setor_id === sla.setor_id);
        if (setorDoUsuario) {
          comentarioSetorId = setorDoUsuario.setor_id;
        } else if (userSetores.length > 0) {
          // Se não tem acesso ao setor do SLA, usar o primeiro setor do usuário
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

      // Log da ação de mudança de status
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
      loadActionLogs(); // Recarregar logs
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

      // Log da ação
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
      loadActionLogs(); // Recarregar logs após transferência
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getActionDescription = (log: ActionLog) => {
    const descriptions: { [key: string]: string } = {
      'criacao': '📝 SLA criado',
      'mudanca_status_aberto_para_em_andamento': '▶️ Iniciado trabalho',
      'mudanca_status_em_andamento_para_resolvido': '✅ Marcado como resolvido',
      'mudanca_status_resolvido_para_fechado': '🔒 SLA fechado',
      'mudanca_status_fechado_para_aberto': '🔓 SLA reaberto',
      'transferencia_setor': '🔄 Transferido para outro setor',
      'comentario_adicionado': '💬 Comentário adicionado',
      'atribuicao_responsavel': '👤 Responsável atribuído'
    };
    
    return descriptions[log.acao] || `📋 ${log.acao.replace(/_/g, ' ')}`;
  };

  if (!sla) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {sla.ticket_number || `#${sla.id.slice(0, 8)}`} - {sla.titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
          {/* Coluna Principal - Detalhes */}
          <div className="lg:col-span-2 space-y-4 overflow-y-auto max-h-[70vh]">
            {/* Ações Rápidas */}
            <div className="flex flex-wrap gap-2 mb-4">
              {sla.status === 'aberto' && (
                <Button
                  onClick={() => handleChangeStatus('em_andamento')}
                  disabled={statusLoading}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Iniciar Trabalho
                </Button>
              )}
              {sla.status === 'em_andamento' && (
                <>
                  <Button
                    onClick={() => handleChangeStatus('resolvido')}
                    disabled={statusLoading}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Marcar como Resolvido
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleChangeStatus('aberto')}
                    disabled={statusLoading}
                    className="flex items-center gap-2"
                  >
                    <Pause className="h-4 w-4" />
                    Pausar
                  </Button>
                </>
              )}
              {sla.status === 'resolvido' && (
                <>
                  <Button
                    onClick={() => handleChangeStatus('fechado')}
                    disabled={statusLoading}
                    className="flex items-center gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Fechar SLA
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleChangeStatus('em_andamento')}
                    disabled={statusLoading}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Voltar para Andamento
                  </Button>
                </>
              )}
              {sla.status === 'fechado' && (
                <Button
                  variant="outline"
                  onClick={() => handleChangeStatus('aberto')}
                  disabled={statusLoading}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reabrir SLA
                </Button>
              )}
            </div>

            {/* Status e Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {getStatusBadge(sla.status)}
              {getCriticalityBadge(sla.nivel_criticidade)}
              {sla.tags && sla.tags.length > 0 && (
                <div className="flex gap-1">
                  {sla.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
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

            {/* Pontuações */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Pontuações de Impacto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{sla.pontuacao_financeiro}</div>
                    <div className="text-sm text-muted-foreground">Financeiro</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{sla.pontuacao_cliente}</div>
                    <div className="text-sm text-muted-foreground">Cliente</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{sla.pontuacao_reputacao}</div>
                    <div className="text-sm text-muted-foreground">Reputação</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{sla.pontuacao_urgencia}</div>
                    <div className="text-sm text-muted-foreground">Urgência</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{sla.pontuacao_operacional}</div>
                    <div className="text-sm text-muted-foreground">Operacional</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{sla.pontuacao_total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transferir Setor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Transferir para Outro Setor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {setores.map((setor) => (
                        <SelectItem key={setor.id} value={setor.id}>
                          {setor.nome} - {setor.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleTransferSetor}
                    disabled={!selectedSetor || transferLoading}
                  >
                    {transferLoading ? 'Transferindo...' : 'Transferir'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna de Comentários e Logs */}
          <div className="space-y-4 overflow-hidden">
            {/* Tabs para Comentários e Logs */}
            <div className="flex border-b bg-muted/20 rounded-t-lg">
              <button 
                className={`px-6 py-3 font-medium transition-all ${
                  activeTab === 'comments' 
                    ? 'bg-background border-b-2 border-primary text-primary shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('comments')}
              >
                <MessageSquare className="h-4 w-4 mr-2 inline-block" />
                Discussão ({comments.length})
              </button>
              <button 
                className={`px-6 py-3 font-medium transition-all ${
                  activeTab === 'history' 
                    ? 'bg-background border-b-2 border-primary text-primary shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('history')}
              >
                <History className="h-4 w-4 mr-2 inline-block" />
                Histórico ({actionLogs.length})
              </button>
            </div>
            
            {/* Conteúdo das Tabs */}
            <div className="animate-fade-in">
            {activeTab === 'comments' ? (
              <Card className="flex-1 flex flex-col min-h-[500px] max-h-[500px]">
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
                            placeholder="Escreva um comentário... Use @ para mencionar alguém"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[80px] max-h-[120px] resize-none border-0 bg-background shadow-sm focus:ring-2 focus:ring-primary/20"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" className="h-8">
                                <Smile className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8">
                                <Edit3 className="h-4 w-4" />
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
                      <div className="text-center text-muted-foreground py-12">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <h3 className="font-medium mb-2">Faça login para ver comentários</h3>
                        <p className="text-sm">Você precisa estar logado para visualizar e participar das discussões</p>
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <h3 className="font-medium mb-2">Nenhum comentário ainda</h3>
                        <p className="text-sm">Seja o primeiro a comentar neste SLA</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {comments.map((comment) => (
                          <div key={comment.id} className="group animate-fade-in">
                            <div className="flex gap-3">
                              <Avatar className="h-10 w-10 ring-2 ring-muted">
                                <AvatarFallback className="text-sm font-medium">
                                  {getInitials(comment.autor_nome)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-2">
                                {/* Cabeçalho do comentário */}
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{comment.autor_nome}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(comment.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                                
                                {/* Conteúdo do comentário */}
                                <div className="bg-muted/30 rounded-lg p-3 border">
                                  <p className="text-sm leading-relaxed">{comment.comentario}</p>
                                </div>
                                
                                {/* Ações do comentário */}
                                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                    <Heart className="h-3 w-3 mr-1" />
                                    Curtir
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                    <Reply className="h-3 w-3 mr-1" />
                                    Responder
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                    <Share className="h-3 w-3 mr-1" />
                                    Compartilhar
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              /* Histórico de Ações */
              <Card className="flex-1 flex flex-col min-h-[500px] max-h-[500px]">
                <CardContent className="flex-1 flex flex-col overflow-hidden p-4">
                  <ScrollArea className="flex-1 overflow-y-auto">
                    {!user ? (
                      <div className="text-center text-muted-foreground py-12">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <h3 className="font-medium mb-2">Faça login para ver o histórico</h3>
                        <p className="text-sm">Você precisa estar logado para visualizar o histórico de ações</p>
                      </div>
                    ) : actionLogs.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <h3 className="font-medium mb-2">Nenhuma ação registrada</h3>
                        <p className="text-sm">O histórico de ações aparecerá aqui</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {actionLogs.map((log, index) => (
                          <div key={log.id} className="relative animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                            {/* Linha de conexão */}
                            {index < actionLogs.length - 1 && (
                              <div className="absolute left-6 top-12 w-0.5 h-8 bg-gradient-to-b from-primary/50 to-muted" />
                            )}
                            
                            <div className="flex gap-4 p-4 bg-gradient-to-r from-muted/20 to-transparent rounded-lg border-l-4 border-primary/40 hover:border-primary/60 transition-colors">
                              <div className="w-3 h-3 bg-primary rounded-full mt-1 ring-4 ring-primary/20" />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">{getActionDescription(log)}</span>
                                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    {format(new Date(log.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-xs">
                                      {log.autor_email.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground">{log.autor_email}</span>
                                </div>
                                {log.justificativa && (
                                  <div className="bg-muted/40 rounded p-2 border-l-2 border-primary/30">
                                    <p className="text-sm text-foreground italic">"{log.justificativa}"</p>
                                  </div>
                                )}
                              </div>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}