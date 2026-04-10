import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, FileText, MessageCircle, Calculator, Upload, X, File, Image, CheckCircle, Sparkles } from "lucide-react";
import ManualTicketCreator from "@/components/ManualTicketCreator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
interface TicketData {
  titulo: string;
  time_responsavel: string;
  descricao: string;
  tipo_ticket: string;
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
  financeiro: [{
    value: 10,
    label: "Perda > R$50.000 ou multa grave (10 pts)"
  }, {
    value: 6,
    label: "Perda entre R$5.000 e R$50.000 (6 pts)"
  }, {
    value: 3,
    label: "Perda < R$5.000 (3 pts)"
  }, {
    value: 0,
    label: "Nenhum impacto direto (0 pts)"
  }],
  cliente: [{
    value: 8,
    label: "Todos os clientes ou um Top 10 produtor (8 pts)"
  }, {
    value: 5,
    label: "Um grupo ou cliente de alto valor (5 pts)"
  }, {
    value: 2,
    label: "Um cliente médio/baixo valor (2 pts)"
  }, {
    value: 0,
    label: "Sem impacto direto no cliente (0 pts)"
  }],
  reputacao: [{
    value: 7,
    label: "Pode gerar mídia negativa ou quebra com parceiros (7 pts)"
  }, {
    value: 3,
    label: "Comentários negativos pontuais (3 pts)"
  }, {
    value: 0,
    label: "Nenhum risco reputacional (0 pts)"
  }],
  urgencia: [{
    value: 5,
    label: "Muito urgente – precisa ser resolvido hoje (5 pts)"
  }, {
    value: 2,
    label: "Importante – tem prazo interno essa semana (2 pts)"
  }, {
    value: 0,
    label: "Sem pressa – pode ser feito quando der (0 pts)"
  }],
  operacional: [{
    value: 4,
    label: "Sim, equipe parada aguardando (4 pts)"
  }, {
    value: 2,
    label: "Sim, mas não estão 100% travadas (2 pts)"
  }, {
    value: 0,
    label: "Não está bloqueando ninguém (0 pts)"
  }]
};
const timeOptions = ["Produto", "Compliance", "Suporte", "Marketing", "Comercial", "Financeiro", "Tecnologia", "Recursos Humanos", "Jurídico", "Operações"];
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
type Step = 'welcome' | 'create-ticket' | 'titulo' | 'tipo' | 'time' | 'descricao' | 'criteria' | 'observacoes' | 'complete' | 'validation-error' | 'update-mode' | 'query-mode';
export default function TicketChat() {
  const {
    user,
    isAdmin,
    canEdit,
    isSuperAdmin
  } = useAuth();
  // Verificar permissões de criação
  const canCreateTickets = canEdit || isSuperAdmin;

  // Ir direto para criação de ticket (inicializar no estado correto)
  const [step, setStep] = useState<Step>(() => {
    const state = window.history.state && window.history.state.usr || {};
    // Se acessado via menu específico ou se tem permissão para criar, ir direto para create-ticket
    if (state.action === 'create-ticket' || canCreateTickets) {
      return 'create-ticket';
    }
    return 'welcome';
  });

  // Limpar state de navegação se necessário
  useEffect(() => {
    const state = window.history.state && window.history.state.usr || {};
    if (state.action === 'create-ticket') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  const [currentCriteria, setCurrentCriteria] = useState<string>('financeiro');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [ticketData, setTicketData] = useState<TicketData>({
    titulo: '',
    time_responsavel: '',
    descricao: '',
    tipo_ticket: 'bug',
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
  const {
    toast
  } = useToast();
  const addMessage = (type: 'assistant' | 'user', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // Sistema de consulta de SLAs com linguagem natural
  const handleSLAQuery = async (query: string) => {
    try {
      addMessage('assistant', '🔍 Processando consulta...');
      const result = await processSLAQuery(query);
      addMessage('assistant', result);
    } catch (error) {
      console.error('Erro na consulta:', error);
      addMessage('assistant', '❌ Não consegui acessar os dados agora. Tente novamente em alguns minutos.');
    }
  };
  const processSLAQuery = async (query: string): Promise<string> => {
    const queryLower = query.toLowerCase();

    // Detectar comandos de métricas e desempenho (V5)
    if (queryLower.includes('cumprimento') || queryLower.includes('desempenho') || queryLower.includes('resumo') || queryLower.includes('métricas') || queryLower.includes('metricas') || queryLower.includes('kpi') || queryLower.includes('atraso') || queryLower.includes('atrasados')) {
      return await getSLAsMetricas(query);
    }
    // Detectar tipo de consulta
    else if (queryLower.includes('aberto') || queryLower.includes('abertas')) {
      return await getSLAsAbertos(query);
    } else if (queryLower.includes('p0') || queryLower.includes('p1') || queryLower.includes('p2') || queryLower.includes('p3')) {
      return await getSLAsPorCriticidade(query);
    } else if (queryLower.includes('time') || queryLower.includes('equipe') || timeOptions.some(t => queryLower.includes(t.toLowerCase()))) {
      return await getSLAsPorTime(query);
    } else if (queryLower.includes('hoje') || queryLower.includes('today')) {
      return await getSLAsHoje();
    } else if (queryLower.includes('semana') || queryLower.includes('week')) {
      return await getSLAsSemana(query);
    } else if (queryLower.includes('mês') || queryLower.includes('mes') || queryLower.includes('month')) {
      return await getSLAsMes(query);
    } else if (queryLower.includes('percentual') || queryLower.includes('prazo')) {
      return await getSLAsCumprimento(query);
    } else if (queryLower.includes('quantidade') || queryLower.includes('total') || queryLower.includes('count')) {
      return await getSLAsEstatisticas();
    } else if (queryLower.includes('tempo médio') || queryLower.includes('tempo medio') || queryLower.includes('resolução') || queryLower.includes('resolucao')) {
      return await getSLAsTempoMedio();
    } else {
      return 'Você quer ver SLAs abertos, resolvidos, atrasados ou todos? Ou precisa de estatísticas específicas?';
    }
  };
  const getSLAsAbertos = async (query: string): Promise<string> => {
    if (!user) return 'Você precisa estar logado para visualizar SLAs.';

    // RLS automaticamente filtra baseado no usuário e seus setores
    const {
      data,
      error
    } = await supabase.from('sla_demandas').select('ticket_number, titulo, nivel_criticidade, time_responsavel, data_criacao, status, setor_id').eq('status', 'aberto').order('data_criacao', {
      ascending: false
    }).limit(5);
    if (error) throw error;
    if (!data || data.length === 0) {
      const resultMsg = isAdmin ? '📋 Nenhum SLA aberto encontrado!\n\n✅ Todas as demandas foram resolvidas.' : '📋 Nenhum SLA aberto nos seus setores!\n\n✅ Seus setores não têm demandas abertas no momento.';
      return resultMsg;
    }
    let result = `🧩 SLAs Abertos (${data.length} encontrados)\n\n`;
    data.forEach(sla => {
      const dataFormatada = new Date(sla.data_criacao).toLocaleDateString('pt-BR');
      result += `${sla.ticket_number} – ${sla.titulo} – ${sla.nivel_criticidade}\n`;
      result += `📅 Aberto em ${dataFormatada} | 👥 ${sla.time_responsavel}\n\n`;
    });
    if (data.length === 5) {
      result += '⚠️ *Mostrando apenas os 5 mais recentes. Quer ver todos?*';
    }
    return result;
  };
  const getSLAsPorCriticidade = async (query: string): Promise<string> => {
    const queryLower = query.toLowerCase();
    let criticidade = '';
    if (queryLower.includes('p0')) criticidade = 'P0';else if (queryLower.includes('p1')) criticidade = 'P1';else if (queryLower.includes('p2')) criticidade = 'P2';else if (queryLower.includes('p3')) criticidade = 'P3';
    if (!criticidade) return 'Especifique a criticidade: P0, P1, P2 ou P3';
    const {
      data,
      error
    } = await supabase.from('sla_demandas').select('ticket_number, titulo, nivel_criticidade, time_responsavel, data_criacao, status').eq('nivel_criticidade', criticidade).order('data_criacao', {
      ascending: false
    }).limit(5);
    if (error) throw error;
    if (!data || data.length === 0) return `📋 Nenhum SLA ${criticidade} encontrado!`;
    let result = `🚨 SLAs ${criticidade} (${data.length} encontrados)\n\n`;
    data.forEach(sla => {
      const dataFormatada = new Date(sla.data_criacao).toLocaleDateString('pt-BR');
      const statusIcon = sla.status === 'aberto' ? '🔴' : sla.status === 'em_andamento' ? '🟡' : '✅';
      result += `${sla.ticket_number} – ${sla.titulo}\n`;
      result += `📅 ${dataFormatada} | 👥 ${sla.time_responsavel} | ${statusIcon} ${sla.status}\n\n`;
    });
    return result;
  };
  const getSLAsPorTime = async (query: string): Promise<string> => {
    const queryLower = query.toLowerCase();
    let timeEncontrado = '';
    for (const time of timeOptions) {
      if (queryLower.includes(time.toLowerCase())) {
        timeEncontrado = time;
        break;
      }
    }
    if (!timeEncontrado) return 'Especifique o time: Produto, Compliance, Suporte, Marketing, etc.';
    const {
      data,
      error
    } = await supabase.from('sla_demandas').select('ticket_number, titulo, nivel_criticidade, time_responsavel, data_criacao, status').eq('time_responsavel', timeEncontrado).order('data_criacao', {
      ascending: false
    }).limit(5);
    if (error) throw error;
    if (!data || data.length === 0) return `📋 Nenhum SLA do time ${timeEncontrado} encontrado!`;
    let result = `👥 SLAs do Time ${timeEncontrado} (${data.length} encontrados)\n\n`;
    data.forEach(sla => {
      const dataFormatada = new Date(sla.data_criacao).toLocaleDateString('pt-BR');
      const statusIcon = sla.status === 'aberto' ? '🔴' : sla.status === 'em_andamento' ? '🟡' : '✅';
      result += `${sla.ticket_number} – ${sla.titulo} – ${sla.nivel_criticidade}\n`;
      result += `📅 ${dataFormatada} | ${statusIcon} ${sla.status}\n\n`;
    });
    return result;
  };
  const getSLAsHoje = async (): Promise<string> => {
    const hoje = new Date().toISOString().split('T')[0];
    const {
      data,
      error
    } = await supabase.from('sla_demandas').select('ticket_number, titulo, nivel_criticidade, time_responsavel, data_criacao, status').gte('data_criacao', hoje).order('data_criacao', {
      ascending: false
    });
    if (error) throw error;
    if (!data || data.length === 0) return '📋 Nenhum SLA aberto hoje!\n\n✅ Dia tranquilo até agora.';
    let result = `📅 SLAs de Hoje (${data.length} encontrados)\n\n`;
    data.forEach(sla => {
      const hora = new Date(sla.data_criacao).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const statusIcon = sla.status === 'aberto' ? '🔴' : sla.status === 'em_andamento' ? '🟡' : '✅';
      result += `${sla.ticket_number} – ${sla.titulo} – ${sla.nivel_criticidade}\n`;
      result += `⏰ ${hora} | 👥 ${sla.time_responsavel} | ${statusIcon} ${sla.status}\n\n`;
    });
    return result;
  };
  const getSLAsSemana = async (query: string): Promise<string> => {
    const hoje = new Date();
    const semanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    const {
      data,
      error
    } = await supabase.from('sla_demandas').select('ticket_number, titulo, nivel_criticidade, time_responsavel, data_criacao, status').gte('data_criacao', semanaAtras.toISOString()).order('data_criacao', {
      ascending: false
    }).limit(10);
    if (error) throw error;
    if (!data || data.length === 0) return '📋 Nenhum SLA na última semana!';
    let result = `📊 SLAs da Última Semana (${data.length} encontrados)\n\n`;
    data.forEach(sla => {
      const dataFormatada = new Date(sla.data_criacao).toLocaleDateString('pt-BR');
      const statusIcon = sla.status === 'aberto' ? '🔴' : sla.status === 'em_andamento' ? '🟡' : '✅';
      result += `${sla.ticket_number} – ${sla.titulo} – ${sla.nivel_criticidade}\n`;
      result += `📅 ${dataFormatada} | 👥 ${sla.time_responsavel} | ${statusIcon} ${sla.status}\n\n`;
    });
    return result;
  };
  const getSLAsMes = async (query: string): Promise<string> => {
    const hoje = new Date();
    const mesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
    const {
      data,
      error
    } = await supabase.from('sla_demandas').select('ticket_number, titulo, nivel_criticidade, time_responsavel, data_criacao, status').gte('data_criacao', mesAtras.toISOString()).order('data_criacao', {
      ascending: false
    }).limit(10);
    if (error) throw error;
    if (!data || data.length === 0) return '📋 Nenhum SLA no último mês!';
    let result = `📈 SLAs do Último Mês (${data.length} encontrados)\n\n`;
    data.forEach(sla => {
      const dataFormatada = new Date(sla.data_criacao).toLocaleDateString('pt-BR');
      const statusIcon = sla.status === 'aberto' ? '🔴' : sla.status === 'em_andamento' ? '🟡' : '✅';
      result += `${sla.ticket_number} – ${sla.titulo} – ${sla.nivel_criticidade}\n\n`;
    });
    return result;
  };
  const getSLAsCumprimento = async (query: string): Promise<string> => {
    const hoje = new Date();
    const mesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
    const {
      data,
      error
    } = await supabase.from('sla_demandas').select('status, nivel_criticidade, data_criacao').gte('data_criacao', mesAtras.toISOString());
    if (error) throw error;
    if (!data || data.length === 0) return '📋 Nenhum dado disponível para análise!';
    const total = data.length;
    const resolvidos = data.filter(sla => sla.status === 'resolvido' || sla.status === 'fechado').length;
    const percentual = (resolvidos / total * 100).toFixed(1);
    let result = `📊 Análise de Cumprimento de SLA - Último Mês\n\n`;
    result += `📈 Demandas criadas: ${total}\n`;
    result += `✅ Demandas resolvidas: ${resolvidos}\n`;
    result += `📊 Percentual de resolução: ${percentual}%\n\n`;

    // Análise por criticidade
    const porCriticidade = data.reduce((acc: any, sla) => {
      if (!acc[sla.nivel_criticidade]) {
        acc[sla.nivel_criticidade] = {
          total: 0,
          resolvidos: 0
        };
      }
      acc[sla.nivel_criticidade].total++;
      if (sla.status === 'resolvido' || sla.status === 'fechado') {
        acc[sla.nivel_criticidade].resolvidos++;
      }
      return acc;
    }, {});
    result += `📋 Por Criticidade:\n`;
    Object.entries(porCriticidade).forEach(([nivel, dados]: [string, any]) => {
      const percentualNivel = (dados.resolvidos / dados.total * 100).toFixed(1);
      result += `• ${nivel}: ${dados.resolvidos}/${dados.total} (${percentualNivel}%)\n`;
    });
    return result;
  };
  const getSLAsEstatisticas = async (): Promise<string> => {
    const {
      data,
      error
    } = await supabase.from('sla_demandas').select('status, nivel_criticidade, time_responsavel');
    if (error) throw error;
    if (!data || data.length === 0) return '📋 Nenhum SLA registrado no sistema!';
    const stats = {
      total: data.length,
      abertos: data.filter(sla => sla.status === 'aberto').length,
      emAndamento: data.filter(sla => sla.status === 'em_andamento').length,
      resolvidos: data.filter(sla => sla.status === 'resolvido').length,
      fechados: data.filter(sla => sla.status === 'fechado').length
    };
    const porCriticidade = data.reduce((acc: any, sla) => {
      acc[sla.nivel_criticidade] = (acc[sla.nivel_criticidade] || 0) + 1;
      return acc;
    }, {});
    const porTime = data.reduce((acc: any, sla) => {
      acc[sla.time_responsavel] = (acc[sla.time_responsavel] || 0) + 1;
      return acc;
    }, {});
    let result = `📊 Estatísticas Gerais do Sistema\n\n`;
    result += `📈 Total de SLAs: ${stats.total}\n`;
    result += `🔴 Abertos: ${stats.abertos}\n`;
    result += `🟡 Em andamento: ${stats.emAndamento}\n`;
    result += `✅ Resolvidos: ${stats.resolvidos}\n`;
    result += `🔒 Fechados: ${stats.fechados}\n\n`;
    result += `🚨 Por Criticidade:\n`;
    Object.entries(porCriticidade).forEach(([nivel, quantidade]) => {
      result += `• ${nivel}: ${quantidade}\n`;
    });
    result += `\n👥 Por Time:\n`;
    Object.entries(porTime).slice(0, 5).forEach(([time, quantidade]) => {
      result += `• ${time}: ${quantidade}\n`;
    });
    return result;
  };
  const getSLAsMetricas = async (query: string): Promise<string> => {
    try {
      // Consultar dados dos últimos 7 dias
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const {
        data: slasSemana,
        error
      } = await supabase.from('sla_demandas').select('status, nivel_criticidade, data_criacao, time_responsavel').gte('data_criacao', seteDiasAtras.toISOString());
      if (error) throw error;

      // Consultar dados de hoje para atrasos
      const hoje = new Date().toISOString().split('T')[0];
      const {
        data: slasHoje
      } = await supabase.from('sla_demandas').select('status, nivel_criticidade').gte('data_criacao', hoje);

      // Calcular métricas
      const totalSemana = slasSemana?.length || 0;
      const abertos = slasSemana?.filter(sla => sla.status === 'aberto').length || 0;
      const resolvidos = slasSemana?.filter(sla => sla.status === 'resolvido' || sla.status === 'fechado').length || 0;
      const emAndamento = slasSemana?.filter(sla => sla.status === 'em_andamento').length || 0;

      // Calcular atrasos (P0 e P1 que estão abertos há mais de 1 dia)
      const ontemData = new Date();
      ontemData.setDate(ontemData.getDate() - 1);
      const atrasados = slasSemana?.filter(sla => (sla.nivel_criticidade === 'P0' || sla.nivel_criticidade === 'P1') && sla.status === 'aberto' && new Date(sla.data_criacao) < ontemData).length || 0;
      const cumprimento = totalSemana > 0 ? (resolvidos / totalSemana * 100).toFixed(1) : '0';

      // Análise por área (top 3)
      const porArea = slasSemana?.reduce((acc: any, sla) => {
        acc[sla.time_responsavel] = (acc[sla.time_responsavel] || 0) + 1;
        return acc;
      }, {}) || {};
      const topAreas = Object.entries(porArea).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 3);
      let result = `📈 Painel de SLA disponível no sistema!\n\n`;
      result += `🔗 Acesse: https://sistema.cakto.com/slas/kpis\n\n`;
      result += `📊 Resumo atual (últimos 7 dias):\n`;
      result += `• ${totalSemana} SLAs criados\n`;
      result += `• ${resolvidos} resolvidos\n`;
      result += `• ${abertos + emAndamento} ainda em aberto (${atrasados} atrasados)\n`;
      result += `• Cumprimento de SLA: ${cumprimento}%\n\n`;
      if (topAreas.length > 0) {
        result += `👥 Top áreas (esta semana):\n`;
        topAreas.forEach(([area, qty]) => {
          result += `• ${area}: ${qty} SLAs\n`;
        });
        result += `\n`;
      }
      result += `🔍 Quer ver por área ou por criticidade? Posso filtrar aqui.\n`;
      result += `📈 Para gráficos detalhados, acesse o painel completo.`;
      return result;
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      return '❌ Erro ao acessar dados de métricas. Tente novamente.';
    }
  };
  const getSLAsTempoMedio = async (): Promise<string> => {
    const temposMedios = {
      'P0': '4 horas',
      'P1': '24 horas',
      'P2': '3 dias úteis',
      'P3': '7 dias úteis'
    };
    let result = `⏱️ Tempo Médio de Resolução por Criticidade\n\n`;
    Object.entries(temposMedios).forEach(([nivel, tempo]) => {
      result += `🚨 ${nivel}: ${tempo}\n`;
    });
    result += `\n📋 *Baseado nos SLAs estabelecidos da empresa*`;
    return result;
  };
  const calculateCriticality = (pontuacao: TicketData['pontuacao']) => {
    const total = Object.values(pontuacao).reduce((sum, value) => sum + value, 0);
    if (total >= 30) return 'P0';
    if (total >= 20) return 'P1';
    if (total >= 10) return 'P2';
    return 'P3';
  };
  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'P0':
        return 'bg-destructive text-destructive-foreground';
      case 'P1':
        return 'bg-orange-500 text-white';
      case 'P2':
        return 'bg-yellow-500 text-black';
      case 'P3':
        return 'bg-green-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  const handleStart = () => {
    setStep('titulo');
    addMessage('assistant', 'Olá! Sou a IA da Cakto para abertura de SLAs. Vou te ajudar a organizar sua demanda e calcular a criticidade.\n\n🧾 Título da Demanda:\nDescreva o título da sua demanda (ex: "Liberação de produtor para lançamento")');
  };
  const handleStartQuery = () => {
    setStep('query-mode');
    addMessage('assistant', '🔍 Modo Consulta de SLAs\n\nPergunte-me sobre os SLAs do sistema! Posso responder sobre:\n\n• Status das demandas (abertas, resolvidas, em andamento)\n• SLAs por criticidade (P0, P1, P2, P3)\n• SLAs por time responsável\n• Métricas e KPIs (cumprimento, atrasos, desempenho)\n• Estatísticas e tempo médio de resolução\n• Dados temporais (hoje, esta semana, este mês)\n• Gerenciar tags - adicione tags manualmente\n\n💬 Exemplos:\n• "Quais SLAs estão abertos hoje?"\n• "Me mostra os P0 em atraso"\n• "Como está o cumprimento dos SLAs?"\n• "Me dá um resumo da semana"\n• "Adiciona a tag \'pix\' na demanda #43"\n• "Quantas demandas do time de Produto estão abertas?"');
  };
  const handleInput = async (value: string) => {
    addMessage('user', value);
    switch (step) {
      case 'titulo':
        setTicketData(prev => ({
          ...prev,
          titulo: value
        }));
        setStep('tipo');
        addMessage('assistant', '🏷️ Tipo do Ticket:\nSelecione o tipo desta demanda:');
        break;

      // case 'time': removido porque agora usa seleção por botões

      case 'descricao':
        setTicketData(prev => ({
          ...prev,
          descricao: value
        }));
        setStep('criteria');
        showCriteriaQuestion('financeiro');
        break;
      case 'observacoes':
        setTicketData(prev => ({
          ...prev,
          observacoes: value,
          arquivos: uploadedFiles
        }));
        setStep('complete');
        showFinalResult();
        break;
      case 'query-mode':
        // Verificar se é comando para adicionar tag
        if (value.toLowerCase().includes('adiciona') && value.toLowerCase().includes('tag')) {
          await handleAddTag(value);
        } else {
          await handleSLAQuery(value);
        }
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
    setTicketData(prev => ({
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
      addMessage('assistant', '📝 Observações (opcional):\nHá links úteis, prints ou contextos extras que gostaria de adicionar? (Se não houver, digite "não" ou "nenhuma")');
      setStep('observacoes');
    }
  };
  const handleTimeSelection = (timeSelected: string) => {
    setTicketData(prev => ({
      ...prev,
      time_responsavel: timeSelected
    }));
    addMessage('user', timeSelected);
    setStep('descricao');
    addMessage('assistant', '📝 Descrição Resumida da Demanda:\nDescreva brevemente o que está acontecendo (seja claro e direto)');
  };
  const handleTipoSelection = (tipoSelected: string) => {
    setTicketData(prev => ({
      ...prev,
      tipo_ticket: tipoSelected
    }));
    addMessage('user', tipoSelected === 'bug' ? 'Bug' : 'Sugestão de Melhoria');
    setStep('time');
    addMessage('assistant', '👥 Time Responsável:\nQual time será responsável? (ex: Produto, Compliance, Suporte, Marketing...)');
  };
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
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
          description: `${file.name} foi adicionado com sucesso.`
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
      description: "O arquivo foi removido da lista."
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
  const validateTicketData = (data: TicketData, total: number, criticality: string) => {
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
    return errors;
  };

  // Função para gerar tags automaticamente usando AI
  const generateSLATags = async (slaData: {
    titulo: string;
    descricao: string;
    pontuacao_total: number;
    nivel_criticidade: string;
    time_responsavel: string;
  }): Promise<string[]> => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-sla-tags', {
        body: {
          slaData
        }
      });
      if (error) {
        console.error('Erro ao gerar tags:', error);
        return [];
      }
      return data?.tags || [];
    } catch (error) {
      console.error('Erro ao chamar função de tags:', error);
      return [];
    }
  };

  // Função para adicionar tag manualmente via chat
  const handleAddTag = async (input: string) => {
    try {
      // Extrair ID da demanda e tag do comando
      // Exemplo: "Adiciona a tag 'pix' na demanda #43"
      const idMatch = input.match(/#(\w+)/);
      const tagMatch = input.match(/['"]([^'"]+)['"]/);
      if (!idMatch || !tagMatch) {
        addMessage('assistant', '❌ Formato inválido\n\nUse: "Adiciona a tag \'nome_da_tag\' na demanda #ID"\n\nExemplo: "Adiciona a tag \'pix\' na demanda #43"');
        return;
      }
      const slaId = idMatch[1];
      const newTag = tagMatch[1].toLowerCase().trim().replace(/\s+/g, '_');

      // Buscar SLA atual
      const {
        data: sla,
        error: fetchError
      } = await supabase.from('sla_demandas').select('id, titulo, tags').eq('id', slaId).single();
      if (fetchError || !sla) {
        addMessage('assistant', `❌ SLA #${slaId} não encontrado\n\nVerifique o ID e tente novamente.`);
        return;
      }
      const currentTags = sla.tags || [];

      // Validações
      if (currentTags.includes(newTag)) {
        addMessage('assistant', `⚠️ Tag já existe\n\nA tag '${newTag}' já está presente na demanda #${slaId}.`);
        return;
      }
      if (currentTags.length >= 5) {
        addMessage('assistant', `⚠️ Limite atingido\n\nA demanda #${slaId} já possui o máximo de 5 tags.\n\nTags atuais: ${currentTags.join(', ')}`);
        return;
      }
      if (newTag.length === 0 || newTag.length > 20) {
        addMessage('assistant', '❌ Tag inválida\n\nA tag deve ter entre 1 e 20 caracteres.');
        return;
      }

      // Adicionar nova tag
      const updatedTags = [...currentTags, newTag];
      const {
        error: updateError
      } = await supabase.from('sla_demandas').update({
        tags: updatedTags
      }).eq('id', slaId);
      if (updateError) {
        throw updateError;
      }

      // Criar log da operação
      await supabase.from('sla_logs').insert({
        tipo_acao: 'tag_adicionada',
        id_demanda: slaId,
        usuario_responsavel: 'Sistema Chat',
        dados_criados: {
          tag_adicionada: newTag,
          tags_atuais: updatedTags
        },
        origem: 'chat_lovable'
      });
      addMessage('assistant', `✅ Tag adicionada com sucesso!\n\n🏷️ Tag '${newTag}' adicionada à demanda #${slaId}\n\n📋 Tags atuais: ${updatedTags.join(', ')}\n\n🔗 Título: ${sla.titulo}`);
    } catch (error) {
      console.error('Erro ao adicionar tag:', error);
      addMessage('assistant', '❌ Erro ao adicionar tag\n\nTente novamente ou contate o suporte.');
    }
  };

  // Salvar SLA no Supabase com geração automática de tags
  const saveTicketToSupabase = async (data: TicketData, total: number, criticality: string) => {
    try {
      // Gerar tags automaticamente usando AI
      const tags = await generateSLATags({
        titulo: data.titulo.trim(),
        descricao: data.descricao.trim(),
        pontuacao_total: total,
        nivel_criticidade: criticality,
        time_responsavel: data.time_responsavel.trim()
      });

      // VALIDAÇÃO CRÍTICA: Verificar campos obrigatórios antes da inserção
      const titulo = data.titulo?.trim();
      const descricao = data.descricao?.trim();
      const timeResponsavel = data.time_responsavel?.trim();
      if (!titulo || titulo.length < 3) {
        throw new Error('Título é obrigatório e deve ter pelo menos 3 caracteres');
      }
      if (!descricao || descricao.length < 10) {
        throw new Error('Descrição é obrigatória e deve ter pelo menos 10 caracteres');
      }
      if (!timeResponsavel) {
        throw new Error('Time responsável é obrigatório');
      }

      // Inserir na tabela sla_demandas com dados validados
      const {
        data: slaResult,
        error: slaError
      } = await supabase.from('sla_demandas').insert({
        titulo: titulo,
        // Validado
        time_responsavel: timeResponsavel,
        // Validado
        solicitante: 'Sistema Autenticado',
        // Será substituído por auth quando implementada
        descricao: descricao,
        // Validado
        tipo_ticket: data.tipo_ticket || 'sugestao_melhoria',
        pontuacao_financeiro: data.pontuacao.financeiro,
        pontuacao_cliente: data.pontuacao.cliente,
        pontuacao_reputacao: data.pontuacao.reputacao,
        pontuacao_urgencia: data.pontuacao.urgencia,
        pontuacao_operacional: data.pontuacao.operacional,
        pontuacao_total: total,
        nivel_criticidade: criticality,
        observacoes: data.observacoes?.trim() || null,
        status: 'aberto',
        // Status obrigatório
        tags: tags,
        // Tags geradas automaticamente
        arquivos: uploadedFiles.length > 0 ? uploadedFiles.map(file => ({
          nome: file.name,
          tamanho: formatFileSize(file.size),
          tipo: file.type,
          data_upload: new Date().toISOString()
        })) : null
      }).select('id, ticket_number').single();
      if (slaError) {
        console.error('Erro ao salvar SLA:', slaError);
        throw new Error(`Erro ao salvar SLA: ${slaError.message}`);
      }

      // Criar log da operação
      const logData = {
        tipo_acao: 'criacao',
        id_demanda: slaResult.id,
        usuario_responsavel: 'Sistema Autenticado',
        // Será substituído por auth quando implementada
        dados_criados: {
          titulo: data.titulo.trim(),
          time_responsavel: data.time_responsavel.trim(),
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
      const {
        error: logError
      } = await supabase.from('sla_logs').insert(logData);
      if (logError) {
        console.error('Erro ao criar log:', logError);
        // Não falhar por causa do log, apenas avisar
      }
      return {
        id: slaResult.id,
        ticket_number: slaResult.ticket_number
      };
    } catch (error) {
      console.error('Erro completo:', error);
      throw error;
    }
  };
  const showFinalResult = async () => {
    const total = Object.values(ticketData.pontuacao).reduce((sum, value) => sum + value, 0);
    const criticality = calculateCriticality(ticketData.pontuacao);

    // Validar dados antes de salvar
    const validationErrors = validateTicketData(ticketData, total, criticality);
    if (validationErrors.length > 0) {
      addMessage('assistant', `⚠️ Detectei um problema nos dados:\n\n${validationErrors.join('\n')}\n\nVocê quer revisar ou abrir um novo SLA?`);
      setStep('validation-error');
      return;
    }
    const finalJson = {
      titulo: ticketData.titulo,
      time_responsavel: ticketData.time_responsavel,
      descricao: ticketData.descricao,
      tipo_ticket: ticketData.tipo_ticket,
      pontuacao: ticketData.pontuacao,
      pontuacao_total: total,
      nivel_criticidade: criticality,
      observacoes: ticketData.observacoes,
      arquivos: uploadedFiles.map(file => ({
        nome: file.name,
        tamanho: formatFileSize(file.size),
        tipo: file.type,
        data_upload: new Date().toISOString()
      }))
    };
    addMessage('assistant', `⏳ Processando SLA...\n\n📊 Pontuação Total: ${total} pontos\n🏷️ Nível de Criticidade: ${criticality}\n\n💾 Salvando no sistema...`);
    try {
      const slaResult = await saveTicketToSupabase(ticketData, total, criticality);

      // Calcular tempo médio de resolução baseado na criticidade
      const getTempoMedioResolucao = (nivel: string) => {
        switch (nivel) {
          case 'P0':
            return '4 horas';
          case 'P1':
            return '24 horas';
          case 'P2':
            return '3 dias úteis';
          case 'P3':
            return '7 dias úteis';
          default:
            return '7 dias úteis';
        }
      };
      const tempoMedio = getTempoMedioResolucao(criticality);
      addMessage('assistant', `✅ SLA registrado com sucesso no sistema!\n\n🎫 Ticket: ${slaResult.ticket_number || `#${slaResult.id.slice(0, 8)}`}\n🆔 ID: #${slaResult.id}\n📊 Pontuação Total: ${total} pontos\n🏷️ Nível de Criticidade: ${criticality}\n⏱️ Tempo Médio de Resolução: ${tempoMedio}\n\n🔔 A equipe responsável será notificada.`);

      // Salvar o JSON para exibição
      (window as any).finalSlaJson = {
        ...finalJson,
        id: slaResult.id,
        ticket_number: slaResult.ticket_number
      };
      (window as any).slaId = slaResult.id;
    } catch (error) {
      console.error('Erro ao salvar SLA:', error);
      addMessage('assistant', `❌ Erro ao salvar SLA no sistema:\n\n${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nTente novamente ou contate o suporte.`);

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
        description: "O JSON foi copiado para sua área de transferência."
      });
    }
  };

  // Funções para atualização de SLA (V3)
  const buscarSLAPorId = async (id: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from('sla_demandas').select('*').eq('id', id).single();
      if (error) {
        throw new Error(`SLA não encontrado: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Erro ao buscar SLA:', error);
      throw error;
    }
  };
  const validarCampoAtualização = (campo: string, valor: any) => {
    const camposPermitidos = ['status', 'nivel_criticidade', 'pontuacao_financeiro', 'pontuacao_cliente', 'pontuacao_reputacao', 'pontuacao_urgencia', 'pontuacao_operacional', 'observacoes', 'tags', 'descricao', 'time_responsavel'];
    if (!camposPermitidos.includes(campo)) {
      return {
        valido: false,
        erro: `Campo '${campo}' não pode ser alterado`
      };
    }

    // Validações específicas por campo
    switch (campo) {
      case 'status':
        const statusValidos = ['aberto', 'em_andamento', 'resolvido', 'fechado'];
        if (!statusValidos.includes(valor)) {
          return {
            valido: false,
            erro: `Status deve ser: ${statusValidos.join(', ')}`
          };
        }
        break;
      case 'nivel_criticidade':
        const niveisValidos = ['P0', 'P1', 'P2', 'P3'];
        if (!niveisValidos.includes(valor)) {
          return {
            valido: false,
            erro: `Nível de criticidade deve ser: ${niveisValidos.join(', ')}`
          };
        }
        break;
      case 'pontuacao_financeiro':
      case 'pontuacao_cliente':
      case 'pontuacao_reputacao':
      case 'pontuacao_urgencia':
      case 'pontuacao_operacional':
        const pontuacao = Number(valor);
        if (isNaN(pontuacao) || pontuacao < 0 || pontuacao > 10) {
          return {
            valido: false,
            erro: 'Pontuação deve ser um número entre 0 e 10'
          };
        }
        break;
      case 'descricao':
        if (typeof valor !== 'string' || valor.trim().length < 10) {
          return {
            valido: false,
            erro: 'Descrição deve ter no mínimo 10 caracteres'
          };
        }
        break;
      case 'time_responsavel':
        if (!timeOptions.includes(valor)) {
          return {
            valido: false,
            erro: `Time deve ser um dos: ${timeOptions.join(', ')}`
          };
        }
        break;
      case 'tags':
        if (!Array.isArray(valor)) {
          return {
            valido: false,
            erro: 'Tags devem ser uma lista'
          };
        }
        break;
    }
    return {
      valido: true
    };
  };
  const atualizarSLA = async (id: string, alteracoes: Record<string, any>) => {
    try {
      // Buscar estado atual
      const slaAtual = await buscarSLAPorId(id);

      // Validar todas as alterações
      for (const [campo, valor] of Object.entries(alteracoes)) {
        const validacao = validarCampoAtualização(campo, valor);
        if (!validacao.valido) {
          throw new Error(validacao.erro);
        }

        // Verificar se valor é idêntico ao atual
        if (slaAtual[campo] === valor) {
          addMessage('assistant', `⚠️ O campo '${campo}' já está com esse valor. Nenhuma alteração feita.`);
          return;
        }
      }

      // Aplicar atualização
      const {
        error
      } = await supabase.from('sla_demandas').update(alteracoes as any).eq('id', id);
      if (error) {
        throw new Error(`Erro ao atualizar SLA: ${error.message}`);
      }

      // Gerar log da alteração
      const logData = {
        tipo_acao: 'atualizacao',
        id_demanda: id,
        usuario_responsavel: 'Sistema Autenticado',
        dados_criados: {
          alteracoes: Object.fromEntries(Object.entries(alteracoes).map(([campo, valorNovo]) => [campo, {
            antes: slaAtual[campo],
            depois: valorNovo
          }]))
        },
        origem: 'chat_lovable'
      };
      await supabase.from('sla_logs').insert(logData);

      // Mostrar resultado
      const alteracoesTexto = Object.entries(alteracoes).map(([campo, valorNovo]) => `${campo}: de "${slaAtual[campo]}" para "${valorNovo}"`).join('\n');
      addMessage('assistant', `🔁 Demanda #${id} atualizada com sucesso.\n\n${alteracoesTexto}\n\nLog gerado para auditoria ✅`);
    } catch (error) {
      console.error('Erro ao atualizar SLA:', error);
      addMessage('assistant', `❌ Erro ao atualizar SLA:\n\n${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };
  const interpretarComandoNaturalUpdate = (comando: string) => {
    const comandoLower = comando.toLowerCase();

    // Extrair ID da demanda
    const idMatch = comandoLower.match(/#(\w+)/);
    if (!idMatch) {
      addMessage('assistant', '⚠️ ID da demanda não encontrado.\n\nPor favor, inclua o ID da demanda (ex: #28)');
      return;
    }
    const id = idMatch[1];
    const alteracoes: Record<string, any> = {};

    // Detectar alterações de status
    if (comandoLower.includes('status')) {
      if (comandoLower.includes('resolvido')) alteracoes.status = 'resolvido';else if (comandoLower.includes('em andamento')) alteracoes.status = 'em_andamento';else if (comandoLower.includes('fechado')) alteracoes.status = 'fechado';else if (comandoLower.includes('aberto')) alteracoes.status = 'aberto';
    }

    // Detectar alterações de criticidade/urgência
    if (comandoLower.includes('urgência') || comandoLower.includes('criticidade')) {
      if (comandoLower.includes('p0') || comandoLower.includes('muito urgente')) alteracoes.nivel_criticidade = 'P0';else if (comandoLower.includes('p1') || comandoLower.includes('urgente')) alteracoes.nivel_criticidade = 'P1';else if (comandoLower.includes('p2') || comandoLower.includes('normal')) alteracoes.nivel_criticidade = 'P2';else if (comandoLower.includes('p3') || comandoLower.includes('sem pressa')) alteracoes.nivel_criticidade = 'P3';
    }

    // Detectar alterações de time
    if (comandoLower.includes('time') || comandoLower.includes('responsável')) {
      const timeEncontrado = timeOptions.find(time => comandoLower.includes(time.toLowerCase()));
      if (timeEncontrado) {
        alteracoes.time_responsavel = timeEncontrado;
      }
    }

    // Detectar alterações de pontuação
    const pontuacaoMatch = comandoLower.match(/(financeiro|cliente|reputação|reputacao|urgência|urgencia|operacional).*?(\d+)/);
    if (pontuacaoMatch) {
      const [, tipo, valor] = pontuacaoMatch;
      const campo = `pontuacao_${tipo.replace('ã', 'a').replace('ê', 'e')}`;
      alteracoes[campo] = Number(valor);
    }
    if (Object.keys(alteracoes).length === 0) {
      addMessage('assistant', '⚠️ Não consegui interpretar o que você quer alterar.\n\nExemplos de comandos:\n- "Atualiza o status da #28 para resolvido"\n- "Muda a urgência da #13 para P1"\n- "Troca o time da #20 para Suporte"');
      return;
    }

    // Aplicar alterações
    atualizarSLA(id, alteracoes);
  };

  // Modificar o handleInput para detectar comandos de atualização
  const handleInputWithUpdate = (value: string) => {
    const comandoLower = value.toLowerCase();

    // Detectar se é um comando de atualização
    const isUpdateCommand = comandoLower.includes('atualiza') || comandoLower.includes('muda') || comandoLower.includes('altera') || comandoLower.includes('troca') || comandoLower.includes('corrige') || comandoLower.includes('#') && (comandoLower.includes('status') || comandoLower.includes('urgência') || comandoLower.includes('criticidade') || comandoLower.includes('time') || comandoLower.includes('pontuação'));
    if (isUpdateCommand && step !== 'update-mode') {
      addMessage('user', value);
      setStep('update-mode');
      interpretarComandoNaturalUpdate(value);
      return;
    }

    // Comportamento normal para outros casos
    handleInput(value);
  };

  // Mostrar criador de ticket se step for 'create-ticket'
  if (step === 'create-ticket') {
    return <div className="min-h-screen bg-gradient-to-br from-background to-chat-background">
        <div className="container mx-auto max-w-4xl p-4">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Criar Novo Ticket
            </h1>
            <p className="text-muted-foreground mt-2">Preencha as informações para registrar sua demanda</p>
            
          </div>
          <ManualTicketCreator onTicketCreated={() => {
          window.history.back();
          toast({
            title: "Sucesso!",
            description: "Ticket criado com sucesso."
          });
        }} />
        </div>
      </div>;
  }

  // Mostrar criador manual se step for 'titulo'
  if (step === 'titulo' as any) {
    return <div className="min-h-screen bg-gradient-to-br from-background to-chat-background">
        <div className="container mx-auto max-w-4xl p-4">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Criação Manual de Ticket
            </h1>
            <p className="text-muted-foreground mt-2">Controle total sobre todos os campos</p>
            <Button onClick={() => setStep('welcome')} variant="outline" size="sm" className="mt-2">
              Voltar ao menu
            </Button>
          </div>
          <div className="bg-card dark:bg-card rounded-lg border border-border">
            <ManualTicketCreator onTicketCreated={() => {
            setStep('welcome');
            toast({
              title: "Sucesso!",
              description: "Ticket criado com sucesso manualmente."
            });
          }} />
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background to-chat-background">
      <div className="container mx-auto max-w-4xl p-4">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Sistema de Tickets
          </h1>
          <p className="text-muted-foreground mt-2">Interface conversacional para abertura de tickets</p>
        </div>

        <Card className="h-[700px] flex flex-col bg-card dark:bg-card">
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {step === 'welcome' && <div className="text-center space-y-6">
                    <div className="p-8 rounded-lg bg-accent">
                      <MessageCircle className="mx-auto h-16 w-16 text-accent-foreground mb-4" />
                      <h2 className="text-2xl font-bold text-accent-foreground mb-4">
                        Bem-vindo ao Sistema de Tickets!
                      </h2>
                      <p className="text-accent-foreground/80 max-w-2xl mx-auto leading-relaxed">
                        {canCreateTickets ? <>
                            Sou sua assistente virtual para abertura de tickets. Escolha como deseja criar seu ticket:
                            com assistência da IA para preenchimento automático ou manual detalhado.
                          </> : 'Você pode consultar tickets existentes, mas não tem permissão para criar novos tickets.'}
                      </p>
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">✨ Recursos Disponíveis:</h3>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          • Criação com IA: Descreva o problema e a IA preencherá automaticamente<br />
                          • Criação manual: Controle total sobre todos os campos<br />
                          • Consultas inteligentes: Pergunte sobre tickets existentes
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {canCreateTickets && <>
                          <Button onClick={() => setStep('create-ticket')} size="lg" className="w-full px-8 gap-2">
                            <FileText className="h-4 w-4" />
                            Criar Ticket
                          </Button>
                        </>}
                    </div>
                  </div>}

                {messages.map(message => {
                const isErrorMessage = message.content.includes('❌');
                const copyToClipboard = () => {
                  navigator.clipboard.writeText(message.content).then(() => {
                    toast({
                      title: "Copiado!",
                      description: "Mensagem de erro copiada para a área de transferência",
                      duration: 2000
                    });
                  });
                };
                return <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-lg whitespace-pre-line relative group ${message.type === 'user' ? 'bg-chat-user text-chat-user-foreground' : 'bg-chat-assistant text-chat-assistant-foreground border'}`}>
                        {message.content}
                        {isErrorMessage && message.type === 'assistant' && <button onClick={copyToClipboard} className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background border border-border" title="Copiar mensagem de erro">
                            <Copy className="h-3 w-3" />
                          </button>}
                      </div>
                    </div>;
              })}

                {step === 'criteria' && <div className="bg-chat-assistant border rounded-lg p-4">
                    <div className="space-y-3">
                      {criteriaOptions[currentCriteria]?.map(option => <Button key={option.value} variant="outline" className="w-full text-left h-auto p-4 justify-start hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => handleCriteriaSelection(currentCriteria, option.value)}>
                          <div className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${option.value > 0 ? 'border-primary' : 'border-muted-foreground'}`}>
                              <div className={`w-3 h-3 rounded-full ${option.value >= 7 ? 'bg-red-500' : option.value >= 4 ? 'bg-orange-500' : option.value >= 2 ? 'bg-yellow-500' : option.value > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm leading-relaxed">{option.label}</div>
                            </div>
                          </div>
                        </Button>)}
                    </div>
                  </div>}

                {step === 'tipo' && <div className="bg-chat-assistant border rounded-lg p-4">
                    <div className="grid grid-cols-1 gap-3">
                      <Button variant="outline" className="h-auto p-4 justify-start hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => handleTipoSelection('bug')}>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <div className="text-left">
                            <div className="font-medium">🐛 Bug</div>
                            <div className="text-sm text-muted-foreground">Algo que não está funcionando corretamente</div>
                          </div>
                        </div>
                      </Button>
                      <Button variant="outline" className="h-auto p-4 justify-start hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => handleTipoSelection('sugestao_melhoria')}>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <div className="text-left">
                            <div className="font-medium">💡 Sugestão de Melhoria</div>
                            <div className="text-sm text-muted-foreground">Ideia para melhorar alguma funcionalidade</div>
                          </div>
                        </div>
                      </Button>
                    </div>
                  </div>}

                {step === 'time' && <div className="bg-chat-assistant border rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {timeOptions.map(timeOption => <Button key={timeOption} variant="outline" className="h-auto p-4 justify-start hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => handleTimeSelection(timeOption)}>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-sm font-medium">{timeOption}</span>
                          </div>
                        </Button>)}
                    </div>
                  </div>}

                {step === 'validation-error' && <div className="bg-chat-assistant border rounded-lg p-4">
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full text-left h-auto p-4 justify-start hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => {
                    addMessage('user', 'Revisar dados');
                    setStep('titulo');
                    addMessage('assistant', '🔄 Revisando dados...\n\n🧾 Título da Demanda:\nDescreva o título da sua demanda (ex: "Liberação de produtor para lançamento")');
                  }}>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-sm font-medium">📝 Revisar e editar dados</span>
                        </div>
                      </Button>
                      <Button variant="outline" className="w-full text-left h-auto p-4 justify-start hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => {
                    addMessage('user', 'Abrir novo SLA');
                    // Resetar todos os dados
                    setTicketData({
                      titulo: '',
                      time_responsavel: '',
                      descricao: '',
                      tipo_ticket: 'bug',
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
                    setUploadedFiles([]);
                    setMessages([]);
                    setStep('welcome');
                    handleStart();
                  }}>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-sm font-medium">🆕 Abrir novo SLA</span>
                        </div>
                      </Button>
                    </div>
                  </div>}

                {step === 'complete' && <div className="space-y-4">
                    {(window as any).slaId && <Card className="p-6 bg-green-50 border-green-200">
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
                      </Card>}
                    
                    <Card className="p-6 bg-accent">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-accent-foreground">
                          <Calculator className="h-5 w-5" />
                          Resumo da Pontuação
                        </h3>
                        <Badge className={getCriticalityColor(calculateCriticality(ticketData.pontuacao))}>
                          {calculateCriticality(ticketData.pontuacao)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>Financeiro: {ticketData.pontuacao.financeiro} pts</div>
                        <div>Cliente: {ticketData.pontuacao.cliente} pts</div>
                        <div>Reputação: {ticketData.pontuacao.reputacao} pts</div>
                        <div>Urgência: {ticketData.pontuacao.urgencia} pts</div>
                        <div>Operacional: {ticketData.pontuacao.operacional} pts</div>
                        <div className="font-semibold">
                          Total: {Object.values(ticketData.pontuacao).reduce((sum, value) => sum + value, 0)} pts
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
                  </div>}
              </div>
            </ScrollArea>

            {(step === 'titulo' || step === 'descricao' || step === 'observacoes' || step === 'update-mode' || step === 'complete') && <div className="border-t p-4 space-y-4">
                {/* Seção de upload de arquivos apenas para observações */}
                {step === 'observacoes' && <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">📎 Anexos (opcional)</label>
                      <div className="relative">
                        <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Adicionar Arquivos
                        </Button>
                      </div>
                    </div>

                    {uploadedFiles.length > 0 && <div className="space-y-3 max-h-40 overflow-y-auto">
                        {uploadedFiles.map(file => <div key={file.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                            <div className="flex-shrink-0">
                              {isImageFile(file.type) ? <div className="relative">
                                  <img src={file.url} alt={file.name} className="w-12 h-12 object-cover rounded" />
                                  <Image className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground rounded-full p-0.5" />
                                </div> : <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center">
                                  <File className="h-6 w-6 text-secondary-foreground" />
                                </div>}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                            
                            <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)} className="flex-shrink-0">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>)}
                      </div>}
                  </div>}

                <div className="flex gap-2">
                  {step === 'descricao' || step === 'observacoes' ? <Textarea value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={step === 'observacoes' ? "Digite suas observações..." : "Digite sua resposta..."} className="flex-1" onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (inputValue.trim()) {
                    handleInputWithUpdate(inputValue.trim());
                  }
                }
              }} /> : <Input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Digite sua resposta..." className="flex-1" onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (inputValue.trim()) {
                    handleInputWithUpdate(inputValue.trim());
                  }
                }
              }} />}
                  <Button onClick={() => handleInput(inputValue.trim())} disabled={!inputValue.trim()}>
                    {step === 'observacoes' ? 'Finalizar' : 'Enviar'}
                  </Button>
                </div>
              </div>}
          </CardContent>
        </Card>
      </div>
    </div>;
}