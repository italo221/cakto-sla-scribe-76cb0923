# Otimizações para Queries Lentas - Implementadas

## 🚨 Problemas Identificados nas Queries Lentas

### Realtime - Problema Crítico
- **108,829 calls** para `realtime.subscription` - 2+ segundos
- **109,496 calls** para `realtime.list_changes` - 8+ segundos  
- **Total**: >10 segundos de overhead por minuto

### Information Schema - Overhead do Dashboard
- **51 calls** para queries de metadata - 237 segundos total
- Queries complexas do dashboard Supabase causando lentidão

## ✅ Otimizações Implementadas

### 1. **REALTIME COMPLETAMENTE DESABILITADO**
```typescript
// ❌ ANTES: enableRealtime: true
// ✅ AGORA: enableRealtime: false (permanente)

// Arquivos corrigidos:
- src/hooks/useOptimizedTickets.tsx
- src/contexts/SystemConfigContext.tsx  
- src/hooks/useSystemSettings.tsx
- src/pages/Kanban.tsx
- src/pages/TvDashboard.tsx
```

### 2. **Configuração de Performance Centralizada**
```typescript
// src/lib/performanceConfig.ts
export const PERFORMANCE_CONFIG = {
  REALTIME_ENABLED: false, // ❌ Desabilitado permanentemente
  LIMITS: {
    TICKETS_PER_PAGE: 5, // Reduzido de 25 para 5
    NOTIFICATIONS_LIMIT: 30,
    COMMENTS_LIMIT: 20,
  },
  TIMEOUTS: {
    USER_KYC: 3000,
    USER_PROFITS: 5000, 
    TICKETS: 8000,
  }
};
```

### 3. **RLS Policies Otimizadas**  
```sql
-- ✅ Política otimizada para user_kyc
CREATE POLICY "Users can read own kyc data"
    ON public.user_kyc
    FOR SELECT
    TO authenticated
    USING ( 
      email IN ( 
        SELECT p.email 
        FROM profiles p 
        WHERE p.user_id = (SELECT auth.uid()) 
      ) 
    );
```

### 4. **Campos Essenciais (SELECT otimizado)**
```typescript
// ❌ ANTES: SELECT * (25+ campos)
// ✅ AGORA: SELECT id, titulo, status, data_criacao, nivel_criticidade, pontuacao_total, setor_id

ESSENTIAL_FIELDS: {
  TICKETS: ['id', 'titulo', 'status', 'data_criacao', 'nivel_criticidade', 'pontuacao_total', 'setor_id'],
  USER_PROFILES: ['user_id', 'nome_completo', 'email', 'role'],
  SETORES: ['id', 'nome'],
}
```

### 5. **Timeouts e Error Handling**
```typescript
// Timeout automático para evitar queries travadas
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, operation: string) => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`${operation}_timeout`)), timeoutMs)
    )
  ]);
};
```

## 📊 Impacto Esperado

### Redução de Queries
- **Realtime**: ~218,000 queries/min → 0 queries/min
- **Metadata**: Redução de 70% nas queries de schema
- **Egress**: Redução estimada de 60-80%

### Melhorias de Performance
- **Tempo de carregamento**: -50%
- **Queries por minuto**: -70%
- **Overhead do banco**: -80%

## 🔍 Monitoramento

### Logs de Performance
```typescript
const logPerformanceIssue = (operation: string, duration: number) => {
  if (duration > 1000) {
    console.warn(`🐌 Performance Issue: ${operation} took ${duration}ms`);
  }
};
```

### Métricas a Acompanhar
1. **Total calls para realtime.subscription** (deve ser 0)
2. **Tempo médio de queries** (deve reduzir 50%+)
3. **Egress total** (deve voltar aos ~13GB/dia)
4. **Errors de timeout** (devem reduzir drasticamente)

## ⚠️ Considerações

### Funcionalidades Desabilitadas Temporariamente
- **Updates em tempo real** - usuários precisam fazer refresh manual
- **Notificações instantâneas** - atualização por polling

### Possível Reativação Futura
- Realtime pode ser reativado quando Supabase otimizar o sistema
- Implementar realtime seletivo apenas para operações críticas
- Considerar websockets externos se necessário

## 🎯 Próximos Passos

1. **Monitorar métricas** nas próximas 24-48h
2. **Verificar se egress volta aos ~13GB/dia**
3. **Ajustar limites** se necessário
4. **Considerar lazy loading** para dados não críticos

---

**Status**: ✅ Implementado  
**Data**: 2025-01-09  
**Impacto**: Crítico para performance  