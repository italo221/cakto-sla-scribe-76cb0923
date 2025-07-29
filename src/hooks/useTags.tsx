import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

// Tags pré-definidas iniciais
const DEFAULT_TAGS = ['bug', 'conta bloqueada', 'duplicidade de CPF'];

export const useTags = () => {
  const [allTags, setAllTags] = useState<string[]>(DEFAULT_TAGS);
  const [loading, setLoading] = useState(true);

  // Buscar todas as tags existentes no banco
  const fetchAllTags = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sla_demandas')
        .select('tags')
        .not('tags', 'is', null);

      if (error) throw error;

      // Extrair todas as tags únicas dos tickets
      const tagsSet = new Set(DEFAULT_TAGS);
      data?.forEach((ticket) => {
        if (ticket.tags && Array.isArray(ticket.tags)) {
          ticket.tags.forEach((tag: string) => {
            if (tag && tag.trim()) {
              tagsSet.add(tag.trim().toLowerCase());
            }
          });
        }
      });

      setAllTags(Array.from(tagsSet).sort());
    } catch (error) {
      console.error('Erro ao buscar tags:', error);
      // Manter tags padrão em caso de erro
      setAllTags(DEFAULT_TAGS);
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