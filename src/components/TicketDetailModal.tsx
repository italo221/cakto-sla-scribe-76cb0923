import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { FormattedText } from "@/components/ui/formatted-text";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import CommentEditModal from "@/components/CommentEditModal";
import CommentReactions from "@/components/CommentReactions";
import CommentDeleteModal from "@/components/CommentDeleteModal";
import { MessageSquare, Send, ArrowRightLeft, Calendar, User, Building, Clock, AlertCircle, CheckCircle, X, FileText, Target, ThumbsUp, MoreHorizontal, Play, Pause, Square, RotateCcw, History, Reply, Heart, Share, Edit3, Smile, Paperclip, Download, Trash2, ExternalLink, Search, ChevronUp, ChevronDown } from "lucide-react";
import TicketAttachments from "@/components/TicketAttachments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { extractCleanTextWithMentions, formatMentionsForDisplay } from "@/utils/textFormatting";
import { extractMentions, findMentionedUsers, notifyUserMention } from "@/utils/notificationService";

interface SLA {
  id: string;
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
  setor_id?: string;
  tags?: string[];
  ticket_number?: string;
  responsavel_interno?: string;
  prazo_interno?: string;
  prioridade_operacional?: string;
  link_referencia?: string;
  anexos?: string;
}

interface Comment {
  id: string;
  sla_id: string;
  setor_id: string;
  autor_id: string;
  autor_nome: string;
  comentario: string;
  created_at: string;
  updated_at?: string;
  anexos?: Array<{
    nome: string;
    url: string;
    tamanho: number;
    tipo: string;
  }>;
}

interface SLADetailModalProps {
  sla: SLA | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  setSelectedSLA?: (sla: SLA | null) => void;
}

interface Setor {
  id: string;
  nome: string;
  ativo: boolean;
}

interface ActionLog {
  id: string;
  sla_id: string;
  autor_id: string;
  acao: string;
  autor_email: string;
  timestamp: string;
  justificativa?: string;
  setor_origem_id?: string;
  setor_destino_id?: string;
  dados_anteriores?: any;
  dados_novos?: any;
}

export default function SLADetailModal({
  sla,
  isOpen,
  onClose,
  onUpdate,
  setSelectedSLA
}: SLADetailModalProps) {
  const {
    user,
    isAdmin,
    canEdit,
    isSuperAdmin
  } = useAuth();
  const {
    userSetores,
    getSetorValidationMessage,
    getStartResolveValidationMessage
  } = usePermissions();
  
  const [currentSLA, setCurrentSLA] = useState<SLA | null>(sla);
  const [comments, setComments] = useState<Comment[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [setores, setSetores] = useState<Setor[]>([]);
  const [selectedSetor, setSelectedSetor] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [attachments, setAttachments] = useState<FileList | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCommentForEdit, setSelectedCommentForEdit] = useState<Comment | null>(null);
  const [selectedCommentForDelete, setSelectedCommentForDelete] = useState<Comment | null>(null);
  const [editCommentModalOpen, setEditCommentModalOpen] = useState(false);
  const [deleteCommentModalOpen, setDeleteCommentModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    setCurrentSLA(sla);
  }, [sla]);

  useEffect(() => {
    if (currentSLA && isOpen) {
      loadComments();
      loadActionLogs();
      loadSetores();
    }
  }, [currentSLA, isOpen]);

  const loadComments = async () => {
    if (!currentSLA) return;
    try {
      const { data, error } = await supabase
        .from('sla_comentarios_internos')
        .select('*')
        .eq('sla_id', currentSLA.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setComments((data || []).map(comment => ({
        ...comment,
        anexos: comment.anexos ? (Array.isArray(comment.anexos) ? comment.anexos as Array<{
          nome: string;
          url: string;
          tamanho: number;
          tipo: string;
        }> : []) : []
      })));
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
    }
  };

  const loadActionLogs = async () => {
    if (!currentSLA) return;
    try {
      const { data, error } = await supabase
        .from('sla_action_logs')
        .select('*')
        .eq('sla_id', currentSLA.id)
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
    if (!currentSLA || !newComment.trim() || !user) return;

    const setorValidationMessage = getSetorValidationMessage();
    if (setorValidationMessage) {
      toast({
        title: "Acesso negado",
        description: setorValidationMessage,
        variant: "destructive",
      });
      return;
    }

    if (!canEdit && !isSuperAdmin) {
      toast({
        title: "Erro",
        description: "Você não tem permissão para comentar em tickets.",
        variant: "destructive",
      });
      return;
    }

    setCommentLoading(true);
    try {
      let comentarioSetorId;
      if (isSuperAdmin) {
        comentarioSetorId = currentSLA.setor_id || (userSetores.length > 0 ? userSetores[0].setor_id : null);
      } else if (canEdit) {
        comentarioSetorId = currentSLA.setor_id || (userSetores.length > 0 ? userSetores[0].setor_id : null);
      } else {
        const setorDoUsuario = userSetores.find(us => us.setor_id === currentSLA.setor_id);
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

      const cleanComment = extractCleanTextWithMentions(newComment.trim());

      const { data: commentData, error: commentError } = await supabase
        .from('sla_comentarios_internos')
        .insert({
          sla_id: currentSLA.id,
          setor_id: comentarioSetorId,
          autor_id: user.id,
          autor_nome: user.user_metadata?.nome_completo || user.email || 'Usuário',
          comentario: cleanComment
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Processar menções e enviar notificações
      try {
        const mentions = extractMentions(cleanComment);
        if (mentions.length > 0) {
          const mentionedUsers = await findMentionedUsers(mentions);
          const mentionerName = user.user_metadata?.nome_completo || user.email || 'Usuário';
          
          for (const mentionedUser of mentionedUsers) {
            if (mentionedUser.user_id !== user.id) {
              await notifyUserMention(
                mentionedUser.user_id,
                mentionerName,
                currentSLA.id,
                currentSLA.titulo,
                commentData.id
              );
            }
          }
        }
      } catch (error) {
        console.error('Erro ao processar menções:', error);
      }
      
      toast({
        title: "Comentário publicado",
        description: "Comentário adicionado com sucesso."
      });
      setNewComment('');
      loadComments();
    } catch (error: any) {
      toast({
        title: "Erro ao publicar comentário",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCommentLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'aberto': { color: 'destructive', label: 'Aberto', icon: AlertCircle },
      'em_andamento': { color: 'default', label: 'Em Andamento', icon: Clock },
      'resolvido': { color: 'secondary', label: 'Resolvido', icon: CheckCircle },
      'fechado': { color: 'outline', label: 'Fechado', icon: X }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.aberto;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.color as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getCriticalityBadge = (criticidade: string) => {
    const criticalityConfig = {
      'P0': { color: 'destructive', label: 'Crítico' },
      'P1': { color: 'destructive', label: 'Alto' },
      'P2': { color: 'default', label: 'Médio' },
      'P3': { color: 'secondary', label: 'Baixo' }
    };
    
    const config = criticalityConfig[criticidade as keyof typeof criticalityConfig] || criticalityConfig.P3;
    
    return (
      <Badge variant={config.color as any}>
        {config.label} ({criticidade})
      </Badge>
    );
  };

  if (!currentSLA || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {currentSLA.ticket_number || `#${currentSLA.id.slice(0, 8)}`} - {currentSLA.titulo}
            </DialogTitle>
          </div>

          <div className="flex flex-wrap gap-2">
            {getStatusBadge(currentSLA.status)}
            {getCriticalityBadge(currentSLA.nivel_criticidade)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tabs de Discussão e Histórico */}
          <div className="flex gap-4 border-b mb-6">
            <Button
              variant={activeTab === 'comments' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('comments')}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Discussão ({comments.length})
            </Button>
            <Button
              variant={activeTab === 'history' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('history')}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              Histórico ({actionLogs.length})
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
                        <div className="flex-1 space-y-3">
                          <RichTextEditor
                            value={newComment}
                            onChange={setNewComment}
                            placeholder="Digite seu comentário... (use @ para mencionar alguém)"
                            className="min-h-[80px]"
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">
                              Suporte a formatação de texto, emojis e menções
                            </span>
                            <Button
                              onClick={handleAddComment}
                              disabled={!newComment.trim() || commentLoading}
                              size="sm"
                              className="gap-2"
                            >
                              <Send className="h-4 w-4" />
                              {commentLoading ? 'Enviando...' : 'Comentar'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista de Comentários */}
                  <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 overflow-y-auto">
                    <div className="space-y-4 pb-4">
                      {/* Comentário inicial - Descrição do SLA - SEMPRE EXIBIDO */}
                      <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                            <AvatarFallback className="text-xs bg-blue-600 text-white">
                              {currentSLA.solicitante.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-sm text-blue-900 dark:text-blue-100">
                                {currentSLA.solicitante}
                              </span>
                              <span className="text-xs text-blue-600 dark:text-blue-300">
                                {format(new Date(currentSLA.data_criacao), "dd/MM/yyyy 'às' HH:mm", {
                                  locale: ptBR
                                })}
                              </span>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                  Descrição Inicial do SLA
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                                {currentSLA.descricao}
                              </p>
                              {currentSLA.observacoes && (
                                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Observações:</p>
                                  <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                                    {currentSLA.observacoes}
                                  </p>
                                </div>
                              )}
                              
                              {/* Anexos e Links na descrição inicial */}
                              {(currentSLA.link_referencia || currentSLA.anexos) && (
                                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                                  <TicketAttachments 
                                    linkReferencia={currentSLA.link_referencia}
                                    anexos={currentSLA.anexos}
                                    className="[&_h4]:text-blue-700 [&_h4]:dark:text-blue-300 [&_h4]:text-xs [&_h4]:font-medium [&_.bg-muted\/50]:bg-blue-100/50 [&_.bg-muted\/50]:dark:bg-blue-900/20 [&_.border]:border-blue-200 [&_.border]:dark:border-blue-700"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                       {/* Comentários da discussão */}
                       {comments.length > 0 ? (
                         comments.map(comment => (
                           <div key={comment.id} className="flex gap-3 group">
                             <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                               <AvatarFallback className="text-xs">
                                 {comment.autor_nome.substring(0, 2).toUpperCase()}
                               </AvatarFallback>
                             </Avatar>
                             <div className="flex-1 min-w-0">
                               <div className="flex items-center justify-between mb-1">
                                 <div className="flex items-center gap-2">
                                   <span className="font-medium text-sm">{comment.autor_nome}</span>
                                   <span className="text-xs text-muted-foreground">
                                     {format(new Date(comment.created_at), "dd/MM 'às' HH:mm", {
                                       locale: ptBR
                                     })}
                                   </span>
                                 </div>
                                 {(canEdit && user?.id === comment.autor_id) || isSuperAdmin ? (
                                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     {canEdit && user?.id === comment.autor_id && (
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         className="h-6 px-2 text-xs"
                                         onClick={() => {
                                           setSelectedCommentForEdit(comment);
                                           setEditCommentModalOpen(true);
                                         }}
                                       >
                                         <Edit3 className="h-3 w-3" />
                                       </Button>
                                     )}
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                                       onClick={() => {
                                         setSelectedCommentForDelete(comment);
                                         setDeleteCommentModalOpen(true);
                                       }}
                                     >
                                       <Trash2 className="h-3 w-3" />
                                     </Button>
                                   </div>
                                 ) : null}
                               </div>
                               <div className="space-y-2">
                                 <FormattedText 
                                   text={comment.comentario} 
                                   className="text-sm leading-relaxed break-words" 
                                 />
                                 
                                 {/* Reações do comentário */}
                                 <CommentReactions 
                                   commentId={comment.id} 
                                   className="mt-2" 
                                 />
                               </div>
                             </div>
                           </div>
                         ))
                       ) : (
                         <div className="text-center text-muted-foreground py-6 border-t border-border/30 mt-4">
                           <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-30" />
                           <p className="text-sm">Seja o primeiro a comentar neste SLA</p>
                         </div>
                       )}
                     </div>
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
                        {actionLogs.map(log => (
                          <div key={log.id} className="flex gap-3 pb-3 border-b border-border/30 last:border-0">
                            <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{log.acao}</span>
                                <span className="text-xs text-muted-foreground">
                                  por {log.autor_email}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">
                                {format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm", {
                                  locale: ptBR
                                })}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Solicitante</label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4" />
                    <span>{currentSLA.solicitante}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Time Responsável</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building className="h-4 w-4" />
                    <span>{currentSLA.time_responsavel}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Criação</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(currentSLA.data_criacao), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR
                      })}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pontuação Total</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Target className="h-4 w-4" />
                    <span>{currentSLA.pontuacao_total} pontos</span>
                  </div>
                </div>
              </div>
              
              {/* Tags */}
              {currentSLA.tags && currentSLA.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {currentSLA.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Anexos e Link de Referência */}
              {currentSLA && (currentSLA.link_referencia || currentSLA.anexos) && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Anexos e Links</label>
                  <div className="mt-2">
                    <TicketAttachments 
                      linkReferencia={currentSLA.link_referencia}
                      anexos={currentSLA.anexos}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
      
      {/* Modais de Edição e Exclusão de Comentários */}
      <CommentEditModal 
        comment={selectedCommentForEdit} 
        isOpen={editCommentModalOpen} 
        onClose={() => {
          setEditCommentModalOpen(false);
          setSelectedCommentForEdit(null);
        }} 
        onUpdate={loadComments} 
      />

      <CommentDeleteModal 
        comment={selectedCommentForDelete} 
        isOpen={deleteCommentModalOpen} 
        onClose={() => {
          setDeleteCommentModalOpen(false);
          setSelectedCommentForDelete(null);
        }} 
        onDelete={loadComments} 
      />
    </Dialog>
  );
}