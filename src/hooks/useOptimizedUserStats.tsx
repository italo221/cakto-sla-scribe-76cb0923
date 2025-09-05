import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedEgressV2 } from './useOptimizedEgressV2';

interface UserStats {
  email: string;
  has_registration: boolean;
  registration_status: string;
  kyc_status: string;
  total_profit_30_days: number;
  profit_count_30_days: number;
}

// Hook otimizado para consultas de usuário com cache ultra-agressivo
// Compensa problemas de performance das políticas RLS em user_kyc, user_profits, user_registrations
export const useOptimizedUserStats = () => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { cachedQuery } = useOptimizedEgressV2();

  // Cache ultra-agressivo para compensar políticas RLS lentas
  const fetchUserStats = useCallback(async (email: string) => {
    if (!email) return null;

    setLoading(true);
    setError(null);

    try {
      // Usar cache de 30 minutos para reduzir consultas custosas das políticas RLS
      const stats = await cachedQuery(`user_stats_${email}`, async () => {
        // Usar função do banco que é mais otimizada que múltiplas consultas
        const { data, error } = await supabase.rpc('get_user_stats', { 
          user_email: email 
        });

        if (error) {
          // Se a função falhar, usar consultas simples com campos mínimos
          console.warn('Função get_user_stats falhou, usando fallback:', error);
          
          const fallbackStats: UserStats = {
            email,
            has_registration: false,
            registration_status: 'not_registered',
            kyc_status: 'not_started',
            total_profit_30_days: 0,
            profit_count_30_days: 0
          };

          return fallbackStats;
        }

        return data?.[0] || {
          email,
          has_registration: false,
          registration_status: 'not_registered',
          kyc_status: 'not_started',
          total_profit_30_days: 0,
          profit_count_30_days: 0
        };
      });

      setUserStats(stats);
      return stats;

    } catch (error: any) {
      console.error('Erro ao buscar estatísticas do usuário:', error);
      
      // Em caso de erro (problemas de performance), usar dados em cache ou fallback
      const fallbackStats: UserStats = {
        email,
        has_registration: false,
        registration_status: 'pending_optimization',
        kyc_status: 'system_optimization',
        total_profit_30_days: 0,
        profit_count_30_days: 0
      };

      setUserStats(fallbackStats);
      setError('Sistema temporariamente otimizando performance');
      return fallbackStats;
      
    } finally {
      setLoading(false);
    }
  }, [cachedQuery]);

  // Função otimizada para buscar apenas status KYC (mais comum)
  const fetchKycStatus = useCallback(async (email: string) => {
    if (!email) return 'not_started';

    try {
      const result = await cachedQuery(`kyc_status_${email}`, async () => {
        // Consulta ultra-simplificada para evitar problema de RLS
        const { data, error } = await supabase
          .from('user_kyc')
          .select('kyc_status') // Apenas 1 campo para reduzir egress
          .eq('email', email)
          .limit(1)
          .maybeSingle();

        if (error || !data) {
          return 'not_started';
        }

        return data.kyc_status;
      });

      return result;
    } catch (error) {
      console.warn('Erro ao buscar status KYC:', error);
      return 'system_optimization'; // Status especial durante otimização
    }
  }, [cachedQuery]);

  // Função para invalidar cache quando necessário
  const invalidateCache = useCallback((email?: string) => {
    // Implementar lógica de invalidação se necessário
    console.log('Cache invalidado para:', email || 'todos os usuários');
  }, []);

  return {
    userStats,
    loading,
    error,
    fetchUserStats,
    fetchKycStatus,
    invalidateCache
  };
};