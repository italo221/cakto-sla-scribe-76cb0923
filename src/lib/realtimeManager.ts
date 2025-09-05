// ❌ REALTIME MANAGER COMPLETAMENTE DESABILITADO
// 
// Este arquivo foi desabilitado devido ao overhead crítico de performance:
// - 112,001 calls para realtime.subscription (2,081,164ms total)
// - 118,236 calls para realtime.list_changes (8,146,728ms total)
// 
// Todas as funções agora retornam no-ops para evitar qualquer overhead

import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * ❌ DESABILITADO: Função no-op que não faz nada para eliminar overhead
 */
export function subscribeToChannel(
  name: string,
  setup: (channel: RealtimeChannel) => void,
): () => void {
  console.warn('⚠️ Realtime desabilitado permanentemente para performance');
  
  // Retorna função de cleanup vazia - sem subscriptions
  return () => {
    // No-op - sem cleanup necessário pois não há subscriptions
  };
}
