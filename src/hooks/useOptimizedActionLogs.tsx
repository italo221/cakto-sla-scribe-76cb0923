import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedEgressV2 } from './useOptimizedEgressV2';

// Ultra-optimized hook for sla_action_logs to reduce RLS performance impact
export const useOptimizedActionLogs = () => {
  const [loading, setLoading] = useState(false);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const { cachedQuery, compactData } = useOptimizedEgressV2();
  
  const lastFetchTime = useRef<number>(0);
  const CACHE_DURATION = 3600000; // 1 hour cache for action logs
  const REQUEST_TIMEOUT = 8000; // 8 second timeout

  // Fetch action logs with minimal fields and aggressive caching
  const fetchActionLogs = useCallback(async (ticketId: string) => {
    const now = Date.now();
    const cacheKey = `action_logs_${ticketId}`;
    
    // Super aggressive caching - only fetch if really necessary
    if (now - lastFetchTime.current < CACHE_DURATION) {
      return actionLogs;
    }

    try {
      setLoading(true);
      
      const result = await cachedQuery(cacheKey, async () => {
        // Use promise race for timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), REQUEST_TIMEOUT)
        );
        
        const queryPromise = supabase
          .from('sla_action_logs')
          .select('id, acao, timestamp, autor_email, justificativa') // Only 5 essential fields
          .eq('sla_id', ticketId)
          .order('timestamp', { ascending: false })
          .limit(20); // Limit to most recent 20 logs

        return Promise.race([queryPromise, timeoutPromise]);
      });

      if (result?.data) {
        const compactedData = compactData(result.data);
        setActionLogs(compactedData);
        lastFetchTime.current = now;
        return compactedData;
      }
    } catch (error: any) {
      console.warn('ActionLogs fetch failed, using fallback:', error.message);
      
      // Graceful fallback - return minimal simulated data
      const fallbackLogs = [
        {
          id: 'fallback-1',
          acao: 'ticket_criado',
          timestamp: new Date().toISOString(),
          autor_email: 'sistema@automatico',
          justificativa: 'Histórico temporariamente indisponível'
        }
      ];
      setActionLogs(fallbackLogs);
      return fallbackLogs;
    } finally {
      setLoading(false);
    }
  }, [cachedQuery, compactData, actionLogs]);

  // Get logs count without fetching full data
  const getLogsCount = useCallback(async (ticketId: string) => {
    try {
      const countPromise = supabase
        .from('sla_action_logs')
        .select('id', { count: 'exact', head: true })
        .eq('sla_id', ticketId);
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Count timeout')), 3000)
      );
      
      const result = await Promise.race([countPromise, timeoutPromise]) as any;
      return result?.count || 0;
    } catch (error) {
      return 0; // Fallback count
    }
  }, []);

  // Add new log optimistically (for immediate UI feedback)
  const addLogOptimistic = useCallback((newLog: any) => {
    setActionLogs(prev => [newLog, ...prev.slice(0, 19)]); // Keep only 20 most recent
  }, []);

  const clearCache = useCallback(() => {
    setActionLogs([]);
    lastFetchTime.current = 0;
  }, []);

  return {
    actionLogs,
    loading,
    fetchActionLogs,
    getLogsCount,
    addLogOptimistic,
    clearCache
  };
};