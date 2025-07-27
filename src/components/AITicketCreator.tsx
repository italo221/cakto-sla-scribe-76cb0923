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

const timeOptions = [
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

export default function AITicketCreator({ onTicketCreated }: AITicketCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [step, setStep] = useState<'input' | 'review' | 'complete'>('input');
  
  // Form data
  const [userInput, setUserInput] = useState('');
  const [ticketData, setTicketData] = useState({
    titulo: '',
    time_responsavel: '',
    descricao: '',
    tipo_ticket: 'bug',
    observacoes: '',
    nivel_criticidade: 'P3',
    pontuacao_total: 0
  });

  const processWithAI = async () => {
    if (!userInput.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite a descrição do problema para continuar.",
        variant: "destructive",
      });
      return;
    }

    setAiProcessing(true);
    try {
      // Simular processamento da IA
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // IA simplificada - análise básica baseada em palavras-chave
      const input = userInput.toLowerCase();
      
      // Determinar criticidade baseada em palavras-chave
      let criticidade = 'P3';
      let pontuacao = 5;
      
      if (input.includes('crítico') || input.includes('urgente') || input.includes('parado') || input.includes('não funciona')) {
        criticidade = 'P0';
        pontuacao = 25;
      } else if (input.includes('importante') || input.includes('cliente') || input.includes('problema')) {
        criticidade = 'P1'; 
        pontuacao = 15;
      } else if (input.includes('melhoria') || input.includes('sugestão')) {
        criticidade = 'P2';
        pontuacao = 10;
      }
      
      // Determinar time responsável baseado em palavras-chave
      let time = 'Suporte';
      if (input.includes('site') || input.includes('sistema') || input.includes('bug') || input.includes('erro')) {
        time = 'Tecnologia';
      } else if (input.includes('venda') || input.includes('cliente') || input.includes('contrato')) {
        time = 'Comercial';
      } else if (input.includes('pagamento') || input.includes('cobrança') || input.includes('fatura')) {
        time = 'Financeiro';
      } else if (input.includes('marketing') || input.includes('campanha') || input.includes('divulgação')) {
        time = 'Marketing';
      }
      
      // Gerar título automaticamente
      const titulo = userInput.length > 50 
        ? userInput.substring(0, 50) + '...'
        : userInput;

      setTicketData({
        titulo: titulo,
        time_responsavel: time,
        descricao: userInput,
        tipo_ticket: input.includes('melhoria') ? 'feature' : 'bug',
        observacoes: 'Criado via IA - Análise automática',
        nivel_criticidade: criticidade,
        pontuacao_total: pontuacao
      });
      
      setStep('review');
      
    } catch (error) {
      console.error('Erro ao processar com IA:', error);
      toast({
        title: "Erro na IA",
        description: "Falha ao processar com IA. Preencha manualmente.",
        variant: "destructive",
      });
      
      // Fallback manual
      setTicketData({
        titulo: userInput.substring(0, 50) + (userInput.length > 50 ? '...' : ''),
        time_responsavel: 'Suporte',
        descricao: userInput,
        tipo_ticket: 'bug',
        observacoes: 'Criado manualmente - IA indisponível',
        nivel_criticidade: 'P3',
        pontuacao_total: 5
      });
      setStep('review');
    } finally {
      setAiProcessing(false);
    }
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
      const { error } = await supabase
        .from('sla_demandas')
        .insert({
          titulo: ticketData.titulo,
          time_responsavel: ticketData.time_responsavel,
          solicitante: user.email || 'Usuário logado',
          descricao: ticketData.descricao,
          tipo_ticket: ticketData.tipo_ticket,
          nivel_criticidade: ticketData.nivel_criticidade,
          pontuacao_total: ticketData.pontuacao_total,
          pontuacao_financeiro: Math.floor(ticketData.pontuacao_total * 0.3),
          pontuacao_cliente: Math.floor(ticketData.pontuacao_total * 0.3),
          pontuacao_reputacao: Math.floor(ticketData.pontuacao_total * 0.2),
          pontuacao_urgencia: Math.floor(ticketData.pontuacao_total * 0.1),
          pontuacao_operacional: Math.floor(ticketData.pontuacao_total * 0.1),
          observacoes: ticketData.observacoes,
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
    setStep('input');
    setUserInput('');
    setTicketData({
      titulo: '',
      time_responsavel: '',
      descricao: '',
      tipo_ticket: 'bug',
      observacoes: '',
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
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-700 mb-2">
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
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Revisar Ticket Gerado pela IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                value={ticketData.titulo}
                onChange={(e) => setTicketData({...ticketData, titulo: e.target.value})}
                placeholder="Título do ticket"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Time Responsável</label>
              <Select
                value={ticketData.time_responsavel}
                onValueChange={(value) => setTicketData({...ticketData, time_responsavel: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={ticketData.descricao}
                onChange={(e) => setTicketData({...ticketData, descricao: e.target.value})}
                rows={4}
                placeholder="Descrição detalhada do problema"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select
                  value={ticketData.tipo_ticket}
                  onValueChange={(value) => setTicketData({...ticketData, tipo_ticket: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug/Problema</SelectItem>
                    <SelectItem value="feature">Melhoria</SelectItem>
                    <SelectItem value="support">Suporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Criticidade</label>
                <div className="flex items-center gap-2">
                  <Select
                    value={ticketData.nivel_criticidade}
                    onValueChange={(value) => setTicketData({...ticketData, nivel_criticidade: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P0">P0 - Crítico</SelectItem>
                      <SelectItem value="P1">P1 - Alto</SelectItem>
                      <SelectItem value="P2">P2 - Médio</SelectItem>
                      <SelectItem value="P3">P3 - Baixo</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCriticalityColor(ticketData.nivel_criticidade)}`}>
                    {ticketData.pontuacao_total} pts
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={() => setStep('input')} variant="outline" className="flex-1">
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Criação Inteligente de Ticket
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Descreva o problema ou solicitação
          </label>
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ex: O sistema está apresentando erro ao fazer login, usuários não conseguem acessar..."
            rows={6}
            disabled={aiProcessing}
          />
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Dicas para melhor resultado</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Seja específico sobre o problema</li>
            <li>• Mencione se é urgente ou crítico</li>
            <li>• Inclua detalhes sobre impacto nos usuários</li>
            <li>• Descreva passos para reproduzir o problema</li>
          </ul>
        </div>
        
        <Button 
          onClick={processWithAI} 
          disabled={!userInput.trim() || aiProcessing}
          className="w-full gap-2"
        >
          {aiProcessing ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              Processando com IA...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Processar com IA
            </>
          )}
        </Button>
        
        {!userInput.trim() && (
          <p className="text-xs text-muted-foreground text-center">
            Digite a descrição do problema para ativar a IA
          </p>
        )}
      </CardContent>
    </Card>
  );
}