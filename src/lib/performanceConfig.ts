/**
 * Configurações de Performance para Reduzir Overhead do Supabase
 * 
 * Análise das Queries Lentas (Problema Principal):
 * - 108,829 calls para realtime.subscription (2+ segundos)
 * - 109,496 calls para realtime.list_changes (8+ segundos)
 * - Overhead total: >10 segundos por minuto
 */

export const PERFORMANCE_CONFIG = {
  // ❌ REALTIME COMPLETAMENTE DESABILITADO
  REALTIME_ENABLED: false,
  
  // Configurações de Cache Agressivo
  CACHE_DURATION: {
    TICKETS: 5 * 60 * 1000, // 5 minutos
    USER_DATA: 2 * 60 * 60 * 1000, // 2 horas
    SYSTEM_SETTINGS: 10 * 60 * 1000, // 10 minutos
    NOTIFICATIONS: 2 * 60 * 1000, // 2 minutos
  },
  
  // Timeouts para Evitar Queries Travadas
  TIMEOUTS: {
    USER_KYC: 3000, // 3 segundos
    USER_PROFITS: 5000, // 5 segundos
    TICKETS: 8000, // 8 segundos
    COMMENTS: 5000, // 5 segundos
  },
  
  // Limits para Reduzir Egress
  LIMITS: {
    TICKETS_PER_PAGE: 5, // Reduzido drasticamente
    NOTIFICATIONS_LIMIT: 30,
    COMMENTS_LIMIT: 20,
    RECENT_PROFITS: 20,
  },
  
  // Campos Essenciais para SELECT (não usar SELECT *)
  ESSENTIAL_FIELDS: {
    TICKETS: [
      'id', 'titulo', 'status', 'data_criacao', 
      'nivel_criticidade', 'pontuacao_total', 'setor_id'
    ],
    USER_PROFILES: [
      'user_id', 'nome_completo', 'email', 'role'
    ],
    SETORES: [
      'id', 'nome'
    ],
  },
  
  // Configurações de Debounce
  DEBOUNCE: {
    SEARCH: 500, // 500ms
    USER_INPUT: 300, // 300ms
    CACHE_INVALIDATION: 1000, // 1 segundo
  },
} as const;

/**
 * Logs de Performance para Monitoramento
 */
export const logPerformanceIssue = (operation: string, duration: number, details?: any) => {
  if (duration > 1000) { // Log apenas operações > 1 segundo
    console.warn(`🐌 Performance Issue: ${operation} took ${duration}ms`, details);
  }
};

/**
 * Wrapper para Queries com Timeout Automático
 */
export const withTimeout = <T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  operation: string
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`${operation}_timeout`)), timeoutMs)
    )
  ]);
};

/**
 * Cache Manager Simplificado
 */
class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>();

  set(key: string, data: T, ttl: number) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

export const createCache = <T>() => new SimpleCache<T>();