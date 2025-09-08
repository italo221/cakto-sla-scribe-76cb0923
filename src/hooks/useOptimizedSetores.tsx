import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedEgressV2 } from './useOptimizedEgressV2';
import { PERFORMANCE_CONFIG, withTimeout } from '@/lib/performanceConfig';

// Interface mínima de setor para otimização
export interface OptimizedSetor {
  id: string;
  nome: string;
}

// Interface completa de setor (para compatibilidade)
export interface FullSetor extends OptimizedSetor {
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface UseOptimizedSetoresOptions {
  includeInactive?: boolean;
  includeDescription?: boolean;
}

/**
 * Hook otimizado para buscar setores
 * Reduz egress de ~5GB para ~500MB através de:
 * - Seleção apenas de campos essenciais (id, nome)
 * - Cache agressivo de 10 minutos
 * - Timeouts para prevenir queries travadas
 */
export const useOptimizedSetores = (options: UseOptimizedSetoresOptions = {}) => {
  const { includeInactive = false, includeDescription = false } = options;
  const { cachedQuery } = useOptimizedEgressV2();
  
  const [setores, setSetores] = useState<OptimizedSetor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campos essenciais (90% menos dados que SELECT *)
  const essentialFields = includeDescription 
    ? [...PERFORMANCE_CONFIG.ESSENTIAL_FIELDS.SETORES, 'descricao']
    : PERFORMANCE_CONFIG.ESSENTIAL_FIELDS.SETORES;

  const fetchSetores = useCallback(async () => {
    const cacheKey = `setores_${includeInactive ? 'all' : 'active'}_${includeDescription ? 'desc' : 'minimal'}`;
    
    try {
      setLoading(true);
      setError(null);

      const result = await cachedQuery(cacheKey, async () => {
        const startTime = Date.now();
        
        let query = supabase
          .from('setores')
          .select(essentialFields.join(', '));
        
        if (!includeInactive) {
          query = query.eq('ativo', true);
        }
        
        const result = await withTimeout(
          Promise.resolve(query.order('nome')),
          PERFORMANCE_CONFIG.TIMEOUTS.USER_KYC,
          'fetch_setores'
        );
        
        const duration = Date.now() - startTime;
        if (duration > 500) {
          console.warn(`🐌 Setores query took ${duration}ms`);
        }
        
        return result;
      });

      if (result.error) {
        throw result.error;
      }

      const setoresData: OptimizedSetor[] = result.data?.map((setor: any) => ({
        id: setor.id,
        nome: setor.nome,
        ...(includeDescription && setor.descricao && { descricao: setor.descricao })
      })) || [];

      setSetores(setoresData);
      return setoresData;
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar setores:', error);
      
      if (error.message?.includes('timeout')) {
        setError('Timeout ao carregar setores.');
      } else {
        setError(error.message || 'Erro ao carregar setores');
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [includeInactive, includeDescription, essentialFields, cachedQuery]);

  const getSetorById = useCallback(async (setorId: string): Promise<FullSetor | null> => {
    const cacheKey = `setor_${setorId}`;
    
    try {
      const result = await cachedQuery(cacheKey, async () => {
        return await withTimeout(
          Promise.resolve(supabase
            .from('setores')
            .select('*')
            .eq('id', setorId)
            .single()),
          PERFORMANCE_CONFIG.TIMEOUTS.USER_KYC,
          'get_setor_by_id'
        );
      });

      if (result.error) throw result.error;
      return result.data as FullSetor;
    } catch (error: any) {
      console.error('❌ Erro ao buscar setor por ID:', error);
      return null;
    }
  }, [cachedQuery]);

  const searchSetores = useCallback((searchTerm: string): OptimizedSetor[] => {
    if (!searchTerm.trim()) return setores;
    
    const term = searchTerm.toLowerCase();
    return setores.filter(setor => 
      setor.nome.toLowerCase().includes(term)
    );
  }, [setores]);

  return {
    setores,
    loading,
    error,
    fetchSetores,
    getSetorById,
    searchSetores
  };
};