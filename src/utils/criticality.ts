export type CriticalityLevel = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * Normaliza diferentes formatos de criticidade para o padrão P0-P3
 */
export function normalizeCriticality(raw: unknown): CriticalityLevel | null {
  if (raw == null) return null;
  
  const val = String(raw).trim().toUpperCase();

  // Formato direto P0-P3
  if (/^P[0-3]$/.test(val)) return val as CriticalityLevel;
  
  // Números
  if (val === '0' || val.includes('CRIT')) return 'P0';
  if (val === '1' || val.includes('ALTO')) return 'P1';
  if (val === '2' || val.includes('MÉDIO') || val.includes('MEDIO')) return 'P2';
  if (val === '3' || val.includes('BAIXO')) return 'P3';
  
  return null;
}

/**
 * Formata duração em segundos para formato legível
 */
export function formatAvgSeconds(avgSeconds: number | null): string {
  if (avgSeconds == null) return '—';
  
  const d = Math.floor(avgSeconds / 86400);
  const h = Math.floor((avgSeconds % 86400) / 3600);
  const m = Math.floor((avgSeconds % 3600) / 60);
  
  return d >= 1 ? `${d}d ${h}h` : `${h}h ${m}m`;
}