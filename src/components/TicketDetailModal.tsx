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
import { MessageSquare, Send, ArrowRightLeft, Calendar, User, Building, Clock, AlertCircle, CheckCircle, X, FileText, Target, ThumbsUp, MoreHorizontal, Play, Pause, Square, RotateCcw, History, Reply, Heart, Share, Edit3, Smile, Paperclip, Download, Trash2, ExternalLink, Search, ChevronUp, ChevronDown, Calculator } from "lucide-react";
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

  const handleChangeStatus = async (newStatus: string) => {
    if (!sla) return;

    const setorValidationMessage = getSetorValidationMessage();
    if (setorValidationMessage) {
      toast({
        title: "Acesso negado",
        description: setorValidationMessage,
        variant: "destructive"
      });
      return;
    }

    if ((newStatus === 'em_andamento' || newStatus === 'resolvido') && !canStartOrResolveTicket(sla)) {
      const message = getStartResolveValidationMessage(sla);
      if (message) {
        toast({
          title: "Ação não permitida",
          description: message,
          variant: "destructive",
        });
        return;
      }
    }

    setStatusLoading(newStatus);
    
    try {
      const oldStatus = sla.status;
      const updatedSLA = { ...sla, status: newStatus };
      setSelectedSLA?.(updatedSLA);

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
        description: `SLA ${newStatus === 'fechado' ? 'fechado' : 'alterado'} com sucesso.`
      });

      onUpdate();
      loadActionLogs();
    } catch (error: any) {
      setSelectedSLA?.(sla);
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setStatusLoading(null);
    }
  };

  const handleTransferSetor = async () => {
    if (!sla || !selectedSetor) return;
    setTransferLoading(true);
    
    try {
      const setorOrigem = setores.find(s => s.id === sla.setor_id);
      const setorDestino = setores.find(s => s.id === selectedSetor);
      
      const { error } = await supabase
        .from('sla_demandas')
        .update({ setor_id: selectedSetor })
        .eq('id', sla.id);

      if (error) throw error;

      await supabase.rpc('log_sla_action', {
        p_sla_id: sla.id,
        p_acao: 'transferencia_setor',
        p_setor_origem_id: sla.setor_id,
        p_setor_destino_id: selectedSetor,
        p_justificativa: `Transferido de "${setorOrigem?.nome}" para "${setorDestino?.nome}"`
      });

      toast({
        title: "SLA transferido",
        description: `Transferido para ${setorDestino?.nome} com sucesso.`
      });

      setShowTransferForm(false);
      setSelectedSetor('');
      onUpdate();
      loadActionLogs();
    } catch (error: any) {
      toast({
        title: "Erro ao transferir SLA",
        description: error.message,
        variant: "destructive"
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
      <Badge className={`${config.color} font-semibold`}>
        {criticality} - {config.label}
      </Badge>
    );
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
            {/* Informações principais do SLA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Status e Ações */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Status & Ações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Status Atual</label>
                    {getStatusBadge(sla.status)}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Criticidade</label>
                    {getCriticalityBadge(sla.nivel_criticidade)}
                  </div>

                  {/* Botões de Ação de Status */}
                  {(canEdit || isSuperAdmin) && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Ações Rápidas</label>
                      <div className="flex flex-wrap gap-2">
                        {sla.status === 'aberto' && (
                          <Button
                            size="sm"
                            onClick={() => handleChangeStatus('em_andamento')}
                            disabled={statusLoading === 'em_andamento'}
                            className="gap-2"
                          >
                            <Play className="h-3 w-3" />
                            {statusLoading === 'em_andamento' ? 'Iniciando...' : 'Iniciar'}
                          </Button>
                        )}
                        
                        {sla.status === 'em_andamento' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleChangeStatus('resolvido')}
                              disabled={statusLoading === 'resolvido'}
                              className="gap-2"
                            >
                              <CheckCircle className="h-3 w-3" />
                              {statusLoading === 'resolvido' ? 'Resolvendo...' : 'Resolver'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChangeStatus('aberto')}
                              disabled={statusLoading === 'aberto'}
                              className="gap-2"
                            >
                              <Pause className="h-3 w-3" />
                              {statusLoading === 'aberto' ? 'Pausando...' : 'Pausar'}
                            </Button>
                          </>
                        )}
                        
                        {sla.status === 'resolvido' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleChangeStatus('fechado')}
                              disabled={statusLoading === 'fechado'}
                              className="gap-2"
                            >
                              <X className="h-3 w-3" />
                              {statusLoading === 'fechado' ? 'Fechando...' : 'Fechar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChangeStatus('em_andamento')}
                              disabled={statusLoading === 'em_andamento'}
                              className="gap-2"
                            >
                              <RotateCcw className="h-3 w-3" />
                              {statusLoading === 'em_andamento' ? 'Reabrindo...' : 'Reabrir'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transferir Setor */}
                  {(canEdit || isSuperAdmin) && (
                    <div className="space-y-2">
                      {!showTransferForm ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTransferForm(true)}
                          className="w-full gap-2"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          Transferir Setor
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Selecionar setor" />
                            </SelectTrigger>
                            <SelectContent>
                              {setores.map(setor => (
                                <SelectItem key={setor.id} value={setor.id}>
                                  {setor.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleTransferSetor}
                              disabled={!selectedSetor || transferLoading}
                              className="flex-1"
                            >
                              {transferLoading ? 'Transferindo...' : 'Confirmar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowTransferForm(false);
                                setSelectedSetor('');
                              }}
                              className="flex-1"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pontuações */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    Pontuações SLA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {sla.pontuacao_total}
                      </div>
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                        Total
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {sla.pontuacao_financeiro}
                      </div>
                      <div className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                        Financeiro
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        {sla.pontuacao_cliente}
                      </div>
                      <div className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                        Cliente
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        {sla.pontuacao_reputacao}
                      </div>
                      <div className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                        Reputação
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="text-xl font-bold text-red-600 dark:text-red-400">
                        {sla.pontuacao_urgencia}
                      </div>
                      <div className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                        Urgência
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                        {sla.pontuacao_operacional}
                      </div>
                      <div className="text-xs font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
                        Operacional
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

                {sla.tags && sla.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tags</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sla.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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