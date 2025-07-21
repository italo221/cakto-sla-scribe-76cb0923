import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, FileText, MessageCircle, Calculator, Upload, X, File, Image, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  type: 'assistant' | 'user';
  content: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface SLAData {
  titulo: string;
  time_responsavel: string;
  solicitante: string;
  descricao: string;
  pontuacao: {
    financeiro: number;
    cliente: number;
    reputacao: number;
    urgencia: number;
    operacional: number;
  };
  observacoes: string;
  arquivos: UploadedFile[];
}

interface CriteriaOption {
  value: number;
  label: string;
}

const criteriaOptions: Record<string, CriteriaOption[]> = {
  financeiro: [
    { value: 10, label: "Perda > R$50.000 ou multa grave (10 pts)" },
    { value: 6, label: "Perda entre R$5.000 e R$50.000 (6 pts)" },
    { value: 3, label: "Perda < R$5.000 (3 pts)" },
    { value: 0, label: "Nenhum impacto direto (0 pts)" }
  ],
  cliente: [
    { value: 8, label: "Todos os clientes ou um Top 10 produtor (8 pts)" },
    { value: 5, label: "Um grupo ou cliente de alto valor (5 pts)" },
    { value: 2, label: "Um cliente médio/baixo valor (2 pts)" },
    { value: 0, label: "Sem impacto direto no cliente (0 pts)" }
  ],
  reputacao: [
    { value: 7, label: "Pode gerar mídia negativa ou quebra com parceiros (7 pts)" },
    { value: 3, label: "Comentários negativos pontuais (3 pts)" },
    { value: 0, label: "Nenhum risco reputacional (0 pts)" }
  ],
  urgencia: [
    { value: 5, label: "Muito urgente – precisa ser resolvido hoje (5 pts)" },
    { value: 2, label: "Importante – tem prazo interno essa semana (2 pts)" },
    { value: 0, label: "Sem pressa – pode ser feito quando der (0 pts)" }
  ],
  operacional: [
    { value: 4, label: "Sim, equipe parada aguardando (4 pts)" },
    { value: 2, label: "Sim, mas não estão 100% travadas (2 pts)" },
    { value: 0, label: "Não está bloqueando ninguém (0 pts)" }
  ]
};

const criteriaLabels = {
  financeiro: "🔢 1. Financeiro",
  cliente: "👥 2. Cliente", 
  reputacao: "📣 3. Reputação",
  urgencia: "⏱ 4. Urgência",
  operacional: "🔒 5. Operacional"
};

const criteriaQuestions = {
  financeiro: "Qual o impacto financeiro se isso não for feito?",
  cliente: "Quem será impactado?",
  reputacao: "Risco para a imagem da Cakto?",
  urgencia: "Qual o nível de urgência?",
  operacional: "Está travando outras áreas?"
};

type Step = 'welcome' | 'titulo' | 'time' | 'solicitante' | 'descricao' | 'criteria' | 'observacoes' | 'complete';

export default function SLAChat() {
  const [step, setStep] = useState<Step>('welcome');
  const [currentCriteria, setCurrentCriteria] = useState<string>('financeiro');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [slaData, setSlaData] = useState<SLAData>({
    titulo: '',
    time_responsavel: '',
    solicitante: '',
    descricao: '',
    pontuacao: {
      financeiro: 0,
      cliente: 0,
      reputacao: 0,
      urgencia: 0,
      operacional: 0
    },
    observacoes: '',
    arquivos: []
  });
  const { toast } = useToast();

  const addMessage = (type: 'assistant' | 'user', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const calculateCriticality = (pontuacao: SLAData['pontuacao']) => {
    const total = Object.values(pontuacao).reduce((sum, value) => sum + value, 0);
    
    if (total >= 30) return 'P0';
    if (total >= 20) return 'P1';
    if (total >= 10) return 'P2';
    return 'P3';
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'P0': return 'bg-destructive text-destructive-foreground';
      case 'P1': return 'bg-orange-500 text-white';
      case 'P2': return 'bg-yellow-500 text-black';
      case 'P3': return 'bg-green-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleStart = () => {
    setStep('titulo');
    addMessage('assistant', 'Olá! Sou a IA da Cakto para abertura de SLAs. Vou te ajudar a organizar sua demanda e calcular a criticidade.\n\n🧾 **Título da Demanda:**\nDescreva o título da sua demanda (ex: "Liberação de produtor para lançamento")');
  };

  const handleInput = (value: string) => {
    addMessage('user', value);
    
    switch (step) {
      case 'titulo':
        setSlaData(prev => ({ ...prev, titulo: value }));
        setStep('time');
        addMessage('assistant', '👥 **Time Responsável:**\nQual time será responsável? (ex: Produto, Compliance, Suporte, Marketing...)');
        break;
        
      case 'time':
        setSlaData(prev => ({ ...prev, time_responsavel: value }));
        setStep('solicitante');
        addMessage('assistant', '🙋‍♂️ **Nome do Solicitante:**\nQuem está fazendo a solicitação? (ex: João Silva – Comercial)');
        break;
        
      case 'solicitante':
        setSlaData(prev => ({ ...prev, solicitante: value }));
        setStep('descricao');
        addMessage('assistant', '📝 **Descrição Resumida da Demanda:**\nDescreva brevemente o que está acontecendo (seja claro e direto)');
        break;
        
      case 'descricao':
        setSlaData(prev => ({ ...prev, descricao: value }));
        setStep('criteria');
        showCriteriaQuestion('financeiro');
        break;
        
      case 'observacoes':
        setSlaData(prev => ({ 
          ...prev, 
          observacoes: value,
          arquivos: uploadedFiles
        }));
        setStep('complete');
        showFinalResult();
        break;
    }
    
    setInputValue('');
  };

  const showCriteriaQuestion = (criteria: string) => {
    const label = criteriaLabels[criteria as keyof typeof criteriaLabels];
    const question = criteriaQuestions[criteria as keyof typeof criteriaQuestions];
    
    addMessage('assistant', `${label}\n\n${question}`);
  };

  const handleCriteriaSelection = (criteria: string, value: number) => {
    setSlaData(prev => ({
      ...prev,
      pontuacao: {
        ...prev.pontuacao,
        [criteria]: value
      }
    }));

    const selectedOption = criteriaOptions[criteria].find(opt => opt.value === value);
    addMessage('user', selectedOption?.label || '');

    const criteriaKeys = Object.keys(criteriaLabels);
    const currentIndex = criteriaKeys.indexOf(criteria);
    
    if (currentIndex < criteriaKeys.length - 1) {
      const nextCriteria = criteriaKeys[currentIndex + 1];
      setCurrentCriteria(nextCriteria);
      showCriteriaQuestion(nextCriteria);
    } else {
      addMessage('assistant', '📝 **Observações (opcional):**\nHá links úteis, prints ou contextos extras que gostaria de adicionar? (Se não houver, digite "não" ou "nenhuma")');
      setStep('observacoes');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newFile: UploadedFile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          url: e.target?.result as string
        };
        
        setUploadedFiles(prev => [...prev, newFile]);
        
        toast({
          title: "Arquivo enviado!",
          description: `${file.name} foi adicionado com sucesso.`,
        });
      };
      reader.readAsDataURL(file);
    });

    // Limpar o input
    event.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    toast({
      title: "Arquivo removido",
      description: "O arquivo foi removido da lista.",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImageFile = (type: string) => {
    return type.startsWith('image/');
  };

  // Validações conforme especificação V2
  const validateSLAData = (data: SLAData, total: number, criticality: string) => {
    const errors: string[] = [];
    
    // Validar título (mínimo 5 caracteres)
    if (!data.titulo || data.titulo.trim().length < 5) {
      errors.push('Título deve ter no mínimo 5 caracteres');
    }
    
    // Validar descrição (mínimo 10 caracteres)
    if (!data.descricao || data.descricao.trim().length < 10) {
      errors.push('Descrição deve ter no mínimo 10 caracteres');
    }
    
    // Validar pontuações (entre 0 e 10)
    Object.entries(data.pontuacao).forEach(([key, value]) => {
      if (value < 0 || value > 10) {
        errors.push(`Pontuação ${key} deve estar entre 0 e 10`);
      }
    });
    
    // Validar nível de criticidade
    if (!['P0', 'P1', 'P2', 'P3'].includes(criticality)) {
      errors.push('Nível de criticidade inválido');
    }
    
    // Validar campos obrigatórios
    if (!data.time_responsavel || data.time_responsavel.trim().length === 0) {
      errors.push('Time responsável é obrigatório');
    }
    
    if (!data.solicitante || data.solicitante.trim().length === 0) {
      errors.push('Solicitante é obrigatório');
    }
    
    return errors;
  };

  // Salvar SLA no Supabase
  const saveSLAToSupabase = async (data: SLAData, total: number, criticality: string) => {
    try {
      // Inserir na tabela sla_demandas
      const { data: slaResult, error: slaError } = await supabase
        .from('sla_demandas')
        .insert({
          titulo: data.titulo.trim(),
          time_responsavel: data.time_responsavel.trim(),
          solicitante: data.solicitante.trim(),
          descricao: data.descricao.trim(),
          pontuacao_financeiro: data.pontuacao.financeiro,
          pontuacao_cliente: data.pontuacao.cliente,
          pontuacao_reputacao: data.pontuacao.reputacao,
          pontuacao_urgencia: data.pontuacao.urgencia,
          pontuacao_operacional: data.pontuacao.operacional,
          pontuacao_total: total,
          nivel_criticidade: criticality,
          observacoes: data.observacoes?.trim() || null,
          status: 'aberto',
          arquivos: uploadedFiles.length > 0 ? uploadedFiles.map(file => ({
            nome: file.name,
            tamanho: formatFileSize(file.size),
            tipo: file.type,
            data_upload: new Date().toISOString()
          })) : null
        })
        .select('id')
        .single();

      if (slaError) {
        console.error('Erro ao salvar SLA:', slaError);
        throw new Error(`Erro ao salvar SLA: ${slaError.message}`);
      }

      // Criar log da operação
      const logData = {
        tipo_acao: 'criacao',
        id_demanda: slaResult.id,
        usuario_responsavel: data.solicitante.trim(),
        dados_criados: {
          titulo: data.titulo.trim(),
          time_responsavel: data.time_responsavel.trim(),
          solicitante: data.solicitante.trim(),
          descricao: data.descricao.trim(),
          pontuacao: data.pontuacao,
          pontuacao_total: total,
          nivel_criticidade: criticality,
          observacoes: data.observacoes?.trim() || null,
          status: 'aberto',
          arquivos: uploadedFiles.map(file => ({
            nome: file.name,
            tamanho: formatFileSize(file.size),
            tipo: file.type,
            data_upload: new Date().toISOString()
          }))
        },
        origem: 'chat_lovable'
      };

      const { error: logError } = await supabase
        .from('sla_logs')
        .insert(logData);

      if (logError) {
        console.error('Erro ao criar log:', logError);
        // Não falhar por causa do log, apenas avisar
      }

      return slaResult.id;
    } catch (error) {
      console.error('Erro completo:', error);
      throw error;
    }
  };

  const showFinalResult = async () => {
    const total = Object.values(slaData.pontuacao).reduce((sum, value) => sum + value, 0);
    const criticality = calculateCriticality(slaData.pontuacao);

    // Validar dados antes de salvar
    const validationErrors = validateSLAData(slaData, total, criticality);
    
    if (validationErrors.length > 0) {
      addMessage('assistant', `⚠️ **Detectei um problema nos dados:**\n\n${validationErrors.join('\n')}\n\nVocê quer revisar ou abrir um novo SLA?`);
      return;
    }

    const finalJson = {
      titulo: slaData.titulo,
      time_responsavel: slaData.time_responsavel,
      solicitante: slaData.solicitante,
      descricao: slaData.descricao,
      pontuacao: slaData.pontuacao,
      pontuacao_total: total,
      nivel_criticidade: criticality,
      observacoes: slaData.observacoes,
      arquivos: uploadedFiles.map(file => ({
        nome: file.name,
        tamanho: formatFileSize(file.size),
        tipo: file.type,
        data_upload: new Date().toISOString()
      }))
    };

    addMessage('assistant', `⏳ **Processando SLA...**\n\n📊 **Pontuação Total:** ${total} pontos\n🏷️ **Nível de Criticidade:** ${criticality}\n\n💾 Salvando no sistema...`);

    try {
      const slaId = await saveSLAToSupabase(slaData, total, criticality);
      
      addMessage('assistant', `✅ **SLA registrado com sucesso no sistema!**\n\n🆔 **ID:** #${slaId}\n📊 **Pontuação Total:** ${total} pontos\n🏷️ **Nível de Criticidade:** ${criticality}\n\n🔔 A equipe responsável será notificada.`);
      
      // Salvar o JSON para exibição
      (window as any).finalSlaJson = { ...finalJson, id: slaId };
      (window as any).slaId = slaId;
      
    } catch (error) {
      console.error('Erro ao salvar SLA:', error);
      addMessage('assistant', `❌ **Erro ao salvar SLA no sistema:**\n\n${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nTente novamente ou contate o suporte.`);
      
      // Ainda salvar o JSON para exibição em caso de erro
      (window as any).finalSlaJson = finalJson;
    }
  };

  const copyJsonToClipboard = () => {
    const finalJson = (window as any).finalSlaJson;
    if (finalJson) {
      navigator.clipboard.writeText(JSON.stringify(finalJson, null, 2));
      toast({
        title: "JSON copiado!",
        description: "O JSON foi copiado para sua área de transferência.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-chat-background">
      <div className="container mx-auto max-w-4xl p-4">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Sistema de SLA - Cakto
          </h1>
          <p className="text-muted-foreground mt-2">Interface conversacional para abertura de SLAs</p>
        </div>

        <Card className="h-[700px] flex flex-col">
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {step === 'welcome' && (
                  <div className="text-center space-y-6">
                    <div className="p-8 rounded-lg bg-accent">
                      <MessageCircle className="mx-auto h-16 w-16 text-accent-foreground mb-4" />
                      <h2 className="text-2xl font-bold text-accent-foreground mb-4">
                        Bem-vindo ao Sistema de SLA!
                      </h2>
                      <p className="text-accent-foreground/80 max-w-2xl mx-auto leading-relaxed">
                        Sou sua assistente virtual para abertura de SLAs. Vou te guiar através de algumas perguntas 
                        para organizar sua demanda, calcular a pontuação de criticidade e classificar o nível de prioridade.
                      </p>
                    </div>
                    <Button onClick={handleStart} size="lg" className="px-8">
                      Iniciar Nova Demanda de SLA
                    </Button>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-lg whitespace-pre-line ${
                        message.type === 'user'
                          ? 'bg-chat-user text-chat-user-foreground'
                          : 'bg-chat-assistant text-chat-assistant-foreground border'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {step === 'criteria' && (
                  <div className="bg-chat-assistant border rounded-lg p-4">
                    <div className="space-y-3">
                      {criteriaOptions[currentCriteria]?.map((option) => (
                        <Button
                          key={option.value}
                          variant="outline"
                          className="w-full text-left h-auto p-4 justify-start hover:bg-accent hover:text-accent-foreground transition-colors"
                          onClick={() => handleCriteriaSelection(currentCriteria, option.value)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              option.value > 0 ? 'border-primary' : 'border-muted-foreground'
                            }`}>
                              <div className={`w-3 h-3 rounded-full ${
                                option.value >= 7 ? 'bg-red-500' : 
                                option.value >= 4 ? 'bg-orange-500' : 
                                option.value >= 2 ? 'bg-yellow-500' : 
                                option.value > 0 ? 'bg-green-500' : 'bg-gray-300'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm leading-relaxed">{option.label}</div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 'complete' && (
                  <div className="space-y-4">
                    {(window as any).slaId && (
                      <Card className="p-6 bg-green-50 border-green-200">
                        <div className="flex items-center gap-3 mb-4">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <h3 className="text-lg font-semibold text-green-800">
                            SLA Registrado com Sucesso!
                          </h3>
                        </div>
                        <div className="text-green-700">
                          <p className="mb-2"><strong>ID:</strong> #{(window as any).slaId}</p>
                          <p><strong>Status:</strong> Aberto</p>
                        </div>
                      </Card>
                    )}
                    
                    <Card className="p-6 bg-accent">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-accent-foreground">
                          <Calculator className="h-5 w-5" />
                          Resumo da Pontuação
                        </h3>
                        <Badge className={getCriticalityColor(calculateCriticality(slaData.pontuacao))}>
                          {calculateCriticality(slaData.pontuacao)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>Financeiro: {slaData.pontuacao.financeiro} pts</div>
                        <div>Cliente: {slaData.pontuacao.cliente} pts</div>
                        <div>Reputação: {slaData.pontuacao.reputacao} pts</div>
                        <div>Urgência: {slaData.pontuacao.urgencia} pts</div>
                        <div>Operacional: {slaData.pontuacao.operacional} pts</div>
                        <div className="font-semibold">
                          Total: {Object.values(slaData.pontuacao).reduce((sum, value) => sum + value, 0)} pts
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          JSON Final
                        </h3>
                        <Button onClick={copyJsonToClipboard} variant="outline" size="sm">
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar JSON
                        </Button>
                      </div>
                      <pre className="bg-muted p-4 rounded text-sm overflow-auto">
                        {JSON.stringify((window as any).finalSlaJson, null, 2)}
                      </pre>
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>

            {(step === 'titulo' || step === 'time' || step === 'solicitante' || step === 'descricao' || step === 'observacoes') && (
              <div className="border-t p-4 space-y-4">
                {/* Seção de upload de arquivos apenas para observações */}
                {step === 'observacoes' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">📎 Anexos (opcional)</label>
                      <div className="relative">
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Adicionar Arquivos
                        </Button>
                      </div>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="space-y-3 max-h-40 overflow-y-auto">
                        {uploadedFiles.map((file) => (
                          <div key={file.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                            <div className="flex-shrink-0">
                              {isImageFile(file.type) ? (
                                <div className="relative">
                                  <img 
                                    src={file.url} 
                                    alt={file.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                  <Image className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground rounded-full p-0.5" />
                                </div>
                              ) : (
                                <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center">
                                  <File className="h-6 w-6 text-secondary-foreground" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                              className="flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {step === 'descricao' || step === 'observacoes' ? (
                    <Textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={step === 'observacoes' ? "Digite suas observações..." : "Digite sua resposta..."}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (inputValue.trim()) {
                            handleInput(inputValue.trim());
                          }
                        }
                      }}
                    />
                  ) : (
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Digite sua resposta..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (inputValue.trim()) {
                            handleInput(inputValue.trim());
                          }
                        }
                      }}
                    />
                  )}
                  <Button 
                    onClick={() => handleInput(inputValue.trim())} 
                    disabled={!inputValue.trim()}
                  >
                    {step === 'observacoes' ? 'Finalizar' : 'Enviar'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}