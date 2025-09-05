import { useState, useEffect, useCallback } from 'react';
import { useOptimizedEgressV2 } from './useOptimizedEgressV2';

// Hook de fallback para substituir consultas custosas de usuário
// Usado quando políticas RLS estão causando problemas de performance
export const useFallbackUserData = () => {
  const [fallbackMode, setFallbackMode] = useState(false);
  const { egressStats } = useOptimizedEgressV2();

  // Detectar se devemos usar modo fallback baseado nas estatísticas de erro
  useEffect(() => {
    const errorRate = egressStats.cacheMisses / (egressStats.queriesCount || 1);
    
    // Se muitos cache misses ou muitos erros, ativar fallback
    if (errorRate > 0.5 && egressStats.queriesCount > 5) {
      setFallbackMode(true);
      console.log('🚨 Ativando modo fallback devido a problemas de performance');
    }
  }, [egressStats]);

  const getFallbackUserData = useCallback((email: string) => {
    return {
      email,
      has_registration: true,
      registration_status: 'active',
      registration_date: new Date().toISOString(),
      kyc_status: 'verified',
      kyc_date: new Date().toISOString(),
      total_profit_30_days: 0,
      profit_count_30_days: 0,
      verification_level: 'basic',
      note: 'Dados simulados durante otimização do sistema'
    };
  }, []);

  const getFallbackKycData = useCallback((email: string) => {
    // Dados específicos para problema de RLS auth.uid() na user_kyc
    return {
      id: `fallback-kyc-${email}`,
      email,
      kyc_status: 'rls_bypass_mode', // Status especial para indicar modo fallback
      kyc_date: new Date().toISOString(),
      verification_level: 'system_fallback',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      note: 'Dados KYC em modo fallback devido à otimização de políticas auth.uid()'
    };
  }, []);

  const getFallbackRegistrationData = useCallback((email: string) => {
    return {
      id: `fallback-reg-${email}`,
      email,
      status: 'active',
      registration_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
  }, []);

  const getFallbackProfitData = useCallback((email: string) => {
    // Dados mais realistas para modo fallback durante problemas de RLS
    return {
      total_profit_30_days: 0,
      profit_count_30_days: 0,
      total_profit_7_days: 0,
      profit_count_7_days: 0,
      profits: [],
      note: 'Dados de lucro indisponíveis durante otimização de políticas de segurança'
    };
  }, []);

  // Função específica para detectar problemas com user_profits RLS
  const detectProfitsRlsIssue = useCallback(() => {
    const errorMessages = [
      'user_profits_timeout',
      'policy evaluation timeout',
      'auth.uid() performance',
      'RLS policy slow'
    ];
    
    // Verificar se há indicadores de problema de RLS
    return errorMessages.some(msg => 
      localStorage.getItem('recent_errors')?.includes(msg)
    );
  }, []);

  // Função específica para detectar problemas com user_kyc RLS auth.uid()
  const detectKycRlsIssue = useCallback(() => {
    const kycErrorMessages = [
      'user_kyc_rls_timeout',
      'kyc_ultra_timeout', 
      'kyc_status_timeout',
      'auth.uid() performance',
      'RLS policy slow on user_kyc'
    ];
    
    // Verificar se há indicadores específicos de problema RLS user_kyc
    const recentErrors = localStorage.getItem('recent_kyc_errors') || '';
    return kycErrorMessages.some(msg => recentErrors.includes(msg));
  }, []);

  // Função para detectar problemas com sla_action_logs RLS
  const detectActionLogsRlsIssue = useCallback(() => {
    const actionLogsErrorMessages = [
      'sla_action_logs_timeout',
      'action_logs_rls_timeout',
      'auth.uid() per row evaluation',
      'RLS policy slow on sla_action_logs'
    ];
    
    const recentErrors = localStorage.getItem('recent_action_logs_errors') || '';
    return actionLogsErrorMessages.some(msg => recentErrors.includes(msg));
  }, []);

  const getFallbackActionLogs = useCallback((ticketId: string) => {
    return [
      {
        id: `fallback-log-${ticketId}-1`,
        acao: 'ticket_criado',
        timestamp: new Date().toISOString(),
        autor_email: 'sistema@fallback',
        justificativa: 'Log em modo fallback durante otimização RLS'
      }
    ];
  }, []);

  return {
    fallbackMode,
    setFallbackMode,
    getFallbackUserData,
    getFallbackKycData,
    getFallbackRegistrationData,
    getFallbackProfitData,
    getFallbackActionLogs,
    detectProfitsRlsIssue,
    detectKycRlsIssue,
    detectActionLogsRlsIssue
  };
};