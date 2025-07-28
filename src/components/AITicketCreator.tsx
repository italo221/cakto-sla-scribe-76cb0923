import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Send, RefreshCw, CheckCircle } from "lucide-react";

interface AITicketCreatorProps {
  onTicketCreated?: () => void;
}

const setorOptions = [
  "Produto",
  "Compliance", 
  "Suporte",
  "Marketing",
  "Comercial",
  "Financeiro",
  "Tecnologia",
  "Recursos Humanos",
  "Jurídico",
  "Operações"
];

const impactoOptions = [
  { value: 'risco_grave', label: 'Risco grave (multas, prejuízo financeiro, problemas legais)', pontos: 25 },
  { value: 'prejuizo_medio', label: 'Prejuízo médio (retrabalho, atrasos, frustração do cliente)', pontos: 15 },
  { value: 'impacto_leve', label: 'Impacto leve (demanda importante, mas não urgente)', pontos: 10 },
  { value: 'sem_impacto', label: 'Sem impacto direto (demanda informacional ou preventiva)', pontos: 5 },
  { value: 'nao_sei', label: 'Não sei avaliar', pontos: 8 }
];

const tipoTicketOptions = [
  'Solicitação de tarefa',
  'Reporte de problema', 
  'Dúvida técnica',
  'Feedback / sugestão',
  'Atualização de projeto'
];

export default function AITicketCreator({ onTicketCreated }: AITicketCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'review' | 'complete'>('form');
  
  // Form data estruturado
  const [formData, setFormData] = useState({
    setor: '',
    titulo: '',
    descricao: '',
    impacto: '',
    justificativa_impacto: '',
    tipo_ticket: '',
    time_responsavel: '',
    nivel_criticidade: 'P3',
    pontuacao_total: 0
  });

  const calculateCriticality = (impacto: string) => {
    const impactoData = impactoOptions.find(opt => opt.value === impacto);
    const pontos = impactoData?.pontos || 5;
    
    let criticidade = 'P3';
    if (pontos >= 25) criticidade = 'P0';
    else if (pontos >= 15) criticidade = 'P1';
    else if (pontos >= 10) criticidade = 'P2';
    
    return { criticidade, pontos };
  };

  const handleFormSubmit = () => {
    // Validar campos obrigatórios
    if (!formData.setor || !formData.titulo || !formData.descricao || !formData.impacto || !formData.tipo_ticket) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios para continuar.",
        variant: "destructive",
      });
      return;
    }

    // Calcular criticidade automaticamente baseado no impacto
    const { criticidade, pontos } = calculateCriticality(formData.impacto);
    
    setFormData(prev => ({
      ...prev,
      time_responsavel: prev.setor, // Time responsável = setor selecionado
      nivel_criticidade: criticidade,
      pontuacao_total: pontos
    }));
    
    setStep('review');
  };

  const createTicket = async () => {
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
      const observacoes = `Criado via IA - Impacto: ${impactoOptions.find(opt => opt.value === formData.impacto)?.label}${formData.justificativa_impacto ? `\nJustificativa: ${formData.justificativa_impacto}` : ''}`;
      
      const { error } = await supabase
        .from('sla_demandas')
        .insert({
          titulo: formData.titulo,
          time_responsavel: formData.time_responsavel,
          solicitante: user.email || 'Usuário logado',
          descricao: formData.descricao,
          tipo_ticket: formData.tipo_ticket,
          nivel_criticidade: formData.nivel_criticidade,
          pontuacao_total: formData.pontuacao_total,
          pontuacao_financeiro: Math.floor(formData.pontuacao_total * 0.3),
          pontuacao_cliente: Math.floor(formData.pontuacao_total * 0.3),
          pontuacao_reputacao: Math.floor(formData.pontuacao_total * 0.2),
          pontuacao_urgencia: Math.floor(formData.pontuacao_total * 0.1),
          pontuacao_operacional: Math.floor(formData.pontuacao_total * 0.1),
          observacoes: observacoes,
          status: 'aberto'
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
      time_responsavel: '',
      nivel_criticidade: 'P3',
      pontuacao_total: 0
    });
  };

  const getCriticalityColor = (level: string) => {
    const colors = {
      'P0': 'bg-red-500 text-white',
      'P1': 'bg-orange-500 text-white', 
      'P2': 'bg-yellow-500 text-white',
      'P3': 'bg-blue-500 text-white'
    };
    return colors[level as keyof typeof colors] || colors.P3;
  };

  if (step === 'complete') {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-card dark:bg-card">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
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

  if (step === 'review') {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-card dark:bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Revisar Ticket
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                placeholder="Título do ticket"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Setor Responsável</label>
              <Select
                value={formData.setor}
                onValueChange={(value) => setFormData({...formData, setor: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {setorOptions.map(setor => (
                    <SelectItem key={setor} value={setor}>{setor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                rows={4}
                placeholder="Descrição detalhada do problema"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Impacto</label>
              <Select
                value={formData.impacto}
                onValueChange={(value) => setFormData({...formData, impacto: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {impactoOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Tipo de Ticket</label>
              <Select
                value={formData.tipo_ticket}
                onValueChange={(value) => setFormData({...formData, tipo_ticket: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tipoTicketOptions.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium">Criticidade Calculada:</div>
              <span className={`px-3 py-1 rounded text-sm font-medium ${getCriticalityColor(formData.nivel_criticidade)}`}>
                {formData.nivel_criticidade} - {formData.pontuacao_total} pontos
              </span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={() => setStep('form')} variant="outline" className="flex-1">
              Voltar
            </Button>
            <Button onClick={createTicket} disabled={loading} className="flex-1">
              {loading ? 'Criando...' : 'Criar Ticket'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-card dark:bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Criação Estruturada de Ticket
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Setor *</label>
            <Select
              value={formData.setor}
              onValueChange={(value) => setFormData({...formData, setor: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor responsável" />
              </SelectTrigger>
              <SelectContent>
                {setorOptions.map(setor => (
                  <SelectItem key={setor} value={setor}>{setor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Título *</label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({...formData, titulo: e.target.value})}
              placeholder="Título resumido do ticket"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Descrição *</label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              placeholder="Descreva detalhadamente o problema ou solicitação"
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Qual é o impacto dessa demanda se não for realizada? *</label>
            <Select
              value={formData.impacto}
              onValueChange={(value) => setFormData({...formData, impacto: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o nível de impacto" />
              </SelectTrigger>
              <SelectContent>
                {impactoOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Justificativa do impacto (opcional)</label>
            <Textarea
              value={formData.justificativa_impacto}
              onChange={(e) => setFormData({...formData, justificativa_impacto: e.target.value})}
              placeholder="Explique brevemente sua escolha de impacto"
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Tipo de ticket *</label>
            <Select
              value={formData.tipo_ticket}
              onValueChange={(value) => setFormData({...formData, tipo_ticket: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de ticket" />
              </SelectTrigger>
              <SelectContent>
                {tipoTicketOptions.map(tipo => (
                  <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Informações importantes:</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• A criticidade será calculada automaticamente baseada no impacto selecionado</li>
            <li>• O setor selecionado será responsável pelo atendimento</li>
            <li>• Campos marcados com * são obrigatórios</li>
          </ul>
        </div>
        
        <Button 
          onClick={handleFormSubmit} 
          className="w-full gap-2"
        >
          <Send className="h-4 w-4" />
          Processar Ticket
        </Button>
      </CardContent>
    </Card>
  );
}