import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import SetorValidationAlert from "@/components/SetorValidationAlert";
import { Send, CheckCircle, RefreshCw, FileText } from "lucide-react";

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
  { label: 'Solicitação de tarefa', value: 'sugestao_melhoria' },
  { label: 'Reporte de problema', value: 'bug' }, 
  { label: 'Dúvida técnica', value: 'sugestao_melhoria' },
  { label: 'Feedback/sugestão', value: 'sugestao_melhoria' },
  { label: 'Atualização de projeto', value: 'sugestao_melhoria' }
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
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'complete'>('form');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [setores, setSetores] = useState<{id: string, nome: string}[]>([]);
  
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
    pontuacao_total: 0
  });

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
    
    if (!formData.setor) newErrors.setor = 'Campo obrigatório';
    if (!formData.titulo) newErrors.titulo = 'Campo obrigatório';
    if (!formData.descricao) newErrors.descricao = 'Campo obrigatório';
    if (!formData.impacto) newErrors.impacto = 'Campo obrigatório';
    if (!formData.tipo_ticket) newErrors.tipo_ticket = 'Campo obrigatório';
    
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
      // Calcular criticidade automaticamente baseado no impacto
      const { criticidade, pontos } = calculateCriticality(formData.impacto);
      
      const observacoes = `Criado manualmente - Impacto: ${impactoOptions.find(opt => opt.value === formData.impacto)?.label}${formData.justificativa_impacto ? `\nJustificativa: ${formData.justificativa_impacto}` : ''}`;
      
      // IMPORTANTE: O setor selecionado é quem deve ser responsável, não o criador
      const { error } = await supabase
        .from('sla_demandas')
        .insert({
          titulo: formData.titulo,
          time_responsavel: formData.setor, // Setor selecionado = responsável
          solicitante: user.email || 'Usuário logado', // Criador = solicitante
          descricao: formData.descricao,
          tipo_ticket: formData.tipo_ticket || 'sugestao_melhoria',
          nivel_criticidade: criticidade,
          pontuacao_total: pontos,
          pontuacao_financeiro: Math.floor(pontos * 0.3),
          pontuacao_cliente: Math.floor(pontos * 0.3),
          pontuacao_reputacao: Math.floor(pontos * 0.2),
          pontuacao_urgencia: Math.floor(pontos * 0.1),
          pontuacao_operacional: Math.floor(pontos * 0.1),
          observacoes: observacoes,
          status: 'aberto',
          setor_id: setores.find(s => s.nome === formData.setor)?.id // Adicionar setor_id
        });

      if (error) throw error;

      setStep('complete');
      toast({
        title: "Ticket criado com sucesso!",
        description: "Seu ticket foi registrado e está aguardando atendimento.",
      });
      
      onTicketCreated?.();
      
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      toast({
        title: "Erro ao criar ticket",
        description: "Houve um problema ao salvar o ticket. Tente novamente.",
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
      pontuacao_total: 0
    });
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
          <Button onClick={resetForm} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Criar Outro Ticket
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-card dark:bg-card border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Criar Ticket
        </CardTitle>
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
                  <SelectItem key={setor.id} value={setor.nome}>{setor.nome}</SelectItem>
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
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {getCharacterCount(formData.descricao, 500)}
            </p>
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
                  <SelectItem key={option.value} value={option.value}>
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
              <SelectContent className="bg-popover border border-border z-50">
                {tipoTicketOptions.map(tipo => (
                  <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipo_ticket && <p className="text-sm text-destructive">{errors.tipo_ticket}</p>}
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