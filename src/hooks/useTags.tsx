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
      
      // Buscar atribuições de tags-times salvos
      const { data: assignmentsData, error: assignmentsError } = await supabase.rpc('get_tag_team_assignments');
      
      // Buscar todas as tags dos tickets
      const ticketsRes = await supabase.from('sla_demandas').select('tags').not('tags', 'is', null);
      const hiddenRes = await supabase.rpc('get_hidden_tags');

      if (ticketsRes.error) throw ticketsRes.error;
      if (hiddenRes.error) {
        console.warn('Falha ao obter hidden tags (seguindo sem ocultar):', hiddenRes.error);
      }

      const hiddenArray: string[] = Array.isArray(hiddenRes.data) ? hiddenRes.data : [];
      const hiddenSet = new Set(hiddenArray.map(t => (t || '').trim().toLowerCase()));

      // Extrair todas as tags únicas dos tickets
      const tagsFromTickets = new Set<string>();
      if (ticketsRes.data && Array.isArray(ticketsRes.data)) {
        ticketsRes.data.forEach((ticket) => {
          if (ticket.tags && Array.isArray(ticket.tags)) {
            ticket.tags.forEach((tag: string) => {
              const clean = (tag || '').trim().toLowerCase();
              if (clean && !hiddenSet.has(clean)) {
                tagsFromTickets.add(clean);
              }
            });
          }
        });
      }

      // Adicionar tags padrão
      DEFAULT_TAGS.forEach(tag => tagsFromTickets.add(tag.toLowerCase().trim()));

      // Processar atribuições salvas
      const assignments = assignmentsData || {};
      
      // Buscar nomes dos times das atribuições
      const teamIds = Object.values(assignments).filter(Boolean) as string[];
      let teamsMap = new Map<string, string>();
      
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('setores')
          .select('id, nome')
          .in('id', teamIds);
        
        if (teamsData) {
          teamsData.forEach(team => {
            teamsMap.set(team.id, team.nome);
          });
        }
      }

      // Criar lista final de tags organizadas
      const organized: TagWithTeam[] = Array.from(tagsFromTickets).map(tagName => {
        const teamId = assignments[tagName] || null;
        const teamName = teamId ? teamsMap.get(teamId) || null : null;
        
        return {
          name: tagName,
          teamName,
          team_id: teamId,
        };
      });

      setOrganizedTags(organized);
      setAllTags(Array.from(tagsFromTickets).sort());
    } catch (error) {
      console.error('Erro ao buscar tags organizadas:', error);
      // Fallback para tags básicas
      const basicTags: TagWithTeam[] = DEFAULT_TAGS.map(tag => ({
        name: tag.toLowerCase().trim(),
        teamName: null,
        team_id: null,
      }));
      setOrganizedTags(basicTags);
      setAllTags(DEFAULT_TAGS.map(t => t.trim().toLowerCase()).sort());
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