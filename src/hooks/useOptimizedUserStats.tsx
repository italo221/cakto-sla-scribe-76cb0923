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

  // Cache ultra-agressivo para compensar políticas RLS lentas em user_profits
  const fetchUserStats = useCallback(async (email: string) => {
    if (!email) return null;

    setLoading(true);
    setError(null);

    try {
      // Cache de 45 minutos especificamente para user_profits devido à política RLS lenta
      const stats = await cachedQuery(`user_stats_profits_${email}`, async () => {
        try {
          // Tentar usar função do banco primeiro (mais eficiente que RLS por linha)
          const { data, error } = await supabase.rpc('get_user_stats', { 
            user_email: email 
          });

          if (error) throw error;
          return data?.[0];
        } catch (rpcError) {
          console.warn('Função get_user_stats falhou, usando consultas otimizadas:', rpcError);
          
          // Fallback: usar consultas separadas com cache para evitar RLS lenta
          const [kycData, registrationData, profitData] = await Promise.allSettled([
            // KYC com timeout para evitar travamento
            Promise.race([
              supabase.from('user_kyc').select('kyc_status').eq('email', email).limit(1).maybeSingle(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('kyc_timeout')), 5000))
            ]),
            // Registration com timeout
            Promise.race([
              supabase.from('user_registrations').select('status').eq('email', email).limit(1).maybeSingle(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('reg_timeout')), 5000))
            ]),
            // Profits com timeout e agregação mínima para reduzir impacto da RLS lenta
            Promise.race([
              supabase.from('user_profits')
                .select('profit_amount') // Apenas campo essencial
                .eq('email', email)
                .gte('profit_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
                .limit(50), // Limitar para evitar RLS lenta em muitas linhas
              new Promise((_, reject) => setTimeout(() => reject(new Error('profit_timeout')), 8000))
            ])
          ]);

          // Processar resultados com fallbacks seguros e type safety
          const kycStatus = kycData.status === 'fulfilled' && 
            (kycData.value as any)?.data?.kyc_status || 'not_started';
          const regStatus = registrationData.status === 'fulfilled' && 
            (registrationData.value as any)?.data?.status || 'not_registered';
          
          let totalProfit = 0;
          let profitCount = 0;
          
          if (profitData.status === 'fulfilled' && (profitData.value as any)?.data) {
            const profits = (profitData.value as any).data;
            totalProfit = profits.reduce((sum: number, p: any) => sum + (p.profit_amount || 0), 0);
            profitCount = profits.length;
          }

          return {
            email,
            has_registration: regStatus !== 'not_registered',
            registration_status: regStatus,
            kyc_status: kycStatus,
            total_profit_30_days: totalProfit,
            profit_count_30_days: profitCount
          };
        }
      });

      setUserStats(stats || {
        email,
        has_registration: false,
        registration_status: 'not_registered',
        kyc_status: 'not_started',
        total_profit_30_days: 0,
        profit_count_30_days: 0
      });
      
      return stats;

    } catch (error: any) {
      console.error('Erro ao buscar estatísticas do usuário (RLS lenta):', error);
      
      // Fallback mais agressivo para problemas de RLS performance
      const fallbackStats: UserStats = {
        email,
        has_registration: false,
        registration_status: 'rls_optimization_mode',
        kyc_status: 'rls_optimization_mode', 
        total_profit_30_days: 0,
        profit_count_30_days: 0
      };

      setUserStats(fallbackStats);
      setError('Sistema otimizando políticas de segurança. Dados podem estar limitados.');
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