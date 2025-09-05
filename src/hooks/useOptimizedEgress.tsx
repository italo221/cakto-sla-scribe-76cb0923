import { useState, useCallback, useRef } from 'react';

// Hook para gerenciar e reduzir egress do Supabase
export const useOptimizedEgress = () => {
  const [egressStats, setEgressStats] = useState({
    queriesCount: 0,
    totalDataTransferred: 0,
    cacheHits: 0,
    cacheMisses: 0
  });

  const queryCache = useRef(new Map<string, { data: any; timestamp: number; size: number }>());
  const CACHE_DURATION = 300000; // 5 minutos

  // Otimizar query para reduzir egress
  const optimizeQuery = useCallback((baseQuery: any, fields: string[]) => {
    // Retornar apenas campos necessários
    return baseQuery.select(fields.join(', '));
  }, []);

  // Cache inteligente com controle de tamanho
  const cachedQuery = useCallback(async (key: string, queryFn: () => Promise<any>) => {
    const cached = queryCache.current.get(key);
    const now = Date.now();

    // Verificar cache
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setEgressStats(prev => ({
        ...prev,
        cacheHits: prev.cacheHits + 1
      }));
      return cached.data;
    }

    // Executar query
    const result = await queryFn();
    const dataSize = JSON.stringify(result).length;

    // Salvar no cache
    queryCache.current.set(key, {
      data: result,
      timestamp: now,
      size: dataSize
    });

    // Limpar cache se muito grande
    if (queryCache.current.size > 100) {
      const oldestKey = Array.from(queryCache.current.keys())[0];
      queryCache.current.delete(oldestKey);
    }

    setEgressStats(prev => ({
      ...prev,
      queriesCount: prev.queriesCount + 1,
      totalDataTransferred: prev.totalDataTransferred + dataSize,
      cacheMisses: prev.cacheMisses + 1
    }));

    return result;
  }, []);

  // Limpar cache
  const clearCache = useCallback(() => {
    queryCache.current.clear();
    setEgressStats({
      queriesCount: 0,
      totalDataTransferred: 0,
      cacheHits: 0,
      cacheMisses: 0
    });
  }, []);

  return {
    egressStats,
    optimizeQuery,
    cachedQuery,
    clearCache
  };
};