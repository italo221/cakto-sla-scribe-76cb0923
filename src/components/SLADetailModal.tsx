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
  MoreHorizontal
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

export default function SLADetailModal({ sla, isOpen, onClose, onUpdate }: SLADetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [setores, setSetores] = useState<Setor[]>([]);
  const [selectedSetor, setSelectedSetor] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (sla && isOpen) {
      loadComments();
      loadSetores();
    }
  }, [sla, isOpen]);

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
    if (!sla || !newComment.trim()) return;

    setCommentLoading(true);
    try {
      // Vamos usar um setor padrão ou permitir que o usuário selecione
      const defaultSetorId = setores[0]?.id;
      
      if (!defaultSetorId) {
        toast({
          title: "Erro",
          description: "Nenhum setor disponível para comentários.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.rpc('add_sla_comment', {
        p_sla_id: sla.id,
        p_setor_id: defaultSetorId,
        p_comentario: newComment.trim()
      });

      if (error) throw error;

      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi adicionado com sucesso.",
      });

      setNewComment('');
      loadComments();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar comentário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCommentLoading(false);
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

  if (!sla) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {sla.ticket_number || `#${sla.id.slice(0, 8)}`} - {sla.titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
          {/* Coluna Principal - Detalhes */}
          <div className="lg:col-span-2 space-y-4 overflow-y-auto max-h-[70vh]">
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

          {/* Coluna de Comentários */}
          <div className="space-y-4 overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comentários ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                {/* Novo Comentário */}
                <div className="space-y-2 mb-4">
                  <Textarea
                    placeholder="Adicione um comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || commentLoading}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {commentLoading ? 'Enviando...' : 'Enviar Comentário'}
                  </Button>
                </div>

                <Separator className="my-4" />

                {/* Lista de Comentários */}
                <ScrollArea className="flex-1">
                  {comments.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum comentário ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(comment.autor_nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{comment.autor_nome}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(comment.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                </span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-foreground">{comment.comentario}</p>
                            <div className="flex items-center gap-2 pt-1">
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                Útil
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                Responder
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}