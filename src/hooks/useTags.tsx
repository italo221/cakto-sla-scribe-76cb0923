import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { TagWithTeam } from "@/utils/tagFormatting";

// Tags pré-definidas iniciais
const DEFAULT_TAGS = ['bug', 'conta bloqueada', 'duplicidade de CPF'];

export const useTags = () => {
  const [allTags, setAllTags] = useState<string[]>(DEFAULT_TAGS);
  const [organizedTags, setOrganizedTags] = useState<TagWithTeam[]>([]);
  const [loading, setLoading] = useState(true);

  // Buscar todas as tags organizadas (com informações de time)
  const fetchOrganizedTags = async () => {
    try {
      setLoading(true);
      
      // Primeiro buscar as tags dos tickets existentes
      const ticketsRes = await supabase.from('sla_demandas').select('tags').not('tags', 'is', null);
      const hiddenRes = await supabase.rpc('get_hidden_tags');

      if (ticketsRes.error) throw ticketsRes.error;
      if (hiddenRes.error) {
        console.warn('Falha ao obter hidden tags (seguindo sem ocultar):', hiddenRes.error);
      }

      const hiddenArray: string[] = Array.isArray(hiddenRes.data) ? hiddenRes.data : [];
      const hiddenSet = new Set(hiddenArray.map(t => (t || '').trim().toLowerCase()));

      // Extrair todas as tags únicas dos tickets
      const tagsSet = new Set(DEFAULT_TAGS.map(t => t.trim().toLowerCase()));
      ticketsRes.data?.forEach((ticket) => {
        if (ticket.tags && Array.isArray(ticket.tags)) {
          ticket.tags.forEach((tag: string) => {
            const clean = (tag || '').trim().toLowerCase();
            if (clean && !hiddenSet.has(clean)) {
              tagsSet.add(clean);
            }
          });
        }
      });

      // Criar tags organizadas (sem time por enquanto)
      const organized: TagWithTeam[] = Array.from(tagsSet).map(tag => ({
        name: tag,
        teamName: null,
        team_id: null,
      }));

      setOrganizedTags(organized);
      setAllTags(Array.from(tagsSet).sort());
    } catch (error) {
      console.error('Erro ao buscar tags organizadas:', error);
      setAllTags(DEFAULT_TAGS.map(t => t.trim().toLowerCase()).sort());
      setOrganizedTags([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar todas as tags existentes no banco, filtrando as ocultas (catálogo) - mantido para compatibilidade
  const fetchAllTags = async () => {
    await fetchOrganizedTags();
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
    fetchOrganizedTags();
  }, []);

  return {
    allTags,
    organizedTags,
    loading,
    addTagToHistory,
    fetchAllTags,
    fetchOrganizedTags,
    getTagStats
  };
};