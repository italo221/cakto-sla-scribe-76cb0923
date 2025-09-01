import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

// Tags pré-definidas iniciais
const DEFAULT_TAGS = ['bug', 'conta bloqueada', 'duplicidade de CPF'];

export const useTags = () => {
  const [allTags, setAllTags] = useState<string[]>(DEFAULT_TAGS);
  const [loading, setLoading] = useState(true);

  // Buscar todas as tags existentes no banco, filtrando as ocultas (catálogo)
  const fetchAllTags = async () => {
    try {
      setLoading(true);
      
      // Primeiro tentar buscar tags organizadas
      const { data: organizedTags, error: organizedError } = await supabase
        .rpc('get_organized_tags', { 
          p_team_id: null, 
          p_include_global: true 
        });

      let organizedTagNames: string[] = [];
      if (!organizedError && organizedTags) {
        organizedTagNames = organizedTags.map((tag: any) => tag.name);
      }

      // Buscar tags dos tickets (sistema legado)
      const [ticketsRes, hiddenRes] = await Promise.all([
        supabase.from('sla_demandas').select('tags').not('tags', 'is', null),
        supabase.rpc('get_hidden_tags')
      ]);

      if (ticketsRes.error) throw ticketsRes.error;
      if (hiddenRes.error) {
        // Usuários não-admin podem não ter acesso a system_settings diretamente; a RPC usa SECURITY DEFINER
        // Ainda assim, se falhar, seguimos sem ocultar nada
        console.warn('Falha ao obter hidden tags (seguindo sem ocultar):', hiddenRes.error);
      }

      const hiddenArray: string[] = Array.isArray(hiddenRes.data) ? hiddenRes.data : [];
      const hiddenSet = new Set(hiddenArray.map(t => (t || '').trim().toLowerCase()));

      // Extrair todas as tags únicas dos tickets
      const legacyTagsSet = new Set(DEFAULT_TAGS.map(t => t.trim().toLowerCase()));
      ticketsRes.data?.forEach((ticket) => {
        if (ticket.tags && Array.isArray(ticket.tags)) {
          ticket.tags.forEach((tag: string) => {
            const clean = (tag || '').trim().toLowerCase();
            if (clean && !hiddenSet.has(clean)) {
              legacyTagsSet.add(clean);
            }
          });
        }
      });

      // Remover tags padrão que estejam ocultas
      hiddenSet.forEach((t) => legacyTagsSet.delete(t));

      // Combinar tags organizadas + legadas, priorizando organizadas
      const allTagsSet = new Set([
        ...organizedTagNames,
        ...Array.from(legacyTagsSet)
      ]);

      setAllTags(Array.from(allTagsSet).sort());
    } catch (error) {
      console.error('Erro ao buscar tags:', error);
      // Manter tags padrão em caso de erro (sem ocultas)
      setAllTags(DEFAULT_TAGS.map(t => t.trim().toLowerCase()).sort());
    } finally {
      setLoading(false);
    }
  };

  // Adicionar uma nova tag ao histórico
  const addTagToHistory = (newTag: string) => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !allTags.includes(trimmedTag)) {
      setAllTags(prev => [...prev, trimmedTag].sort());
    }
  };

  // Obter estatísticas de tags
  const getTagStats = async () => {
    try {
      const { data, error } = await supabase
        .from('sla_demandas')
        .select('tags')
        .not('tags', 'is', null);

      if (error) throw error;

      const tagCounts: Record<string, number> = {};
      data?.forEach((ticket) => {
        if (ticket.tags && Array.isArray(ticket.tags)) {
          ticket.tags.forEach((tag: string) => {
            if (tag && tag.trim()) {
              const cleanTag = tag.trim().toLowerCase();
              tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
            }
          });
        }
      });

      // Converter para array e ordenar por frequência
      const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([tag, count]) => ({ tag, count }));

      return {
        totalTags: Object.keys(tagCounts).length,
        mostUsedTag: sortedTags[0] || null,
        tagStats: sortedTags
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de tags:', error);
      return {
        totalTags: 0,
        mostUsedTag: null,
        tagStats: []
      };
    }
  };

  useEffect(() => {
    fetchAllTags();
  }, []);

  return {
    allTags,
    loading,
    addTagToHistory,
    fetchAllTags,
    getTagStats
  };
};