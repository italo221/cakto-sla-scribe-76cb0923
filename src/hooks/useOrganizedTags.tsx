import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useTags } from './useTags';

export interface OrganizedTag {
  id: string;
  name: string;
  team_id: string | null;
  sector_id: string | null;
  team_name: string | null;
  sector_name: string | null;
  is_global: boolean;
  created_at: string;
}

export interface TagTeam {
  id: string;
  name: string;
}

export const useOrganizedTags = () => {
  const [organizedTags, setOrganizedTags] = useState<OrganizedTag[]>([]);
  const [teams, setTeams] = useState<TagTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  
  // Fallback para tags antigas (compatibilidade)
  const { allTags: legacyTags, loading: legacyLoading } = useTags();

  // Buscar teams (setores que servem como teams)
  const fetchTeams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('setores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      const teamsData = data?.map(setor => ({
        id: setor.id,
        name: setor.nome
      })) || [];

      // Adicionar opção GERAL no início
      setTeams([
        { id: 'GERAL', name: 'GERAL' },
        ...teamsData
      ]);
    } catch (error) {
      console.error('Erro ao buscar teams:', error);
      setTeams([{ id: 'GERAL', name: 'GERAL' }]);
    }
  }, []);

  // Buscar tags organizadas por team
  const fetchOrganizedTags = useCallback(async (teamId: string | null = null, includeGlobal = true) => {
    try {
      setLoading(true);
      
      const actualTeamId = teamId === 'GERAL' ? null : teamId;
      
      const { data, error } = await supabase
        .rpc('get_organized_tags', {
          p_team_id: actualTeamId,
          p_include_global: includeGlobal
        });

      if (error) throw error;

      setOrganizedTags(data || []);
    } catch (error) {
      console.error('Erro ao buscar tags organizadas:', error);
      setOrganizedTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Migrar tags legadas (apenas uma vez, se necessário)
  const migrateLegacyTags = useCallback(async () => {
    try {
      const { data: existingOrganized } = await supabase
        .from('organized_tags')
        .select('id')
        .limit(1);

      // Se já existem tags organizadas, não precisamos migrar
      if (existingOrganized && existingOrganized.length > 0) {
        return;
      }

      // Executar migração apenas se não há tags organizadas
      const { error } = await supabase.rpc('migrate_existing_tags_to_organized');
      if (error) throw error;

      console.log('Tags legadas migradas com sucesso');
    } catch (error) {
      console.warn('Aviso ao migrar tags legadas:', error);
      // Não é crítico, sistema continua funcionando
    }
  }, []);

  // Criar nova tag organizada
  const createOrganizedTag = useCallback(async (
    name: string, 
    teamId: string | null = null, 
    sectorId: string | null = null
  ) => {
    try {
      const actualTeamId = teamId === 'GERAL' ? null : teamId;
      
      const { data, error } = await supabase
        .from('organized_tags')
        .insert({
          name: name.toLowerCase().trim(),
          team_id: actualTeamId,
          sector_id: sectorId,
          is_global: actualTeamId === null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Recarregar tags após criação
      await fetchOrganizedTags(selectedTeamId);
      
      return data;
    } catch (error) {
      console.error('Erro ao criar tag organizada:', error);
      throw error;
    }
  }, [selectedTeamId, fetchOrganizedTags]);

  // Obter todas as tags disponíveis (organizadas + legadas para compatibilidade)
  const getAllAvailableTags = useCallback((): string[] => {
    const organizedTagNames = organizedTags.map(tag => tag.name);
    
    // Se não há tags organizadas, usar tags legadas
    if (organizedTagNames.length === 0) {
      return legacyTags;
    }
    
    // Combinar e deduplificar
    const combined = [...new Set([...organizedTagNames, ...legacyTags])];
    return combined.sort();
  }, [organizedTags, legacyTags]);

  // Efeitos
  useEffect(() => {
    fetchTeams();
    migrateLegacyTags();
  }, [fetchTeams, migrateLegacyTags]);

  useEffect(() => {
    if (selectedTeamId !== null) {
      fetchOrganizedTags(selectedTeamId);
    }
  }, [selectedTeamId, fetchOrganizedTags]);

  // Selecionar team e atualizar tags
  const selectTeam = useCallback((teamId: string | null) => {
    setSelectedTeamId(teamId);
  }, []);

  // Resetar para mostrar todas as tags (modo GERAL)
  const showAllTags = useCallback(() => {
    setSelectedTeamId('GERAL');
  }, []);

  return {
    // Tags organizadas
    organizedTags,
    teams,
    selectedTeamId,
    loading: loading || legacyLoading,
    
    // Ações
    selectTeam,
    showAllTags,
    fetchOrganizedTags,
    createOrganizedTag,
    
    // Compatibilidade com sistema antigo
    getAllAvailableTags,
    legacyTags
  };
};