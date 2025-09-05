import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedEgressV2 } from './useOptimizedEgressV2';

interface UserProfit {
  id: string;
  profit_amount: number;
  profit_date: string;
  profit_type?: string;
  description?: string;
}

interface ProfitStats {
  total_30_days: number;
  count_30_days: number;
  total_7_days: number;
  count_7_days: number;
  recent_profits: UserProfit[];
}

// Hook ultra-otimizado para user_profits
// Compensa problema de RLS que chama auth.uid() por linha
export const useOptimizedProfits = () => {
  const [profitStats, setProfitStats] = useState<ProfitStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { cachedQuery } = useOptimizedEgressV2();

  // Fetch super-otimizado com cache de 1 hora para compensar RLS lenta
  const fetchProfitStats = useCallback(async (email: string) => {
    if (!email) return null;

    setLoading(true);
    setError(null);

    try {
      // Cache de 1 hora especificamente para user_profits devido ao problema RLS
      const stats = await cachedQuery(`profit_stats_${email}`, async () => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        try {
          // Tentar consulta otimizada com timeout para evitar travamento por RLS lenta
          const profitQuery = supabase
            .from('user_profits')
            .select('profit_amount, profit_date, profit_type') // Apenas campos essenciais
            .eq('email', email)
            .gte('profit_date', thirtyDaysAgo.toISOString().split('T')[0])
            .order('profit_date', { ascending: false })
            .limit(20); // Limitar drasticamente para reduzir impacto RLS

          // Timeout de 5 segundos (reduzido) para evitar travamento por auth.uid() per-row
          const { data, error } = await Promise.race([
            profitQuery,
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('user_profits_auth_uid_timeout')), 5000)
            )
          ]);

          if (error) throw error;

          const profits = data || [];
          
          // Calcular estatísticas
          const profits30Days = profits.filter(p => 
            new Date(p.profit_date) >= thirtyDaysAgo
          );
          const profits7Days = profits.filter(p => 
            new Date(p.profit_date) >= sevenDaysAgo
          );

          return {
            total_30_days: profits30Days.reduce((sum, p) => sum + (p.profit_amount || 0), 0),
            count_30_days: profits30Days.length,
            total_7_days: profits7Days.reduce((sum, p) => sum + (p.profit_amount || 0), 0),
            count_7_days: profits7Days.length,
            recent_profits: profits.slice(0, 5).map(p => ({
              id: `profit_${p.profit_date}_${p.profit_amount}`,
              profit_amount: p.profit_amount || 0,
              profit_date: p.profit_date,
              profit_type: p.profit_type || 'unknown',
              description: `Lucro de ${p.profit_amount || 0}`
            }))
          };

        } catch (queryError: any) {
          console.warn('Query user_profits falhou (RLS lenta):', queryError);
          
          // Fallback: dados zerados para evitar travamento
          return {
            total_30_days: 0,
            count_30_days: 0,
            total_7_days: 0,
            count_7_days: 0,
            recent_profits: []
          };
        }
      });

      setProfitStats(stats);
      return stats;

    } catch (error: any) {
      console.error('Erro ao buscar dados de lucro (RLS performance issue):', error);
      
      // Fallback para problemas de RLS
      const fallbackStats: ProfitStats = {
        total_30_days: 0,
        count_30_days: 0,
        total_7_days: 0,
        count_7_days: 0,
        recent_profits: []
      };

      setProfitStats(fallbackStats);
      setError('Dados de lucro temporariamente indisponíveis devido à otimização do sistema');
      return fallbackStats;

    } finally {
      setLoading(false);
    }
  }, [cachedQuery]);

  // Função simplificada para apenas verificar se usuário tem lucros
  const checkHasProfits = useCallback(async (email: string): Promise<boolean> => {
    if (!email) return false;

    try {
      const result = await cachedQuery(`has_profits_${email}`, async () => {
        // Query ultra-simples com timeout curto
        const { data, error } = await Promise.race([
          supabase
            .from('user_profits')
            .select('id') // Apenas ID para verificar existência
            .eq('email', email)
            .limit(1),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('has_profits_timeout')), 3000)
          )
        ]);

        if (error) return false;
        return (data && data.length > 0);
      });

      return result;
    } catch (error) {
      console.warn('Verificação de lucros falhou (RLS issue):', error);
      return false; // Falso seguro em caso de problema
    }
  }, [cachedQuery]);

  return {
    profitStats,
    loading,
    error,
    fetchProfitStats,
    checkHasProfits
  };
};