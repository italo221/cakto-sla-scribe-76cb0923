import { useState, useEffect, useMemo, useRef } from 'react';
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
import CommentDeleteModal from "@/components/CommentDeleteModal";
import { MessageSquare, Send, ArrowRightLeft, Calendar, User, Building, Clock, AlertCircle, CheckCircle, X, FileText, Target, ThumbsUp, MoreHorizontal, Play, Pause, Square, RotateCcw, History, Reply, Heart, Share, Edit3, Smile, Paperclip, Download, Trash2, ExternalLink, Search, ChevronUp, ChevronDown } from "lucide-react";
import LazyCommentsList from "./LazyCommentsList";
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
  anexos?: Array<{
    nome: string;
    url: string;
    tamanho: number;
    tipo: string;
  }>;
}

interface Setor {
  id: string;
  nome: string;
  descricao?: string;
}

interface SLADetailModalProps {
  sla: SLA | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  setSelectedSLA?: (sla: SLA) => void;
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
    setores: userSetores,
    canEdit,
    isSuperAdmin
  } = useAuth();
  const {
    getSetorValidationMessage,
    canStartOrResolveTicket,
    getStartResolveValidationMessage
  } = usePermissions();
  
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
  
  // Sistema de busca interna
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const commentRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    if (sla && isOpen && user) {
      // Usar Promise.all para carregar dados em paralelo (otimização de performance)
      Promise.all([
        loadComments(),
        loadActionLogs(),
        loadSetores()
      ]);
    }
  }, [sla, isOpen, user]);

  // Reset busca quando modal abre/fecha ou comentários mudam
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setCurrentSearchIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    performSearch();
  }, [searchTerm, comments]);

  // Otimização: usar useCallback para evitar re-renders desnecessários
  const loadComments = async () => {
    if (!sla) return;
    try {
      const { data, error } = await supabase
        .from('sla_comentarios_internos')
        .select('*')
        .eq('sla_id', sla.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setComments((data || []).map(comment => ({
        ...comment,
        anexos: comment.anexos ? 
          Array.isArray(comment.anexos) ? 
            comment.anexos as Array<{
              nome: string;
              url: string;
              tamanho: number;
              tipo: string;
            }> : [] : []
      })));
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

  // Otimização: cache dos setores para evitar requisições desnecessárias
  const loadSetores = useMemo(() => async () => {
    try {
      const { data, error } = await supabase
        .from('setores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      setSetores(data || []);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    }
  }, []);

  // Sistema de busca interna nos comentários
  const performSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results: number[] = [];
    comments.forEach((comment, index) => {
      const searchInText = (text: string) => {
        return text.toLowerCase().includes(searchTerm.toLowerCase());
      };

      if (searchInText(comment.comentario) || 
          searchInText(comment.autor_nome)) {
        results.push(index);
      }
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);
  };

  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = currentSearchIndex < searchResults.length - 1 ? currentSearchIndex + 1 : 0;
    } else {
      newIndex = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1;
    }
    
    setCurrentSearchIndex(newIndex);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from('sla-anexos').download(filePath);
      if (error) throw error;
      
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erro ao baixar anexo:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive"
      });
    }
  };

  const handleAddComment = async () => {
    if (!sla || !newComment.trim() || !user) return;

    const setorValidationMessage = getSetorValidationMessage();
    if (setorValidationMessage) {
      toast({
        title: "Acesso negado",
        description: setorValidationMessage,
        variant: "destructive"
      });
      return;
    }

    if (!canEdit && !isSuperAdmin) {
      toast({
        title: "Erro",
        description: "Você não tem permissão para comentar em tickets.",
        variant: "destructive"
      });
      return;
    }

    setCommentLoading(true);

    try {
      let comentarioSetorId;
      if (isSuperAdmin) {
        comentarioSetorId = sla.setor_id || (userSetores.length > 0 ? userSetores[0].setor_id : null);
      } else if (canEdit) {
        comentarioSetorId = sla.setor_id || (userSetores.length > 0 ? userSetores[0].setor_id : null);
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
          variant: "destructive"
        });
        return;
      }

      const { data: commentData, error: commentError } = await supabase
        .from('sla_comentarios_internos')
        .insert({
          sla_id: sla.id,
          setor_id: comentarioSetorId,
          autor_id: user.id,
          autor_nome: user.user_metadata?.nome_completo || user.email || 'Usuário',
          comentario: newComment.trim()
        })
        .select()
        .single();

      if (commentError) throw commentError;

      toast({
        title: "Comentário publicado",
        description: "Comentário adicionado com sucesso."
      });

      setNewComment('');
      setAttachments(null);
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

  if (!sla) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                {sla.ticket_number || `#${sla.id.slice(0, 8)}`} - {sla.titulo}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {(canEdit || isSuperAdmin) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(new CustomEvent('openEditModal', {
                        detail: sla
                      }));
                    }} 
                    className="gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-6">
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
                  <Badge variant="default" className="ml-1 text-xs bg-primary text-primary-foreground">
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
                            <RichTextEditor 
                              value={newComment} 
                              onChange={setNewComment} 
                              placeholder="Escreva um comentário..." 
                              className="min-h-[60px] max-h-[100px] resize-none border-0 bg-background shadow-sm focus:ring-2 focus:ring-primary/20" 
                            />
                            <div className="flex items-center justify-end">
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

                    {/* Busca interna de comentários */}
                    {comments.length > 0 && (
                      <div className="p-4 border-b bg-muted/5 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Buscar nos comentários..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-9 h-8 text-sm"
                            />
                          </div>
                          {searchResults.length > 0 && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <span className="text-xs">
                                {currentSearchIndex + 1} de {searchResults.length}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => navigateSearch('prev')}
                                disabled={searchResults.length === 0}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => navigateSearch('next')}
                                disabled={searchResults.length === 0}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {searchTerm && searchResults.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Nenhum resultado encontrado para "{searchTerm}"
                          </p>
                        )}
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
                      ) : (
                        <div className="space-y-4 pb-4">
                          <LazyCommentsList
                            comments={comments}
                            commentRefs={commentRefs}
                            onEdit={(comment) => {
                              setSelectedCommentForEdit(comment);
                              setEditCommentModalOpen(true);
                            }}
                            onDelete={(comment) => {
                              setSelectedCommentForDelete(comment);
                              setDeleteCommentModalOpen(true);
                            }}
                            onDownload={downloadAttachment}
                            formatFileSize={formatFileSize}
                            canEdit={canEdit}
                            userId={user?.id}
                          />
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
                          {actionLogs.map(log => (
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
                      <span>{format(new Date(sla.data_criacao), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR
                      })}</span>
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
    </>
  );
}