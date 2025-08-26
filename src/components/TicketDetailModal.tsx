import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import RichTextMentionEditor from "@/components/RichTextMentionEditor";
import { FormattedText } from "@/components/ui/formatted-text";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useTicketPermissions } from "@/hooks/useTicketPermissions";
import { useSLAPolicies } from "@/hooks/useSLAPolicies";
import CommentEditModal from "@/components/CommentEditModal";
import CommentReactions from "@/components/CommentReactions";
import CommentDeleteModal from "@/components/CommentDeleteModal";
import { MessageSquare, Send, ArrowRightLeft, Calendar, User, Building, Clock, AlertCircle, CheckCircle, X, FileText, Target, ThumbsUp, MoreHorizontal, Play, Pause, Square, RotateCcw, History, Reply, Heart, Share, Edit2, Smile, Paperclip, Download, Trash2, ExternalLink, Search, ChevronUp, ChevronDown, Eye, Upload, Image, Video, Maximize, Minimize } from "lucide-react";
import TicketAttachments from "@/components/TicketAttachments";
import TicketEditModal from "@/components/TicketEditModal";
import { SLADeadlineChip } from "@/components/SLADeadlineChip";
import { SLADeadlineModal } from "@/components/SLADeadlineModal";
import { SetTicketDeadlineButton } from "@/components/SetTicketDeadlineButton";
import { TicketAssigneeSelector } from "@/components/TicketAssigneeSelector";
import { TicketAssigneeDisplay } from "@/components/TicketAssigneeDisplay";
// (FileUploader import removido)
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { extractCleanTextWithMentions, formatMentionsForDisplay } from "@/utils/textFormatting";
import { extractMentions, findMentionedUsers, notifyUserMention } from "@/utils/notificationService";
import { useFileUpload } from "@/hooks/useFileUpload";
import TicketLinksPanel from "@/components/TicketLinksPanel";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  assignee_user_id?: string | null;
  assignee?: {
    user_id: string;
    nome_completo: string;
    email: string;
    avatar_url?: string;
  } | null;
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
    profile,
    isAdmin,
    canEdit,
    isSuperAdmin
  } = useAuth();
  const {
    userSetores,
    getSetorValidationMessage,
    getStartResolveValidationMessage,
    canStartOrResolveTicket,
    canDeleteTicket,
    canCloseTicket,
    canEditTicket
  } = usePermissions();
  
  const { validateTicketAction, canPerformAction } = useTicketPermissions();
  const { calculateSLADeadline } = useSLAPolicies();
  
  const [currentSLA, setCurrentSLA] = useState<SLA | null>(sla);
  const [comments, setComments] = useState<Comment[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [setores, setSetores] = useState<Setor[]>([]);
  const [selectedSetor, setSelectedSetor] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [currentAssignee, setCurrentAssignee] = useState<SLA['assignee']>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCommentForEdit, setSelectedCommentForEdit] = useState<Comment | null>(null);
  const [selectedCommentForDelete, setSelectedCommentForDelete] = useState<Comment | null>(null);
  const [editCommentModalOpen, setEditCommentModalOpen] = useState(false);
  const [deleteCommentModalOpen, setDeleteCommentModalOpen] = useState(false);
  const [slaHistory, setSlaHistory] = useState<any[]>([]);
  const [originalDeadline, setOriginalDeadline] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
const scrollAreaRef = useRef<HTMLDivElement>(null);

const [isCommentsFocusMode, setIsCommentsFocusMode] = useState(false);
const preservedScrollTopRef = useRef(0);
const toggleCommentsFocusMode = () => {
  const el = scrollAreaRef.current;
  if (el) preservedScrollTopRef.current = el.scrollTop;
  setIsCommentsFocusMode((prev) => !prev);
  // Restore scroll position after layout changes
  requestAnimationFrame(() => {
    const el2 = scrollAreaRef.current;
    if (el2) el2.scrollTop = preservedScrollTopRef.current;
  });
};

  const [dbAttachments, setDbAttachments] = useState<Array<{
    id: string;
    file_name: string;
    mime_type: string;
    size: number;
    storage_path: string;
    uploaded_by: string;
    created_at: string;
    comment_id?: string | null;
    url: string;
    uploader_name?: string;
  }>>([]);

  // Anexos para novo comentário (pendentes)
  const [pendingAttachments, setPendingAttachments] = useState<Array<{
    dbId: string; // id do registro em ticket_attachments
    name: string;
    url: string; // signed url para visualizar/baixar antes de enviar
    type: string;
    size: number;
    storagePath: string;
  }>>([]);
  const [dragActive, setDragActive] = useState(false);

  // Handlers de upload simples (dropzone compacta + chips)
  const handleFilesSelected = async (fileList: FileList) => {
    if (!currentSLA || !user) return;
    const uploaded = await uploadFiles(fileList);
    if (!uploaded || uploaded.length === 0) return;

    // Persistir linhas em ticket_attachments (comment_id permanece NULL até enviar o comentário)
    const rows = uploaded.map((f) => ({
      ticket_id: currentSLA.id,
      file_name: f.name,
      mime_type: f.type,
      size: f.size,
      storage_path: (f as any).storagePath || f.id,
      uploaded_by: user.id
    }));

    const { data: inserted, error: insErr } = await supabase
      .from('ticket_attachments')
      .insert(rows)
      .select();

    if (insErr) {
      console.warn('Falha ao registrar anexos no banco:', insErr);
      return;
    }

    // Gerar signed URLs para visualização/baixa (bucket privado)
    const chips: Array<{ dbId: string; name: string; url: string; type: string; size: number; storagePath: string; }> = [];
    for (const att of inserted || []) {
      const { data: signed } = await supabase.storage
        .from('tickets')
        .createSignedUrl(att.storage_path, 3600);
      chips.push({
        dbId: att.id,
        name: att.file_name,
        url: signed?.signedUrl || '',
        type: att.mime_type,
        size: Number(att.size),
        storagePath: att.storage_path
      });
    }

    setPendingAttachments((prev) => [...prev, ...chips]);
  };

  const removePendingAttachment = async (dbId: string, storagePath: string) => {
    try {
      await supabase.from('ticket_attachments').delete().eq('id', dbId);
      await deleteFile(storagePath);
    } catch (e) {
      console.warn('Erro ao remover anexo pendente:', e);
    } finally {
      setPendingAttachments((prev) => prev.filter((p) => p.dbId !== dbId));
    }
  };

  // Map de anexos por comentário já publicado
  const [attachmentsByComment, setAttachmentsByComment] = useState<Record<string, Array<{
    id: string;
    file_name: string;
    mime_type: string;
    size: number;
    storage_path: string;
    url: string;
  }>>>({});
  const [expandedAttachments, setExpandedAttachments] = useState<Record<string, boolean>>({});

  const uploadOptions = {
    bucket: 'tickets',
    maxSizeMB: 10,
    maxFiles: 3,
    allowedTypes: ['image/png','image/jpg','image/jpeg','image/webp','application/pdf','video/mp4','video/webm'],
    signedPreview: true,
    pathPrefix: currentSLA ? `tickets/${currentSLA.id}` : undefined
  };
  const { uploadFiles, deleteFile, uploading, uploadProgress } = useFileUpload(uploadOptions);

  const { toast } = useToast();

  // Função para carregar histórico de alterações de prazo SLA
  const loadSLAHistory = async () => {
    if (!currentSLA) return;
    try {
      const { data, error } = await supabase
        .from('sla_action_logs')
        .select('*')
        .eq('sla_id', currentSLA.id)
        .in('acao', ['definir_prazo', 'alterar_prazo'])
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      setSlaHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico SLA:', error);
    }
  };

  // Função para calcular prazo original baseado na política SLA
  const calculateOriginalDeadline = () => {
    if (!currentSLA) return;
    try {
      const originalDeadline = calculateSLADeadline(
        currentSLA.nivel_criticidade, 
        currentSLA.data_criacao, 
        currentSLA.setor_id
      );
      setOriginalDeadline(originalDeadline);
    } catch (error) {
      console.error('Erro ao calcular prazo original:', error);
    }
  };

  useEffect(() => {
    setCurrentSLA(sla);
    setCurrentAssignee(sla?.assignee || null);
  }, [sla]);

  useEffect(() => {
    if (currentSLA && isOpen) {
      loadComments();
      loadActionLogs();
      loadSetores();
      loadSLAHistory();
      calculateOriginalDeadline();
      
      // Configurar listeners em tempo real para comentários e atualizações do ticket
      const commentsChannel = supabase
        .channel('comment-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sla_comentarios_internos',
            filter: `sla_id=eq.${currentSLA.id}`
          },
          () => {
            loadComments();
          }
        )
        .subscribe();

      const ticketsChannel = supabase
        .channel('ticket-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sla_demandas',
            filter: `id=eq.${currentSLA.id}`
          },
          (payload) => {
            // Atualizar dados do ticket em tempo real
            if (payload.new) {
              const updatedSLA = { ...currentSLA, ...payload.new };
              setCurrentSLA(updatedSLA);
              if (setSelectedSLA) {
                setSelectedSLA(updatedSLA);
              }
            }
          }
        )
        .subscribe();

      const logsChannel = supabase
        .channel('logs-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sla_action_logs',
            filter: `sla_id=eq.${currentSLA.id}`
          },
          () => {
            loadActionLogs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(commentsChannel);
        supabase.removeChannel(ticketsChannel);
        supabase.removeChannel(logsChannel);
      };
    }
  }, [currentSLA, isOpen]);

  const loadComments = async () => {
    if (!currentSLA) return;
    try {
      const { data, error } = await supabase
        .from('sla_comentarios_internos')
        .select('*')
        .eq('sla_id', currentSLA.id)
        .order('created_at', { ascending: true });
      
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

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const loadDbAttachments = async () => {
    if (!currentSLA) return;
    try {
      const { data: rows, error } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', currentSLA.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const attachments = rows || [];

      if (attachments.length === 0) {
        setDbAttachments([]);
        return;
      }

      // Fetch uploader names
      const uploaderIds = Array.from(new Set(attachments.map(a => a.uploaded_by).filter(Boolean)));
      let uploaderMap: Record<string, string> = {};
      if (uploaderIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, nome_completo, email')
          .in('user_id', uploaderIds);
        (profs || []).forEach(p => {
          uploaderMap[p.user_id] = p.nome_completo || p.email;
        });
      }

      // Generate signed URLs
      const withUrls: typeof dbAttachments = [] as any;
      for (const att of attachments as any[]) {
        const { data: signed, error: sErr } = await supabase.storage
          .from('tickets')
          .createSignedUrl(att.storage_path, 3600);
        if (sErr) {
          console.warn('Erro ao gerar Signed URL para anexo:', sErr);
          continue;
        }
        withUrls.push({
          ...att,
          url: signed?.signedUrl || '',
          uploader_name: uploaderMap[att.uploaded_by] || 'Usuário'
        });
      }

      setDbAttachments(withUrls);

      // Agrupar anexos por comentário para exibição como chips
      const grouped: Record<string, Array<{ id: string; file_name: string; mime_type: string; size: number; storage_path: string; url: string }>> = {};
      for (const att of withUrls as any[]) {
        if (att.comment_id) {
          if (!grouped[att.comment_id]) grouped[att.comment_id] = [];
          grouped[att.comment_id].push({
            id: att.id,
            file_name: att.file_name,
            mime_type: att.mime_type,
            size: Number(att.size),
            storage_path: att.storage_path,
            url: att.url,
          });
        }
      }
      setAttachmentsByComment(grouped);
    } catch (e) {
      console.warn('Erro ao carregar anexos do ticket:', e);
      setDbAttachments([]);
    }
  };

  useEffect(() => {
    if (isOpen && currentSLA?.id) {
      loadDbAttachments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentSLA?.id]);
  const handleTransferTicket = async (novoSetor: Setor) => {
    if (!currentSLA || !user) return;

    setTransferLoading(true);
    try {
      // Buscar setor atual
      const setorAtual = setores.find(s => s.id === currentSLA.setor_id);
      
      // Log da transferência usando a função do banco
      const { error: logError } = await supabase
        .rpc('log_sla_action', {
          p_sla_id: currentSLA.id,
          p_acao: 'transferencia_setor',
          p_setor_origem_id: currentSLA.setor_id,
          p_setor_destino_id: novoSetor.id,
          p_justificativa: `Transferido de "${setorAtual?.nome || 'Setor Desconhecido'}" para "${novoSetor.nome}"`,
          p_dados_anteriores: null,
          p_dados_novos: null
        });

      if (logError) {
        console.error('Erro ao criar log da transferência:', logError);
        // Continuar mesmo se o log falhar
      }

      // Atualizar o ticket
      const { error: updateError } = await supabase
        .from('sla_demandas')
        .update({
          setor_id: novoSetor.id,
          time_responsavel: novoSetor.nome,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSLA.id);

      if (updateError) throw updateError;

      // Atualizar estado local
      const updatedSLA = {
        ...currentSLA,
        setor_id: novoSetor.id,
        time_responsavel: novoSetor.nome
      };
      
      setCurrentSLA(updatedSLA);
      if (setSelectedSLA) {
        setSelectedSLA(updatedSLA);
      }

      // Recarregar logs para mostrar a transferência
      loadActionLogs();

      toast({
        title: "Ticket transferido",
        description: `Ticket transferido para ${novoSetor.nome} com sucesso.`
      });

      // Notificar componente pai para atualização
      if (onUpdate) onUpdate();

    } catch (error: any) {
      console.error('Erro ao transferir ticket:', error);
      toast({
        title: "Erro ao transferir ticket",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!currentSLA || !user) return;

    // Validar ação
    const action = getActionFromStatus(newStatus);
    if (!validateTicketAction(currentSLA as any, action)) {
      return;
    }

    setStatusLoading(newStatus);
    try {
      const statusLabels = {
        'aberto': 'Aberto',
        'em_andamento': 'Em Andamento',
        'resolvido': 'Resolvido',
        'fechado': 'Fechado'
      };

      // Log da mudança de status
      const { error: logError } = await supabase
        .rpc('log_sla_action', {
          p_sla_id: currentSLA.id,
          p_acao: 'mudanca_status',
          p_justificativa: `Status alterado de "${statusLabels[currentSLA.status as keyof typeof statusLabels]}" para "${statusLabels[newStatus as keyof typeof statusLabels]}"`,
          p_setor_origem_id: null,
          p_setor_destino_id: null,
          p_dados_anteriores: null,
          p_dados_novos: null
        });

      if (logError) {
        console.error('Erro ao criar log da mudança de status:', logError);
      }

      // Atualizar o ticket
      const { error: updateError } = await supabase
        .from('sla_demandas')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSLA.id);

      if (updateError) throw updateError;

      // Atualizar estado local
      const updatedSLA = {
        ...currentSLA,
        status: newStatus
      };
      
      setCurrentSLA(updatedSLA);
      if (setSelectedSLA) {
        setSelectedSLA(updatedSLA);
      }

      // Recarregar logs para mostrar a mudança
      loadActionLogs();

      toast({
        title: "Status atualizado",
        description: `Ticket atualizado para "${statusLabels[newStatus as keyof typeof statusLabels]}" com sucesso.`
      });

      // Notificar componente pai para atualização
      if (onUpdate) onUpdate();

    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro ao alterar status",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setStatusLoading(null);
    }
  };

  const getActionFromStatus = (status: string): 'start' | 'resolve' | 'close' => {
    switch (status) {
      case 'em_andamento':
        return 'start';
      case 'resolvido':
        return 'resolve';
      case 'fechado':
        return 'close';
      default:
        return 'start';
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case 'aberto':
        return 'em_andamento';
      case 'em_andamento':
        return 'resolvido';
      case 'resolvido':
        return 'fechado';
      default:
        return null;
    }
  };

  const getStatusButtonConfig = (currentStatus: string) => {
    switch (currentStatus) {
      case 'aberto':
        return {
          label: 'Colocar em Andamento',
          icon: Play,
          variant: 'default' as const,
          nextStatus: 'em_andamento'
        };
      case 'em_andamento':
        return {
          label: 'Resolver',
          icon: CheckCircle,
          variant: 'default' as const,
          nextStatus: 'resolvido'
        };
      case 'resolvido':
        return {
          label: 'Fechar',
          icon: X,
          variant: 'outline' as const,
          nextStatus: 'fechado'
        };
      default:
        return null;
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

    if (!canEdit) {
      toast({
        title: "Erro",
        description: "Você não tem permissão para comentar em tickets.",
        variant: "destructive",
      });
      return;
    }

    setCommentLoading(true);
    try {
      // Sempre usar o setor do usuário para o comentário (não o setor do ticket)
      const comentarioSetorId = userSetores.length > 0 ? userSetores[0].setor_id : null;

      if (!comentarioSetorId) {
        toast({
          title: "Erro",
          description: "Você não tem acesso a nenhum setor para comentar.",
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

      // Associar anexos pendentes ao comentário
      try {
        if (commentData?.id && pendingAttachments.length > 0) {
          const ids = pendingAttachments.map(a => a.dbId);
          const { error: linkErr } = await supabase
            .from('ticket_attachments')
            .update({ comment_id: commentData.id })
            .in('id', ids);
          if (linkErr) {
            console.warn('Falha ao associar anexos ao comentário:', linkErr);
          }
        }
      } catch (attErr) {
        console.warn('Erro ao associar anexos do comentário:', attErr);
      }

      // Processar menções e enviar notificações
      try {
        // Extrair menções do HTML usando tanto texto limpo quanto spans com data-user-id
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newComment;
        
        // Buscar spans com data-user-id para menções específicas
        const mentionSpans = tempDiv.querySelectorAll('span[data-user-id]');
        const mentionedUserIds = Array.from(mentionSpans).map(span => span.getAttribute('data-user-id')).filter(Boolean);
        
        // Também extrair menções do texto limpo como fallback
        const mentions = extractMentions(cleanComment);
        
        // Se tem menções por user ID, usar essas
        if (mentionedUserIds.length > 0) {
          const mentionerName = user.user_metadata?.nome_completo || user.email || 'Usuário';
          
          for (const mentionedUserId of mentionedUserIds) {
            if (mentionedUserId !== user.id) {
              await notifyUserMention(
                mentionedUserId,
                mentionerName,
                currentSLA.id,
                currentSLA.titulo,
                commentData.id
              );
            }
          }
        } else if (mentions.length > 0) {
          // Fallback para busca por nome
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
      setPendingAttachments([]);
      loadComments();
      loadDbAttachments();
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

  const handleInfoIncompletaToggle = async (checked: boolean) => {
    if (!currentSLA || !user) return;

    // Verificar permissões antes de tentar atualizar
    if (!canEditTicket(currentSLA as any)) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para editar este ticket",
        variant: "destructive"
      });
      return;
    }

    const currentTags = currentSLA.tags || [];
    let newTags: string[];

    if (checked) {
      // Adicionar a tag se não existir
      if (!currentTags.includes("info-incompleta")) {
        newTags = [...currentTags, "info-incompleta"];
      } else {
        return; // Tag já existe
      }
    } else {
      // Remover a tag
      newTags = currentTags.filter(tag => tag !== "info-incompleta");
    }

    // Atualização otimista - atualizar UI imediatamente
    setCurrentSLA(prev => prev ? { ...prev, tags: newTags } : null);
    if (setSelectedSLA) {
      setSelectedSLA({ ...currentSLA, tags: newTags });
    }

    try {
      // Executar operações de banco em paralelo
      const userName = profile?.nome_completo || user.email || 'Usuário';
      
      const [updateResult, logResult] = await Promise.allSettled([
        supabase
          .from('sla_demandas')
          .update({ tags: newTags })
          .eq('id', currentSLA.id),
        supabase.rpc('log_sla_action', {
          p_sla_id: currentSLA.id,
          p_acao: checked ? 'marcar_info_incompleta' : 'desmarcar_info_incompleta',
          p_justificativa: `${userName} ${checked ? 'marcou' : 'desmarcou'} o ticket como "Informação incompleta"`,
          p_dados_anteriores: { tags: currentTags },
          p_dados_novos: { tags: newTags }
        })
      ]);

      // Verificar se a atualização principal falhou
      if (updateResult.status === 'rejected' || (updateResult.status === 'fulfilled' && updateResult.value.error)) {
        const error = updateResult.status === 'rejected' ? updateResult.reason : updateResult.value.error;
        throw error;
      }

      // Log de erro separado não falha a operação
      if (logResult.status === 'rejected') {
        console.warn('Erro ao registrar no histórico:', logResult.reason);
      }

      onUpdate();

      toast({
        title: checked ? "Ticket marcado" : "Marcação removida",
        description: checked 
          ? "Ticket marcado como 'Informação incompleta'" 
          : "Marcação 'Informação incompleta' removida"
      });

    } catch (error: any) {
      console.error('Erro ao atualizar tag info-incompleta:', error);
      
      // Reverter atualização otimista em caso de erro
      setCurrentSLA(prev => prev ? { ...prev, tags: currentTags } : null);
      if (setSelectedSLA) {
        setSelectedSLA({ ...currentSLA, tags: currentTags });
      }
      
      toast({
        title: "Erro",
        description: `Não foi possível atualizar a marcação: ${error?.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    }
  };

  if (!currentSLA || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            {!isCommentsFocusMode && (
              <DialogTitle className="text-xl font-bold">
                {currentSLA.ticket_number || `#${currentSLA.id.slice(0, 8)}`} - {currentSLA.titulo}
              </DialogTitle>
            )}
            
            <div className="flex items-center gap-3 mr-4">
              {/* Botão de Editar */}
              {canEditTicket(currentSLA as any) && !isCommentsFocusMode && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit2 className="h-4 w-4" />
                  Editar
                </Button>
              )}
              {/* Botão Focar comentários */}
              <Button
                size="sm"
                variant={isCommentsFocusMode ? "default" : "outline"}
                className="gap-2"
                onClick={toggleCommentsFocusMode}
                aria-pressed={isCommentsFocusMode}
                aria-expanded={isCommentsFocusMode}
                title={isCommentsFocusMode ? "Voltar à visualização padrão" : "Focar comentários"}
              >
                {isCommentsFocusMode ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
                {isCommentsFocusMode ? "Voltar" : "Focar comentários"}
              </Button>

              {!isCommentsFocusMode && (
                <>
                {/* Botões de Status */}
                {currentSLA.status !== 'fechado' && (() => {
                  const buttonConfig = getStatusButtonConfig(currentSLA.status);
                  const canPerform = buttonConfig && canPerformAction(currentSLA as any, getActionFromStatus(buttonConfig.nextStatus));
                  
                  if (buttonConfig && canPerform) {
                    const Icon = buttonConfig.icon;
                    return (
                      <Button
                        size="sm"
                        variant={buttonConfig.variant}
                        className="gap-2"
                        disabled={statusLoading === buttonConfig.nextStatus}
                        onClick={() => handleStatusChange(buttonConfig.nextStatus)}
                      >
                        {statusLoading === buttonConfig.nextStatus ? (
                          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                        {statusLoading === buttonConfig.nextStatus ? 'Processando...' : buttonConfig.label}
                      </Button>
                    );
                  }
                  return null;
                })()}
                </>
              )}

              {!isCommentsFocusMode && (
                <>
                {/* Botão de Transferir Setor */}
                 {(profile?.role === 'super_admin' || profile?.role === 'operador') && (
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <Button variant="outline" size="sm" className="gap-2">
                         <ArrowRightLeft className="h-4 w-4" />
                         Transferir Setor
                       </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end" className="w-56">
                       <div className="px-2 py-1.5 text-sm font-medium">
                         Transferir para:
                       </div>
                       <DropdownMenuSeparator />
                       {setores
                         .filter(setor => setor.id !== currentSLA.setor_id)
                         .map(setor => (
                           <DropdownMenuItem
                             key={setor.id}
                             onClick={() => handleTransferTicket(setor)}
                             className="cursor-pointer"
                           >
                             <Building className="h-4 w-4 mr-2" />
                             {setor.nome}
                           </DropdownMenuItem>
                         ))
                       }
                     </DropdownMenuContent>
                   </DropdownMenu>
                 )}

                  {/* Botão Atribuir Responsável */}
                  <TicketAssigneeSelector
                    ticketId={currentSLA.id}
                    currentAssigneeId={currentSLA.assignee_user_id}
                    currentAssignee={currentAssignee}
                    ticketSectorId={currentSLA.setor_id}
                    onAssigneeChange={(assigneeId, assignee) => {
                      setCurrentSLA(prev => prev ? { ...prev, assignee_user_id: assigneeId, assignee } : null);
                      setCurrentAssignee(assignee);
                      onUpdate();
                    }}
                  />

                  {/* Botão Definir Prazo */}
                  <SetTicketDeadlineButton
                    ticket={currentSLA}
                    onUpdate={() => {
                      setCurrentSLA({ ...currentSLA });
                      onUpdate();
                    }}
                    variant="outline"
                    size="sm"
                  />
                </>
              )}
            </div>
          </div>

            {!isCommentsFocusMode && (
              <div className="flex flex-wrap gap-2">
                {getStatusBadge(currentSLA.status)}
                {getCriticalityBadge(currentSLA.nivel_criticidade)}
                {/* Badge da tag Info Incompleta */}
                {currentSLA.tags?.includes("info-incompleta") && (
                  <Badge 
                    variant="outline" 
                    className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-600"
                  >
                    <HelpCircle className="h-3 w-3 mr-1" />
                    Info incompleta
                  </Badge>
                )}
              </div>
            )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Conteúdo principal */}
          {/* Tabs de Discussão e Histórico */}
          {!isCommentsFocusMode && (
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
          )}

          {/* Conteúdo das Tabs */}
          <div className="mb-6">
            {(isCommentsFocusMode || activeTab === 'comments') ? (
              <Card className={`flex-1 flex flex-col ${isCommentsFocusMode ? 'min-h-[60vh] max-h-[70vh]' : 'min-h-[400px] max-h-[400px]'}`}>
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                  {isCommentsFocusMode ? (
                    <>
                      {/* Lista de Comentários - No modo foco vai primeiro e rola */}
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
                    {(currentSLA.link_referencia || (currentSLA.anexos && JSON.stringify(currentSLA.anexos) !== '[]')) && (
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                        <TicketAttachments 
                          linkReferencia={currentSLA.link_referencia}
                          anexos={typeof currentSLA.anexos === 'string' ? currentSLA.anexos : JSON.stringify(currentSLA.anexos)}
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
                                             <Edit2 className="h-3 w-3" />
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

                                     {/* Anexos do comentário - somente chips, sem preview inline */}
                                     {attachmentsByComment[comment.id] && attachmentsByComment[comment.id].length > 0 && (
                                       <div className="mt-2">
                                         <h4 className="text-xs font-medium text-muted-foreground">Anexos ({attachmentsByComment[comment.id].length})</h4>
                                         <div className="mt-1 flex flex-wrap gap-2">
                                           {attachmentsByComment[comment.id].map(att => (
                                             <div key={att.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/50 text-xs">
                                               <span className="max-w-[220px] truncate font-medium">{att.file_name}</span>
                                               <span className="text-muted-foreground/80">• {formatFileSize(att.size)}</span>
                                               <a
                                                 href={att.url}
                                                 target="_blank"
                                                 rel="noopener"
                                                 className="text-foreground/80 hover:opacity-100 opacity-80"
                                                 title="Ver"
                                                 aria-label="Ver"
                                               >
                                                 <Eye className="w-3.5 h-3.5" />
                                               </a>
                                               <a
                                                 href={att.url}
                                                 download={att.file_name}
                                                 className="text-foreground/80 hover:opacity-100 opacity-80"
                                                 title="Baixar"
                                                 aria-label="Baixar"
                                               >
                                                 <Download className="w-3.5 h-3.5" />
                                               </a>
                                             </div>
                                           ))}
                                         </div>
                                       </div>
                                     )}
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

                      {/* Área de Novo Comentário - Fixo no rodapé em modo foco */}
                      {user && (
                        <div className="p-4 border-t bg-muted/10 flex-shrink-0 sticky bottom-0">
                          <div className="flex gap-3">
                            <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {user.user_metadata?.nome_completo?.substring(0, 2)?.toUpperCase() || 'EU'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-3">
                              <RichTextMentionEditor
                                value={newComment}
                                onChange={setNewComment}
                                placeholder="Digite seu comentário... (use @ para mencionar alguém)"
                                className="min-h-[80px]"
                              />
                              {/* Dropzone compacta */}
                              <div
                                className="relative h-14 max-h-14 border border-dashed border-muted-foreground/30 rounded-md flex items-center gap-3 px-3 text-sm text-muted-foreground transition-colors"
                                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                                onDrop={async (e) => {
                                  e.preventDefault();
                                  setDragActive(false);
                                  if (e.dataTransfer.files && e.dataTransfer.files.length) {
                                    await handleFilesSelected(e.dataTransfer.files);
                                  }
                                }}
                              >
                                <input
                                  type="file"
                                  multiple
                                  accept={"image/png,image/jpg,image/jpeg,image/webp,application/pdf,video/mp4,video/webm"}
                                  onChange={async (e) => {
                                    if (e.target.files && e.target.files.length) {
                                      await handleFilesSelected(e.target.files);
                                      e.currentTarget.value = '';
                                    }
                                  }}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  disabled={uploading || pendingAttachments.length >= 3}
                                />
                                <Upload className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Anexar arquivos</span>
                                <span className="ml-2 text-xs text-muted-foreground/80 truncate">
                                  Máximo 3 arquivos • Imagens: 10MB • Vídeos: 25MB • PNG, JPG, WebP, PDF, MP4, WebM
                                </span>
                                {dragActive && (
                                  <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary/50 rounded-md flex items-center justify-center text-xs text-primary">
                                    Solte para enviar
                                  </div>
                                )}
                              </div>

                              {/* Chips dos anexos pendentes (sem preview inline) */}
                              {pendingAttachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {pendingAttachments.map((f) => {
                                    const isImage = f.type.startsWith('image/');
                                    const isVideo = f.type.startsWith('video/');
                                    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
                                    return (
                                      <div key={f.dbId} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/50 text-xs">
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-secondary/60">
                                          {isImage ? <Image className="w-3.5 h-3.5" /> : isVideo ? <Video className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                        </span>
                                        <span className="max-w-[200px] truncate font-medium">{f.name}</span>
                                        <span className="text-muted-foreground/80">• {formatFileSize(f.size)}</span>
                                        <button
                                          type="button"
                                          className="ml-1 text-muted-foreground/50 cursor-not-allowed"
                                          disabled
                                          title="Ver (pendente)"
                                          aria-label="Ver (pendente)"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          className="text-muted-foreground/50 cursor-not-allowed"
                                          disabled
                                          title="Baixar (pendente)"
                                          aria-label="Baixar (pendente)"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => removePendingAttachment(f.dbId, f.storagePath)}
                                          title="Remover"
                                          aria-label="Remover"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">
                                  Suporte a formatação de texto, emojis e menções • Anexos: {pendingAttachments.length}
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
                    </>
                  ) : (
                    <>
                      {/* Área de Novo Comentário - Modo normal (no topo) */}
                      {user && (
                        <div className="p-4 border-b bg-muted/10 flex-shrink-0">
                          <div className="flex gap-3">
                            <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {user.user_metadata?.nome_completo?.substring(0, 2)?.toUpperCase() || 'EU'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-3">
                              <RichTextMentionEditor
                                value={newComment}
                                onChange={setNewComment}
                                placeholder="Digite seu comentário... (use @ para mencionar alguém)"
                                className="min-h-[80px]"
                              />
                              {/* Dropzone compacta */}
                              <div
                                className="relative h-14 max-h-14 border border-dashed border-muted-foreground/30 rounded-md flex items-center gap-3 px-3 text-sm text-muted-foreground transition-colors"
                                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                                onDrop={async (e) => {
                                  e.preventDefault();
                                  setDragActive(false);
                                  if (e.dataTransfer.files && e.dataTransfer.files.length) {
                                    await handleFilesSelected(e.dataTransfer.files);
                                  }
                                }}
                              >
                                <input
                                  type="file"
                                  multiple
                                  accept={"image/png,image/jpg,image/jpeg,image/webp,application/pdf,video/mp4,video/webm"}
                                  onChange={async (e) => {
                                    if (e.target.files && e.target.files.length) {
                                      await handleFilesSelected(e.target.files);
                                      e.currentTarget.value = '';
                                    }
                                  }}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  disabled={uploading || pendingAttachments.length >= 3}
                                />
                                <Upload className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Anexar arquivos</span>
                                <span className="ml-2 text-xs text-muted-foreground/80 truncate">
                                  Máximo 3 arquivos • Imagens: 10MB • Vídeos: 25MB • PNG, JPG, WebP, PDF, MP4, WebM
                                </span>
                                {dragActive && (
                                  <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary/50 rounded-md flex items-center justify-center text-xs text-primary">
                                    Solte para enviar
                                  </div>
                                )}
                              </div>

                              {/* Chips dos anexos pendentes (sem preview inline) */}
                              {pendingAttachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {pendingAttachments.map((f) => {
                                    const isImage = f.type.startsWith('image/');
                                    const isVideo = f.type.startsWith('video/');
                                    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
                                    return (
                                      <div key={f.dbId} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/50 text-xs">
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-secondary/60">
                                          {isImage ? <Image className="w-3.5 h-3.5" /> : isVideo ? <Video className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                        </span>
                                        <span className="max-w-[200px] truncate font-medium">{f.name}</span>
                                        <span className="text-muted-foreground/80">• {formatFileSize(f.size)}</span>
                                        <button
                                          type="button"
                                          className="ml-1 text-muted-foreground/50 cursor-not-allowed"
                                          disabled
                                          title="Ver (pendente)"
                                          aria-label="Ver (pendente)"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          className="text-muted-foreground/50 cursor-not-allowed"
                                          disabled
                                          title="Baixar (pendente)"
                                          aria-label="Baixar (pendente)"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => removePendingAttachment(f.dbId, f.storagePath)}
                                          title="Remover"
                                          aria-label="Remover"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">
                                  Suporte a formatação de texto, emojis e menções • Anexos: {pendingAttachments.length}
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

                      {/* Lista de Comentários - Modo normal */}
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
              {(currentSLA.link_referencia || (currentSLA.anexos && JSON.stringify(currentSLA.anexos) !== '[]')) && (
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                  <TicketAttachments 
                    linkReferencia={currentSLA.link_referencia}
                    anexos={typeof currentSLA.anexos === 'string' ? currentSLA.anexos : JSON.stringify(currentSLA.anexos)}
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
                                         <Edit2 className="h-3 w-3" />
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

                                 {/* Anexos do comentário - somente chips, sem preview inline */}
                                 {attachmentsByComment[comment.id] && attachmentsByComment[comment.id].length > 0 && (
                                   <div className="mt-2">
                                     <h4 className="text-xs font-medium text-muted-foreground">Anexos ({attachmentsByComment[comment.id].length})</h4>
                                     <div className="mt-1 flex flex-wrap gap-2">
                                       {attachmentsByComment[comment.id].map(att => (
                                         <div key={att.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/50 text-xs">
                                           <span className="max-w-[220px] truncate font-medium">{att.file_name}</span>
                                           <span className="text-muted-foreground/80">• {formatFileSize(att.size)}</span>
                                           <a
                                             href={att.url}
                                             target="_blank"
                                             rel="noopener"
                                             className="text-foreground/80 hover:opacity-100 opacity-80"
                                             title="Ver"
                                             aria-label="Ver"
                                           >
                                             <Eye className="w-3.5 h-3.5" />
                                           </a>
                                           <a
                                             href={att.url}
                                             download={att.file_name}
                                             className="text-foreground/80 hover:opacity-100 opacity-80"
                                             title="Baixar"
                                             aria-label="Baixar"
                                           >
                                             <Download className="w-3.5 h-3.5" />
                                           </a>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 )}
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
                      </>
                    )}
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

          {!isCommentsFocusMode && (
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
                    <label className="text-sm font-medium text-muted-foreground">Responsável</label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4" />
                      <TicketAssigneeDisplay 
                        assignee={currentAssignee}
                        size="sm"
                        variant="full"
                      />
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
                    <label className="text-sm font-medium text-muted-foreground">Prazo Original (SLA)</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {originalDeadline 
                          ? format(originalDeadline, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : "Calculando..."
                        }
                      </span>
                    </div>
                  </div>
                  {currentSLA.prazo_interno && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Prazo Atualizado {slaHistory.length > 1 ? `(${slaHistory.length - 1} alteração${slaHistory.length > 2 ? 'ões' : ''})` : ''}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span>
                          {format(new Date(currentSLA.prazo_interno), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Pontuação Total</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Target className="h-4 w-4" />
                      <span>{currentSLA.pontuacao_total} pontos</span>
                    </div>
                  </div>
                </div>
                
                {/* Toggle para marcar como "Informação incompleta" */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="info-incompleta" className="text-sm font-medium flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <HelpCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        Informação incompleta
                      </Label>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Marque quando o ticket precisa de mais informações para prosseguir
                      </p>
                    </div>
                    <Switch
                      id="info-incompleta"
                      checked={currentSLA.tags?.includes("info-incompleta") || false}
                      onCheckedChange={handleInfoIncompletaToggle}
                      disabled={!canEditTicket(currentSLA as any)}
                      className="data-[state=checked]:bg-yellow-600 dark:data-[state=checked]:bg-yellow-500"
                    />
                  </div>
                </div>

                {/* Tags */}
                {currentSLA.tags && currentSLA.tags.filter(tag => tag !== "info-incompleta").length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tags</label>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {currentSLA.tags
                        .filter(tag => tag !== "info-incompleta") // Excluir a tag info-incompleta desta seção
                        .map((tag, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Anexos do Ticket (via tabela) */}
                {dbAttachments.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Arquivos</label>
                    <div className="mt-2 grid gap-2">
                      {dbAttachments.map((file) => {
                        const isImage = file.mime_type?.startsWith('image/');
                        const isVideo = file.mime_type?.startsWith('video/');
                        const isPdf = file.mime_type === 'application/pdf' || file.file_name?.toLowerCase?.().endsWith('.pdf');
                        return (
                          <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                            <div className="flex-shrink-0">
                              {isImage ? (
                                <img
                                  src={file.url}
                                  alt={file.file_name}
                                  className="w-12 h-12 object-cover rounded border"
                                />
                              ) : isVideo ? (
                                <video src={file.url} className="w-12 h-12 object-cover rounded border" muted />
                              ) : (
                                <div className="w-12 h-12 bg-secondary rounded border flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.file_name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {formatFileSize(Number(file.size))} • {(file.uploader_name || 'Usuário')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(file.url, '_blank', 'noopener,noreferrer')}
                                className="h-8 px-2"
                                title={isPdf ? 'Abrir PDF' : isImage ? 'Abrir imagem' : 'Abrir arquivo'}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = file.url;
                                  a.download = file.file_name;
                                  a.click();
                                }}
                                className="h-8 px-2"
                                title="Baixar"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Anexos e Link de Referência (legado/descrição) */}
                {currentSLA && (currentSLA.link_referencia || currentSLA.anexos) && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Anexos e Links</label>
                    <div className="mt-2">
                      <TicketAttachments 
                        linkReferencia={currentSLA.link_referencia}
                        anexos={typeof currentSLA.anexos === 'string' ? currentSLA.anexos : JSON.stringify(currentSLA.anexos)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Painel de Tickets Vinculados */}
          {!isCommentsFocusMode && currentSLA && (
            <TicketLinksPanel 
              ticketId={currentSLA.id}
              onTicketOpen={(ticketId) => {
                // Fechar modal atual e abrir novo ticket
                onClose();
                // Aguardar fechamento do modal antes de abrir o novo
                setTimeout(() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('ticket', ticketId);
                  window.history.pushState({}, '', url.toString());
                  window.location.reload();
                }, 100);
              }}
            />
          )}
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

      {/* Modal de edição de ticket */}
      <TicketEditModal
        ticket={currentSLA as any}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={() => {
          // Recarregar dados do ticket atual
          if (currentSLA && onUpdate) {
            onUpdate();
          }
          setShowEditModal(false);
        }}
      />
    </Dialog>
  );
}