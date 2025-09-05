import { useState, useCallback, useRef } from 'react';

// Hook ultra-otimizado para reduzir egress do Supabase ao máximo
export const useOptimizedEgressV2 = () => {
  const [egressStats, setEgressStats] = useState({
    queriesCount: 0,
    totalDataTransferred: 0,
    cacheHits: 0,
    cacheMisses: 0,
    bytesReduced: 0,
    rls_performance_issues: 0 // Contador para problemas de RLS
  });

  const queryCache = useRef(new Map<string, { data: any; timestamp: number; size: number }>());
  const CACHE_DURATION = 1800000; // 30 minutos para tabelas com problemas de RLS

  // Otimizar query com campos mínimos
  const optimizeQuery = useCallback((baseQuery: any, essentialFields: string[]) => {
    // Retornar apenas campos absolutamente essenciais (máximo 5-6 campos)
    return baseQuery.select(essentialFields.slice(0, 6).join(', '));
  }, []);

  // Cache super agressivo com persistência local
  const cachedQuery = useCallback(async (key: string, queryFn: () => Promise<any>) => {
    const cached = queryCache.current.get(key);
    const now = Date.now();

    // Verificar cache local primeiro
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setEgressStats(prev => ({
        ...prev,
        cacheHits: prev.cacheHits + 1,
        bytesReduced: prev.bytesReduced + cached.size
      }));
      return cached.data;
    }

    // Executar query apenas se realmente necessário
    let result;
    try {
      result = await queryFn();
    } catch (error: any) {
      // Se houver erro relacionado a RLS ou performance, incrementar contador
      if (error?.message?.includes('timeout') || 
          error?.message?.includes('policy') ||
          error?.message?.includes('permission')) {
        setEgressStats(prev => ({
          ...prev,
          rls_performance_issues: prev.rls_performance_issues + 1
        }));
      }
      throw error;
    }
    const dataSize = JSON.stringify(result).length;

    // Salvar no cache com persistência
    queryCache.current.set(key, {
      data: result,
      timestamp: now,
      size: dataSize
    });

    // Limpar cache antigo se muito grande (manter apenas últimos 50)
    if (queryCache.current.size > 50) {
      const entries = Array.from(queryCache.current.entries());
      const oldestEntries = entries
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)
        .slice(0, entries.length - 50);
      
      oldestEntries.forEach(([key]) => {
        queryCache.current.delete(key);
      });
    }

    setEgressStats(prev => ({
      ...prev,
      queriesCount: prev.queriesCount + 1,
      totalDataTransferred: prev.totalDataTransferred + dataSize,
      cacheMisses: prev.cacheMisses + 1
    }));

    return result;
  }, []);

  // Debounce para evitar requisições duplicadas
  const debouncedQuery = useCallback((key: string, queryFn: () => Promise<any>, delay = 300) => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const result = await cachedQuery(key, queryFn);
        resolve(result);
      }, delay);
    });
  }, [cachedQuery]);

  // Limpar cache manualmente se necessário
  const clearCache = useCallback(() => {
    queryCache.current.clear();
    setEgressStats({
      queriesCount: 0,
      totalDataTransferred: 0,
      cacheHits: 0,
      cacheMisses: 0,
      bytesReduced: 0,
      rls_performance_issues: 0
    });
  }, []);

  // Compactar dados antes de salvar
  const compactData = useCallback((data: any) => {
    if (Array.isArray(data)) {
      return data.map(item => {
        // Manter apenas campos essenciais
        const compacted: any = {};
        const essentialKeys = ['id', 'titulo', 'status', 'data_criacao', 'nivel_criticidade'];
        
        essentialKeys.forEach(key => {
          if (item[key] !== undefined) {
            compacted[key] = item[key];
          }
        });
        
        return compacted;
      });
    }
    return data;
  }, []);

  return {
    egressStats,
    optimizeQuery,
    cachedQuery,
    debouncedQuery,
    clearCache,
    compactData
  };
};