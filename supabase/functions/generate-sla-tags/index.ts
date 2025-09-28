import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SLAData {
  titulo: string;
  descricao: string;
  pontuacao_total: number;
  nivel_criticidade: string;
  time_responsavel: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏷️ Iniciando geração de tags para SLA');
    
    const { slaData }: { slaData: SLAData } = await req.json();
    
    if (!slaData || !slaData.titulo || !slaData.descricao) {
      throw new Error('Dados do SLA são obrigatórios');
    }

    console.log('📋 Dados recebidos:', {
      titulo: slaData.titulo,
      descricao: slaData.descricao.substring(0, 100) + '...',
      criticidade: slaData.nivel_criticidade
    });

    // Gerar tags usando Perplexity AI
    const tags = await generateTagsWithAI(slaData);
    
    console.log('🏷️ Tags geradas:', tags);

    return new Response(
      JSON.stringify({ tags }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao gerar tags:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        tags: [] // Fallback para array vazio
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

async function generateTagsWithAI(slaData: SLAData): Promise<string[]> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  
  if (!perplexityApiKey) {
    console.warn('⚠️ PERPLEXITY_API_KEY não encontrada, usando tags padrão');
    return generateFallbackTags(slaData);
  }

  try {
    const prompt = `
Analise esta demanda de SLA e gere tags relevantes:

Título: ${slaData.titulo}
Descrição: ${slaData.descricao}
Criticidade: ${slaData.nivel_criticidade}
Time: ${slaData.time_responsavel}

REGRAS PARA AS TAGS:
- Máximo 5 tags
- Máximo 3 palavras por tag
- Usar minúsculas
- Sem espaços extras
- Focar em: tema principal, tipo de problema, área afetada
- Evitar palavras genéricas como "problema", "erro" sem contexto
- Substituir espaços por underscores se necessário

EXEMPLOS:
- "checkout dando erro" → ["checkout", "bug", "urgente"]
- "liberação de produtor" → ["liberacao", "produtor"]
- "nota fiscal em lote" → ["nota_fiscal", "financeiro"]

Responda APENAS com um array JSON das tags, exemplo: ["tag1", "tag2", "tag3"]
`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em categorização de demandas técnicas. Seja preciso e conciso.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 200,
        return_images: false,
        return_related_questions: false,
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Resposta vazia da API');
    }

    console.log('🤖 Resposta bruta da AI:', content);

    // Extrair array JSON da resposta
    const jsonMatch = content.match(/\[.*\]/);
    if (!jsonMatch) {
      throw new Error('Formato de resposta inválido');
    }

    const tags = JSON.parse(jsonMatch[0]);
    
    // Validar e limpar tags
    const cleanTags = validateAndCleanTags(tags);
    
    return cleanTags;

  } catch (error) {
    console.error('❌ Erro na API Perplexity:', error);
    return generateFallbackTags(slaData);
  }
}

function generateFallbackTags(slaData: SLAData): string[] {
  const tags: string[] = [];
  
  const titulo = slaData.titulo.toLowerCase();
  const descricao = slaData.descricao.toLowerCase();
  const text = `${titulo} ${descricao}`;
  
  // Tags baseadas em palavras-chave comuns
  const keywords = {
    'checkout': ['checkout', 'pagamento', 'compra'],
    'login': ['login', 'acesso', 'autenticacao'],
    'bug': ['erro', 'falha', 'problema', 'bug'],
    'api': ['api', 'integracao', 'webhook'],
    'mobile': ['mobile', 'app', 'aplicativo'],
    'web': ['site', 'web', 'browser'],
    'financeiro': ['financeiro', 'cobranca', 'fatura', 'nota_fiscal'],
    'compliance': ['compliance', 'regulacao', 'auditoria'],
    'produtor': ['produtor', 'afiliado', 'parceiro'],
    'cliente': ['cliente', 'usuario', 'consumidor'],
    'urgente': ['urgente', 'critico', 'emergencia']
  };

  // Adicionar criticidade como tag
  if (slaData.nivel_criticidade === 'P0' || slaData.nivel_criticidade === 'P1') {
    tags.push('urgente');
  }

  // Buscar palavras-chave no texto
  for (const [tag, palavras] of Object.entries(keywords)) {
    if (palavras.some(palavra => text.includes(palavra)) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  // Adicionar tag do time responsável
  const timeTag = slaData.time_responsavel.toLowerCase().replace(' ', '_');
  if (!tags.includes(timeTag)) {
    tags.push(timeTag);
  }

  return tags.slice(0, 5); // Máximo 5 tags
}

function validateAndCleanTags(tags: any[]): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .filter(tag => typeof tag === 'string')
    .map(tag => tag.toLowerCase().trim())
    .map(tag => tag.replace(/\s+/g, '_')) // Substituir espaços por underscores
    .map(tag => tag.replace(/[^a-z0-9_]/g, '')) // Remover caracteres especiais
    .filter(tag => tag.length > 0 && tag.length <= 20) // Filtrar tags válidas
    .filter((tag, index, arr) => arr.indexOf(tag) === index) // Remover duplicatas
    .slice(0, 5); // Máximo 5 tags
}