import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Criar cliente Supabase para buscar métricas
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar métricas de tickets
    const { data: tickets, error } = await supabase
      .from('sla_demandas')
      .select('*')
      .order('data_criacao', { ascending: false });

    if (error) throw error;

    // Calcular métricas básicas
    const totalTickets = tickets?.length || 0;
    const statusCount = {
      aberto: tickets?.filter(t => t.status === 'aberto').length || 0,
      em_andamento: tickets?.filter(t => t.status === 'em_andamento').length || 0,
      resolvido: tickets?.filter(t => t.status === 'resolvido').length || 0,
      fechado: tickets?.filter(t => t.status === 'fechado').length || 0
    };
    
    const criticalityCount = {
      P0: tickets?.filter(t => t.nivel_criticidade === 'P0').length || 0,
      P1: tickets?.filter(t => t.nivel_criticidade === 'P1').length || 0,
      P2: tickets?.filter(t => t.nivel_criticidade === 'P2').length || 0,
      P3: tickets?.filter(t => t.nivel_criticidade === 'P3').length || 0
    };

    // Tickets dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30Days = tickets?.filter(t => new Date(t.data_criacao) >= thirtyDaysAgo).length || 0;

    const metricsContext = `
MÉTRICAS DO SISTEMA DE TICKETS:

Total de Tickets: ${totalTickets}
Tickets dos últimos 30 dias: ${last30Days}

Status dos Tickets:
- Abertos: ${statusCount.aberto}
- Em Andamento: ${statusCount.em_andamento}
- Resolvidos: ${statusCount.resolvido}
- Fechados: ${statusCount.fechado}

Criticidade:
- P0 (Crítico): ${criticalityCount.P0}
- P1 (Alto): ${criticalityCount.P1}
- P2 (Médio): ${criticalityCount.P2}
- P3 (Baixo): ${criticalityCount.P3}

Contexto adicional do usuário: ${context || 'Nenhum'}
`;

    const systemPrompt = `Você é um assistente de IA especializado em análise de métricas de tickets e SLA.
Seu objetivo é fornecer insights valiosos, identificar tendências e sugerir melhorias com base nos dados fornecidos.

Seja objetivo, claro e sempre que possível:
- Use emojis relevantes para tornar a resposta mais visual
- Destaque números importantes
- Sugira ações práticas
- Identifique padrões ou problemas potenciais

Sempre responda em português brasileiro de forma profissional mas amigável.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: metricsContext },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Créditos insuficientes. Por favor, adicione créditos ao workspace.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    return new Response(JSON.stringify({ message: aiMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro em dashboard-insights:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
