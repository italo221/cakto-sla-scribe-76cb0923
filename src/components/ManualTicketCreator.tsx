import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamTagSelector } from "@/components/ui/team-tag-selector";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

import { supabase } from "@/integrations/supabase/client";
import SetorValidationAlert from "@/components/SetorValidationAlert";
import FileUploader from "@/components/FileUploader";
import LinkInput from "@/components/LinkInput";
import { Send, CheckCircle, RefreshCw, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { validateTicketData, sanitizeTicketData } from "@/utils/ticketAuditService";

interface ManualTicketCreatorProps {
  onTicketCreated?: () => void;
}

// Setores serão buscados dinamicamente do banco

const impactoOptions = [
  { value: 'risco_grave', label: 'Risco grave (multas, prejuízo financeiro, problemas legais)', pontos: 25 },
  { value: 'prejuizo_medio', label: 'Prejuízo médio (retrabalho, atrasos, frustração do cliente)', pontos: 15 },
  { value: 'impacto_leve', label: 'Impacto leve (demanda importante, mas não urgente)', pontos: 10 },
  { value: 'sem_impacto', label: 'Sem impacto direto (demanda informacional ou preventiva)', pontos: 5 },
  { value: 'nao_sei', label: 'Não sei avaliar', pontos: 8 }
];

const tipoTicketOptions = [
  { label: 'Solicitação de tarefa', value: 'solicitacao_tarefa' },
  { label: 'Reporte de problema', value: 'bug' }, 
  { label: 'Dúvida técnica', value: 'duvida_tecnica' },
  { label: 'Feedback/sugestão', value: 'feedback_sugestao' },
  { label: 'Atualização de projeto', value: 'atualizacao_projeto' }
];

const perguntasPorSetor = {
  Marketing: [
    'Qual plataforma está envolvida? (Instagram, Facebook, Google Ads, etc.)',
    'Há alguma campanha ativa relacionada? Se sim, qual?'
  ],
  Financeiro: [
    'Há impacto monetário direto? Se sim, qual valor aproximado?',
    'Existe algum vencimento relacionado? Qual data?'
  ],
  'Recursos Humanos': [
    'Impacta folha de pagamento, admissão ou desligamento?'
  ],
  Operações: [
    'Há atraso logístico? Qual processo está afetado?',
    'Existe erro de cadastro? Em qual sistema?'
  ],
  Tecnologia: [
    'Qual sistema ou ferramenta está envolvida?',
    'É um bug ou uma nova funcionalidade?'
  ],
  Comercial: [
    'Está relacionado a qual cliente ou prospect?',
    'Há impacto nas vendas ou negociações em andamento?'
  ],
  Compliance: [
    'Qual regulamentação está envolvida?',
    'Há risco de multa ou penalidade?'
  ],
  Suporte: [
    'Quantos usuários estão afetados?',
    'Qual o nível de severidade do problema?'
  ],
  default: [
    'Qual a urgência desta demanda?',
    'Há risco de retrabalho se não for tratado agora?'
  ]
};

export default function ManualTicketCreator({ onTicketCreated }: ManualTicketCreatorProps) {
  const { user } = useAuth();
  const { canCreateTicket, getSetorValidationMessage } = usePermissions();
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'complete'>('form');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [setores, setSetores] = useState<{id: string, nome: string}[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    setor: '',
    titulo: '',
    descricao: '',
    impacto: '',
    justificativa_impacto: '',
    tipo_ticket: '',
    pergunta_especifica_1: '',
    pergunta_especifica_2: '',
    time_responsavel: '',
    nivel_criticidade: 'P3',
    pontuacao_total: 0,
    link_referencia: ''
  });
  const [anexos, setAnexos] = useState<Array<{id: string, name: string, url: string, type: string, size: number, storagePath?: string}>>([]);

  // Buscar setores do banco
  useEffect(() => {
    const fetchSetores = async () => {
      try {
        const { data, error } = await supabase
          .from('setores')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome');
        
        if (error) throw error;
        setSetores(data || []);
      } catch (error) {
        console.error('Erro ao buscar setores:', error);
        toast({
          title: "Erro ao carregar setores",
          description: "Não foi possível carregar a lista de setores.",
          variant: "destructive",
        });
      }
    };

    fetchSetores();
  }, []);

  const calculateCriticality = (impacto: string) => {
    const impactoData = impactoOptions.find(opt => opt.value === impacto);
    const pontos = impactoData?.pontos || 5;
    
    let criticidade = 'P3';
    if (pontos >= 25) criticidade = 'P0';
    else if (pontos >= 15) criticidade = 'P1';
    else if (pontos >= 10) criticidade = 'P2';
    
    return { criticidade, pontos };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validações mais rigorosas com trim() para evitar espaços vazios
    if (!formData.setor || formData.setor.trim() === '') {
      newErrors.setor = 'Campo obrigatório';
    }
    
    if (!formData.titulo || formData.titulo.trim() === '') {
      newErrors.titulo = 'Campo obrigatório';
    } else if (formData.titulo.trim().length < 3) {
      newErrors.titulo = 'Título deve ter pelo menos 3 caracteres';
    }
    
    if (!formData.descricao || formData.descricao.trim() === '') {
      newErrors.descricao = 'Campo obrigatório';
    } else if (formData.descricao.trim().length < 10) {
      newErrors.descricao = 'Descrição deve ter pelo menos 10 caracteres';
    }
    
    if (!formData.impacto || formData.impacto.trim() === '') {
      newErrors.impacto = 'Campo obrigatório';
    }
    
    if (!formData.tipo_ticket || formData.tipo_ticket.trim() === '') {
      newErrors.tipo_ticket = 'Campo obrigatório';
    }
    
    // Validar se o setor selecionado existe na lista
    const setorExists = setores.some(setor => setor.nome === formData.setor);
    if (formData.setor && !setorExists) {
      newErrors.setor = 'Setor selecionado inválido';
    }

    // Pelo menos uma tag obrigatória
    if (selectedTags.length === 0) {
      newErrors.tags = 'Adicione pelo menos uma tag';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // Verificar validações de setor
    const setorValidationMessage = getSetorValidationMessage();
    if (setorValidationMessage) {
      toast({
        title: "Acesso negado",
        description: setorValidationMessage,
        variant: "destructive",
      });
      return;
    }

    // VALIDAÇÃO CRÍTICA: Verificar campos obrigatórios antes de prosseguir
    if (!validateForm()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para criar tickets.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // VALIDAÇÃO DUPLA: Verificar novamente os campos críticos
      const titulo = formData.titulo.trim();
      const descricao = formData.descricao.trim();
      const setor = formData.setor.trim();
      const solicitante = user.email || user.user_metadata?.email || 'Usuário logado';
      
      if (!titulo || !descricao || !setor) {
        throw new Error('Campos obrigatórios não preenchidos');
      }

      // Verificar se o setor existe
      const setorSelecionado = setores.find(s => s.nome === setor);
      if (!setorSelecionado) {
        throw new Error('Setor selecionado não encontrado');
      }

      // Calcular criticidade automaticamente baseado no impacto
      const { criticidade, pontos } = calculateCriticality(formData.impacto);
      
      const observacoes = `Criado manualmente - Impacto: ${impactoOptions.find(opt => opt.value === formData.impacto)?.label}${formData.justificativa_impacto ? `\nJustificativa: ${formData.justificativa_impacto}` : ''}`;
      
      // INSERÇÃO COM VALIDAÇÃO MÁXIMA
      const ticketData = {
        titulo: titulo, // Título validado e limpo
        time_responsavel: setor, // Setor selecionado = responsável
        solicitante: solicitante, // Criador = solicitante
        descricao: descricao, // Descrição validada e limpa
        tipo_ticket: formData.tipo_ticket || 'sugestao_melhoria',
        nivel_criticidade: criticidade,
        pontuacao_total: pontos,
        pontuacao_financeiro: Math.floor(pontos * 0.3),
        pontuacao_cliente: Math.floor(pontos * 0.3),
        pontuacao_reputacao: Math.floor(pontos * 0.2),
        pontuacao_urgencia: Math.floor(pontos * 0.1),
        pontuacao_operacional: Math.floor(pontos * 0.1),
        observacoes: observacoes,
        status: 'aberto', // Status obrigatório
        setor_id: setorSelecionado.id, // ID do setor validado
        tags: selectedTags.length > 0 ? selectedTags : null,
        link_referencia: formData.link_referencia.trim() || null,
        anexos: anexos.length > 0 ? JSON.stringify(anexos) : null
      };

      // VALIDAÇÃO FINAL com serviço de auditoria
      const sanitizedData = sanitizeTicketData(ticketData);
      const validation = validateTicketData(sanitizedData);
      
      if (!validation.valid) {
        throw new Error(`Falha na validação: ${validation.errors.join(', ')}`);
      }

      console.log('Criando ticket com dados validados:', sanitizedData);

      const { data, error } = await supabase
        .from('sla_demandas')
        .insert(sanitizedData)
        .select('id, titulo, ticket_number')
        .single();

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      console.log('Ticket criado com sucesso:', data);

      // Persistir anexos no banco (tabela ticket_attachments) e mover arquivos para pasta do ticket
      try {
        if (data?.id && anexos.length > 0) {
          const moved = await Promise.all(anexos.map(async (f) => {
            const oldPath = (f as any).storagePath || f.id; // caminho usado no upload inicial
            const newPath = `${data.id}/${oldPath}`; // tickets bucket: pasta por ticket
            try {
              // mover para pasta do ticket
              const { error: moveErr } = await supabase.storage
                .from('tickets')
                .move(oldPath, newPath);
              if (moveErr) {
                console.warn('Falha ao mover arquivo, usando caminho original:', moveErr);
                return { ...f, storagePath: oldPath };
              }
              return { ...f, storagePath: newPath };
            } catch (e) {
              console.warn('Erro ao mover arquivo:', e);
              return { ...f, storagePath: oldPath };
            }
          }));

          const rows = moved.map((f) => ({
            ticket_id: data.id,
            file_name: f.name,
            mime_type: f.type,
            size: f.size,
            storage_path: (f as any).storagePath,
            uploaded_by: user.id
          }));

          const { error: attachErr } = await supabase.from('ticket_attachments').insert(rows);
          if (attachErr) {
            console.warn('Falha ao salvar anexos em ticket_attachments:', attachErr);
          }
        }
      } catch (attachError) {
        console.warn('Erro ao persistir anexos:', attachError);
      }


      setStep('complete');
      toast({
        title: "Ticket criado com sucesso!",
        description: `Ticket ${data?.ticket_number || ''} foi registrado e está aguardando atendimento.`,
      });
      
      onTicketCreated?.();
      
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      
      // Erro mais específico baseado no tipo
      let errorMessage = "Houve um problema ao salvar o ticket. Tente novamente.";
      
      if (error instanceof Error) {
        if (error.message.includes('obrigatório')) {
          errorMessage = "Todos os campos obrigatórios devem ser preenchidos corretamente.";
        } else if (error.message.includes('violates')) {
          errorMessage = "Os dados fornecidos não atendem aos critérios de validação. Verifique os campos.";
        }
      }
      
      toast({
        title: "Erro ao criar ticket",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('form');
    setFormData({
      setor: '',
      titulo: '',
      descricao: '',
      impacto: '',
      justificativa_impacto: '',
      tipo_ticket: '',
      pergunta_especifica_1: '',
      pergunta_especifica_2: '',
      time_responsavel: '',
      nivel_criticidade: 'P3',
      pontuacao_total: 0,
      link_referencia: ''
    });
    setSelectedTags([]);
    setAnexos([]);
    setErrors({});
  };

  const getCharacterCount = (text: string, limit: number) => {
    return `${text.length}/${limit} caracteres`;
  };

  const getPerguntasEspecificas = () => {
    if (!formData.setor) return [];
    return perguntasPorSetor[formData.setor as keyof typeof perguntasPorSetor] || perguntasPorSetor.default;
  };

  if (step === 'complete') {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-card dark:bg-card border border-border">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-500 mb-2">
            Ticket Criado com Sucesso!
          </h3>
          <p className="text-muted-foreground mb-6">
            Seu ticket foi registrado e nossa equipe foi notificada. 
            Você receberá atualizações sobre o progresso.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={resetForm} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Criar Outro Ticket
            </Button>
            <Button 
              onClick={() => navigate('/inbox')} 
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Ver Ticket Criado
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-card dark:bg-card border border-border">
      <CardHeader>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alerta de validação de setor */}
        <SetorValidationAlert />
        <div className="space-y-4">
          {/* Setor */}
          <div>
            <label className="text-sm font-medium">A qual setor está relacionado este ticket? *</label>
            <Select
              value={formData.setor}
              onValueChange={(value) => setFormData({...formData, setor: value})}
            >
              <SelectTrigger className={errors.setor ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione o setor responsável" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {setores.map(setor => (
                  <SelectItem 
                    key={setor.id} 
                    value={setor.nome}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                  >
                    {setor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.setor && <p className="text-sm text-destructive">{errors.setor}</p>}
          </div>

          {/* Perguntas específicas removidas conforme solicitado */}

          {/* Título */}
          <div>
            <label className="text-sm font-medium">Título *</label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({...formData, titulo: e.target.value})}
              placeholder="Título resumido do ticket"
              className={errors.titulo ? 'border-destructive' : ''}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {getCharacterCount(formData.titulo, 100)}
            </p>
            {errors.titulo && <p className="text-sm text-destructive">{errors.titulo}</p>}
          </div>

          {/* Descrição */}
          <div>
            <label className="text-sm font-medium">Descrição *</label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              placeholder="Descreva detalhadamente o problema ou solicitação"
              rows={4}
              className={errors.descricao ? 'border-destructive' : ''}
            />
            {errors.descricao && <p className="text-sm text-destructive">{errors.descricao}</p>}
          </div>

          {/* Impacto */}
          <div>
            <label className="text-sm font-medium">Qual é o impacto dessa demanda se não for realizada? *</label>
            <Select
              value={formData.impacto}
              onValueChange={(value) => setFormData({...formData, impacto: value})}
            >
              <SelectTrigger className={errors.impacto ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione o nível de impacto" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {impactoOptions.map(option => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.impacto && <p className="text-sm text-destructive">{errors.impacto}</p>}
          </div>

          {/* Justificativa do impacto */}
          <div>
            <label className="text-sm font-medium">Justificativa do impacto (opcional)</label>
            <Textarea
              value={formData.justificativa_impacto}
              onChange={(e) => setFormData({...formData, justificativa_impacto: e.target.value})}
              placeholder="Explique brevemente sua escolha de impacto"
              rows={2}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground">
              {getCharacterCount(formData.justificativa_impacto, 300)}
            </p>
          </div>

          {/* Tipo de ticket */}
          <div>
            <label className="text-sm font-medium">Tipo de ticket *</label>
            <Select
              value={formData.tipo_ticket}
              onValueChange={(value) => setFormData({...formData, tipo_ticket: value})}
            >
              <SelectTrigger className={errors.tipo_ticket ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione o tipo de ticket" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50 max-h-60 overflow-auto">
                {tipoTicketOptions.map(tipo => (
                  <SelectItem 
                    key={tipo.value} 
                    value={tipo.value}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipo_ticket && <p className="text-sm text-destructive">{errors.tipo_ticket}</p>}
          </div>

          {/* Link de referência */}
          <div>
            <label className="text-sm font-medium">Link de referência (opcional)</label>
            <LinkInput
              value={formData.link_referencia}
              onChange={(value) => setFormData({...formData, link_referencia: value})}
              placeholder="https://exemplo.com/pagina-relacionada"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Link para página relacionada ao problema ou solicitação
            </p>
          </div>

          {/* Anexos */}
          <div>
            <label className="text-sm font-medium">Anexos (opcional)</label>
            <FileUploader
              files={anexos}
              onFilesChange={setAnexos}
              maxFiles={3}
              maxSizeMB={10}
              acceptedTypes={[
                'image/png','image/jpg','image/jpeg','image/webp','application/pdf','video/mp4','video/webm'
              ]}
              bucket="tickets"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Imagens (PNG, JPG, WebP) até 10MB, PDF e vídeos (MP4, WebM) até 25MB • Máximo 3 arquivos
            </p>
          </div>

          {/* Tags Organizadas por Time */}
          <div>
            <TeamTagSelector
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              placeholder="Selecione tags para categorizar o ticket..."
              maxTags={5}
              allowCreateTag={true}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Selecione primeiro um time, depois escolha as tags apropriadas para categorizar este ticket
            </p>
            {errors.tags && <p className="text-sm text-destructive mt-1">{errors.tags}</p>}
          </div>
        </div>
        
        <div className="bg-muted/50 dark:bg-muted/30 p-4 rounded-lg border border-muted">
          <h4 className="font-medium text-foreground mb-2">Informações importantes:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• A criticidade será calculada automaticamente baseada no impacto selecionado</li>
            <li>• O setor selecionado será responsável pelo atendimento</li>
            <li>• Campos marcados com * são obrigatórios</li>
          </ul>
        </div>
        
        <Button 
          onClick={handleSubmit} 
          disabled={loading}
          className="w-full gap-2"
        >
          <Send className="h-4 w-4" />
          {loading ? 'Criando ticket...' : 'Criar Ticket'}
        </Button>
      </CardContent>
    </Card>
  );
}