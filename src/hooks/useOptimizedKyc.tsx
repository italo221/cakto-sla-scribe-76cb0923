import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedEgressV2 } from './useOptimizedEgressV2';

interface KycData {
  id: string;
  email: string;
  kyc_status: string;
  kyc_date?: string;
  verification_level?: string;
  created_at: string;
  updated_at: string;
}

// Hook ultra-otimizado específico para user_kyc
// Compensa problema crítico de RLS que chama auth.uid() por linha
export const useOptimizedKyc = () => {
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { cachedQuery } = useOptimizedEgressV2();

  // Fetch ultra-otimizado com cache extremo para compensar RLS lenta na user_kyc
  const fetchKycData = useCallback(async (email: string) => {
    if (!email) return null;

    setLoading(true);
    setError(null);

    try {
      // Cache de 2 horas especificamente para user_kyc devido ao problema crítico de RLS
      const data = await cachedQuery(`kyc_data_${email}`, async () => {
        try {
          console.log('🔍 Tentando consulta ultra-otimizada user_kyc...');
          
          // Timeout ultra-curto de 5s para evitar travamento por RLS lenta
          const kycQuery = supabase
            .from('user_kyc')
            .select('kyc_status') // Apenas 1 campo crítico para minimizar impacto RLS
            .eq('email', email)
            .limit(1)
            .maybeSingle();

          const { data, error } = await Promise.race([
            kycQuery,
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('user_kyc_rls_timeout')), 5000)
            )
          ]);

          if (error) {
            console.warn('Query user_kyc falhou (RLS auth.uid() issue):', error);
            throw error;
          }

          if (!data) {
            // Não encontrado - retornar dados mínimos
            return {
              id: `kyc_${email}`,
              email,
              kyc_status: 'not_started',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }

          // Retornar dados mínimos para reduzir egress
          return {
            id: `kyc_${email}`,
            email,
            kyc_status: data.kyc_status || 'not_started',
            kyc_date: undefined, // Não carregar para reduzir dados
            verification_level: undefined, // Não carregar para reduzir dados
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

        } catch (queryError: any) {
          console.error('Query user_kyc falhou completamente (auth.uid() RLS issue):', queryError);
          
          // Fallback extremo para problema de RLS
          return {
            id: `kyc_fallback_${email}`,
            email,
            kyc_status: 'rls_optimization_active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      });

      setKycData(data);
      return data;

    } catch (error: any) {
      console.error('Erro crítico ao buscar KYC (auth.uid() RLS performance):', error);
      
      // Fallback para problemas críticos de RLS
      const fallbackData: KycData = {
        id: `kyc_emergency_${email}`,
        email,
        kyc_status: 'system_maintenance',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setKycData(fallbackData);
      setError('Sistema KYC temporariamente em manutenção devido à otimização de segurança');
      return fallbackData;

    } finally {
      setLoading(false);
    }
  }, [cachedQuery]);

  // Função ultra-simplificada apenas para status KYC (mais usada)
  const getKycStatus = useCallback(async (email: string): Promise<string> => {
    if (!email) return 'not_started';

    try {
      // Cache de 3 horas para status simples
      const status = await cachedQuery(`kyc_status_simple_${email}`, async () => {
        try {
          // Timeout de apenas 3 segundos para consulta crítica
          const { data, error } = await Promise.race([
            supabase.from('user_kyc').select('kyc_status').eq('email', email).limit(1).maybeSingle(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('kyc_status_timeout')), 3000)
            )
          ]);

          if (error || !data) {
            console.warn('KYC status query falhou, usando fallback:', error);
            return 'optimization_mode';
          }

          return data.kyc_status || 'not_started';
        } catch (err) {
          console.warn('KYC status timeout (RLS lenta):', err);
          return 'rls_timeout_fallback';
        }
      });

      return status;

    } catch (error) {
      console.warn('getKycStatus falhou completamente:', error);
      return 'system_error'; // Status de erro seguro
    }
  }, [cachedQuery]);

  // Função para verificar se KYC está completo (sem carregar dados completos)
  const isKycCompleted = useCallback(async (email: string): Promise<boolean> => {
    const status = await getKycStatus(email);
    return ['verified', 'approved', 'completed'].includes(status);
  }, [getKycStatus]);

  // Função para forçar modo offline quando RLS está problemática
  const enableOfflineMode = useCallback(() => {
    setKycData({
      id: 'offline_mode',
      email: 'offline@system',
      kyc_status: 'offline_mode',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    setError('Modo offline ativado devido a problemas de performance RLS');
  }, []);

  return {
    kycData,
    loading,
    error,
    fetchKycData,
    getKycStatus,
    isKycCompleted,
    enableOfflineMode
  };
};