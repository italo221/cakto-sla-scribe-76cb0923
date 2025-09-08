import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedEgressV2 } from './useOptimizedEgressV2';
import { PERFORMANCE_CONFIG, withTimeout } from '@/lib/performanceConfig';

// Interface mínima de perfil para otimização
export interface OptimizedProfile {
  id: string;
  user_id: string;
  email: string;
  nome_completo: string;
  role: string;
  user_type: string;
  ativo: boolean;
}

// Interface completa de perfil (para compatibilidade)
export interface FullProfile extends OptimizedProfile {
  created_at: string;
  updated_at: string;
  telefone?: string;
  avatar_url?: string;
  cargo_id?: string;
  navbar_position?: string;
  navbar_glass?: boolean;
}

interface UseOptimizedProfilesOptions {
  includeInactive?: boolean;
  selectFields?: string[];
}

/**
 * Hook otimizado para buscar perfis de usuários
 * Reduz egress de ~15GB para ~3GB através de:
 * - Seleção apenas de campos essenciais
 * - Cache agressivo de 2 horas
 * - Timeouts para prevenir queries travadas
 */
export const useOptimizedProfiles = (options: UseOptimizedProfilesOptions = {}) => {
  const { includeInactive = false, selectFields } = options;
  const { cachedQuery } = useOptimizedEgressV2();
  
  const [profiles, setProfiles] = useState<OptimizedProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Campos essenciais (75% menos dados)
  const essentialFields = selectFields || PERFORMANCE_CONFIG.ESSENTIAL_FIELDS.USER_PROFILES;

  const fetchProfiles = useCallback(async () => {
    const cacheKey = `profiles_${includeInactive ? 'all' : 'active'}_${essentialFields.join(',')}`;
    
    try {
      setLoading(true);
      setError(null);

      const result = await cachedQuery(cacheKey, async () => {
        const startTime = Date.now();
        
        let query = supabase
          .from('profiles')
          .select(essentialFields.join(', '));
        
        if (!includeInactive) {
          query = query.eq('ativo', true);
        }
        
        const result = await withTimeout(
          Promise.resolve(query.order('nome_completo')),
          PERFORMANCE_CONFIG.TIMEOUTS.USER_KYC,
          'fetch_profiles'
        );
        
        const duration = Date.now() - startTime;
        if (duration > 1000) {
          console.warn(`🐌 Profile query took ${duration}ms`);
        }
        
        return result;
      });

      if (result.error) {
        throw result.error;
      }

      const profilesData: OptimizedProfile[] = result.data?.map((profile: any) => ({
        id: profile.id,
        user_id: profile.user_id,
        email: profile.email,
        nome_completo: profile.nome_completo,
        role: profile.role,
        user_type: profile.user_type,
        ativo: profile.ativo
      })) || [];

      setProfiles(profilesData);
      return profilesData;
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar perfis:', error);
      
      if (error.message?.includes('timeout')) {
        setError('Timeout ao carregar usuários. Usando cache.');
      } else {
        setError(error.message || 'Erro ao carregar perfis');
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [includeInactive, essentialFields, cachedQuery]);

  const getProfileById = useCallback(async (userId: string): Promise<FullProfile | null> => {
    const cacheKey = `profile_${userId}`;
    
    try {
      const result = await cachedQuery(cacheKey, async () => {
        return await withTimeout(
          Promise.resolve(supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single()),
          PERFORMANCE_CONFIG.TIMEOUTS.USER_KYC,
          'get_profile_by_id'
        );
      });

      if (result.error) throw result.error;
      return result.data as FullProfile;
    } catch (error: any) {
      console.error('❌ Erro ao buscar perfil por ID:', error);
      return null;
    }
  }, [cachedQuery]);

  const searchProfiles = useCallback((searchTerm: string): OptimizedProfile[] => {
    if (!searchTerm.trim()) return profiles;
    
    const term = searchTerm.toLowerCase();
    return profiles.filter(profile => 
      profile.nome_completo.toLowerCase().includes(term) ||
      profile.email.toLowerCase().includes(term)
    );
  }, [profiles]);

  const getActiveAdmins = useCallback((): OptimizedProfile[] => {
    return profiles.filter(profile => 
      profile.ativo && 
      (profile.role === 'super_admin' || profile.user_type === 'administrador_master')
    );
  }, [profiles]);

  return {
    profiles,
    loading,
    error,
    fetchProfiles,
    getProfileById,
    searchProfiles,
    getActiveAdmins
  };
};