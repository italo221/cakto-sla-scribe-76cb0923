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
import { Input } from "@/components/ui/input";
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
  Smile,
  Paperclip,
  Download,
  Trash2,
  ExternalLink
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
  descricao: string;
}

interface SLADetailModalProps {
  sla: SLA | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  setSelectedSLA?: (sla: SLA) => void; // Add this to update parent state immediately
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

export default function SLADetailModal({ sla, isOpen, onClose, onUpdate, setSelectedSLA }: SLADetailModalProps) {
  const { user, isAdmin, setores: userSetores } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [setores, setSetores] = useState<Setor[]>([]);
  const [selectedSetor, setSelectedSetor] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null); // Track which status button is loading
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [attachments, setAttachments] = useState<FileList | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
      console.log('Comentários carregados:', data);
      setComments((data || []).map(comment => {
        console.log('Comentário processado:', comment.id, 'anexos:', comment.anexos);
        return {
          ...comment,
          anexos: comment.anexos ? (Array.isArray(comment.anexos) ? comment.anexos as Array<{nome: string; url: string; tamanho: number; tipo: string}> : []) : []
        };
      }));
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

  const uploadAttachments = async (comentarioId: string) => {
    if (!attachments || attachments.length === 0) {
      console.log('Nenhum anexo para upload');
      return [];
    }

    console.log('Iniciando upload de', attachments.length, 'anexos');
    const uploadedFiles = [];
    
    for (let i = 0; i < attachments.length; i++) {
      const file = attachments[i];
      
      // Sanitizar nome do arquivo removendo caracteres especiais
      const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Substitui caracteres especiais por underscore
        .replace(/_{2,}/g, '_') // Remove underscores duplicados
        .replace(/^_|_$/g, ''); // Remove underscores do início e fim
      
      const fileExt = sanitizedFileName.split('.').pop();
      const fileName = `${comentarioId}/${Date.now()}_${sanitizedFileName}`;
      const filePath = `${sla.id}/${fileName}`;

      console.log('Fazendo upload do arquivo:', file.name, 'como:', sanitizedFileName, 'para:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('sla-anexos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Erro ao fazer upload do arquivo', file.name, ':', uploadError);
        toast({
          title: "Erro no upload",
          description: `Falha ao enviar ${file.name}: ${uploadError.message}`,
          variant: "destructive",
        });
        continue;
      }

      console.log('Upload bem-sucedido para:', filePath);

      const { data: urlData } = supabase.storage
        .from('sla-anexos')
        .getPublicUrl(filePath);

      uploadedFiles.push({
        nome: file.name, // Manter nome original para exibição
        url: urlData.publicUrl,
        tamanho: file.size,
        tipo: file.type
      });
    }

    console.log('Upload finalizado. Arquivos enviados:', uploadedFiles.length);
    return uploadedFiles;
  };

  const handleAddComment = async () => {
    if (!sla || !newComment.trim() || !user) return;

    setCommentLoading(true);
    setUploadingFiles(true);
    
    try {
      let comentarioSetorId;
      
      console.log('Debug comentário - isAdmin:', isAdmin, 'sla.setor_id:', sla.setor_id, 'userSetores:', userSetores);
      
      if (isAdmin) {
        // Se for admin e o SLA não tem setor_id definido, usar o primeiro setor do admin
        comentarioSetorId = sla.setor_id || (userSetores.length > 0 ? userSetores[0].setor_id : null);
      } else {
        const setorDoUsuario = userSetores.find(us => us.setor_id === sla.setor_id);
        if (setorDoUsuario) {
          comentarioSetorId = setorDoUsuario.setor_id;
        } else if (userSetores.length > 0) {
          comentarioSetorId = userSetores[0].setor_id;
        }
      }
      
      console.log('Debug comentário - comentarioSetorId final:', comentarioSetorId);
      
      if (!comentarioSetorId) {
        toast({
          title: "Erro",
          description: "Você não tem permissão para comentar neste SLA.",
          variant: "destructive",
        });
        return;
      }

      // Primeiro criar o comentário
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

      // Depois fazer upload dos anexos se houver
      let anexosUpload = [];
      if (attachments && attachments.length > 0) {
        anexosUpload = await uploadAttachments(commentData.id);
        
        // Atualizar o comentário com os anexos
        console.log('Atualizando comentário com anexos:', anexosUpload);
        const { error: updateError } = await supabase
          .from('sla_comentarios_internos')
          .update({ anexos: anexosUpload })
          .eq('id', commentData.id);

        if (updateError) {
          console.error('Erro ao atualizar comentário com anexos:', updateError);
          throw updateError;
        }
      }

      toast({
        title: "Comentário publicado",
        description: `Comentário adicionado${anexosUpload.length > 0 ? ` com ${anexosUpload.length} anexo(s)` : ''}.`,
      });

      setNewComment('');
      setAttachments(null);
      loadComments();
    } catch (error: any) {
      toast({
        title: "Erro ao publicar comentário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCommentLoading(false);
      setUploadingFiles(false);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!sla) return;

    setStatusLoading(newStatus); // Set which specific status is loading
    try {
      const oldStatus = sla.status;
      
      // Update UI immediately for better UX
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
        description: `SLA ${newStatus === 'fechado' ? 'fechado' : 'alterado'} com sucesso.`,
      });

      onUpdate();
      loadActionLogs();
    } catch (error: any) {
      // Revert UI change on error
      setSelectedSLA?.(sla);
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
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
        description: `Transferido para ${setorDestino?.nome} com sucesso.`,
      });

      setShowTransferForm(false);
      setSelectedSetor('');
      onUpdate();
      loadActionLogs();
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachments(e.target.files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadAttachment = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
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
              <div className={`transition-all duration-300 ${statusLoading ? 'animate-pulse' : ''}`}>
                {getStatusBadge(sla.status)}
              </div>
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
          {/* Ações de Status e Transferência */}
          <div className="flex flex-wrap gap-2 mb-6">
            {/* Botão de Transferência */}
            {(isAdmin || userSetores.some(us => us.setor_id === sla.setor_id)) && (
              <Button 
                variant="outline" 
                onClick={() => setShowTransferForm(!showTransferForm)}
                className="gap-2"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Transferir Setor
              </Button>
            )}
            {sla.status === 'aberto' && (
              <Button 
                variant="default" 
                onClick={() => handleChangeStatus('em_andamento')}
                disabled={statusLoading !== null}
                className="gap-2 min-w-[120px]"
              >
                {statusLoading === 'em_andamento' ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Iniciar
                  </>
                )}
              </Button>
            )}
            
            {sla.status === 'em_andamento' && (
              <>
                <Button 
                  variant="default" 
                  onClick={() => handleChangeStatus('resolvido')}
                  disabled={statusLoading !== null}
                  className="gap-2 min-w-[120px]"
                >
                  {statusLoading === 'resolvido' ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Resolvendo...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Resolver
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleChangeStatus('pausado')}
                  disabled={statusLoading !== null}
                  className="gap-2 min-w-[120px]"
                >
                  {statusLoading === 'pausado' ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Pausando...
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4" />
                      Pausar
                    </>
                  )}
                </Button>
              </>
            )}
            
            {sla.status === 'pausado' && (
              <Button 
                variant="default" 
                onClick={() => handleChangeStatus('em_andamento')}
                disabled={statusLoading !== null}
                className="gap-2 min-w-[120px]"
              >
                {statusLoading === 'em_andamento' ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Retomando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Retomar
                  </>
                )}
              </Button>
            )}
            
            {sla.status === 'resolvido' && (
              <>
                <Button 
                  variant="default" 
                  onClick={() => handleChangeStatus('fechado')}
                  disabled={statusLoading !== null}
                  className="gap-2 min-w-[120px]"
                >
                  {statusLoading === 'fechado' ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Fechando...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Fechar SLA
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleChangeStatus('em_andamento')}
                  disabled={statusLoading !== null}
                  className="gap-2 min-w-[120px]"
                >
                  {statusLoading === 'em_andamento' ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Reabrindo...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Reabrir SLA
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Formulário de Transferência */}
          {showTransferForm && (
            <Card className="mb-6 border-dashed">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Transferir para o setor:</label>
                    <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um setor" />
                      </SelectTrigger>
                      <SelectContent>
                        {setores
                          .filter(setor => setor.id !== sla.setor_id)
                          .map((setor) => (
                            <SelectItem key={setor.id} value={setor.id}>
                              {setor.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleTransferSetor}
                      disabled={!selectedSetor || transferLoading}
                      size="sm"
                    >
                      {transferLoading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                      )}
                      Transferir
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowTransferForm(false)}
                      size="sm"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                          {/* Área de anexos */}
                          {attachments && attachments.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">Anexos selecionados:</label>
                              <div className="flex flex-wrap gap-2">
                                {Array.from(attachments).map((file, index) => (
                                  <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                                    <FileText className="h-3 w-3" />
                                    <span>{file.name}</span>
                                    <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <Input
                                  type="file"
                                  multiple
                                  onChange={handleFileChange}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                                />
                                <Button variant="ghost" size="sm" className="h-8">
                                  <Paperclip className="h-4 w-4" />
                                </Button>
                               </div>
                               <div className="relative">
                                 <Button 
                                   variant="ghost" 
                                   size="sm" 
                                   className="h-8"
                                   onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                 >
                                   <Smile className="h-4 w-4" />
                                 </Button>
                                 {showEmojiPicker && (
                                   <div className="absolute bottom-full left-0 mb-2 p-2 bg-background border rounded-lg shadow-lg z-50">
                                     <div className="grid grid-cols-6 gap-1">
                                       {['😀', '😊', '👍', '👎', '❤️', '🎉', '😢', '😮', '😡', '🤔', '💡', '🔥', '✅', '❌', '⚠️', '📝', '🚀', '💯'].map((emoji) => (
                                         <Button
                                           key={emoji}
                                           variant="ghost"
                                           size="sm"
                                           className="h-8 w-8 p-0 text-lg hover:bg-muted"
                                           onClick={() => {
                                             setNewComment(prev => prev + emoji);
                                             setShowEmojiPicker(false);
                                           }}
                                         >
                                           {emoji}
                                         </Button>
                                       ))}
                                     </div>
                                   </div>
                                 )}
                               </div>
                            </div>
                            <Button 
                              onClick={handleAddComment}
                              disabled={!newComment.trim() || commentLoading || uploadingFiles}
                              size="sm"
                              className="h-8"
                            >
                              {(commentLoading || uploadingFiles) ? (
                                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              {uploadingFiles ? 'Enviando...' : commentLoading ? 'Publicando...' : 'Publicar'}
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
                    ) : (
                      <div className="space-y-4 pb-4">
                        {/* Comentário inicial - Descrição do SLA */}
                        <div className="mb-6 pb-4 border-b-2 border-dashed border-border/50">
                          <div className="flex gap-3">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className="text-xs bg-blue-500 text-white">
                                📋
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-sm">{sla.solicitante}</span>
                                  <Badge variant="outline" className="text-xs">
                                    Solicitante
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(sla.data_criacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
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
                                  {sla.descricao}
                                </p>
                                {sla.observacoes && (
                                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Observações:</p>
                                    <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                                      {sla.observacoes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Comentários da discussão */}
                        {comments.length === 0 ? (
                          <div className="text-center text-muted-foreground py-6">
                            <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Seja o primeiro a comentar neste SLA</p>
                          </div>
                        ) : (
                          comments.map((comment) => (
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
                                
                                {/* Anexos do comentário */}
                                {comment.anexos && comment.anexos.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    <div className="text-xs text-muted-foreground mb-1">📎 Anexos ({comment.anexos.length}):</div>
                                    {comment.anexos.map((anexo, index) => (
                                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs">
                                        <FileText className="h-3 w-3 text-muted-foreground" />
                                        <span className="flex-1">{anexo.nome}</span>
                                        <span className="text-muted-foreground">({formatFileSize(anexo.tamanho)})</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => downloadAttachment(anexo.url, anexo.nome)}
                                        >
                                          <Download className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
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