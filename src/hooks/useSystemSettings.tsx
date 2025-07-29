import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemSettings {
  systemName: string;
  systemLogo: string | null;
}

// Cache global dos settings para sincronização instantânea
let settingsCache: SystemSettings | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 1000; // 30 segundos
let isInitialLoading = true; // Flag para controlar carregamento inicial

export const useSystemSettings = () => {
  const [systemName, setSystemName] = useState(''); // Iniciar vazio para evitar flicker
  const [systemLogo, setSystemLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Começar com loading true
  const subscriptionRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false); // Estado para indicar quando está pronto

  const fetchSystemSettings = async (forceRefresh = false) => {
    const now = Date.now();
    
    // Se temos cache válido e não é refresh forçado, usar o cache
    if (!forceRefresh && settingsCache && (now - lastFetchTime) < CACHE_DURATION) {
      setSystemName(settingsCache.systemName);
      setSystemLogo(settingsCache.systemLogo);
      setIsReady(true);
      setLoading(false);
      return;
    }

    // Só mostrar loading se for o carregamento inicial
    if (isInitialLoading) {
      setLoading(true);
    }
    
    try {
      // Buscar configurações de forma mais eficiente
      const { data: settingsData, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['system_name', 'system_logo']);

      if (error) throw error;

      const settings = settingsData?.reduce((acc, item) => {
        acc[item.setting_key] = item.setting_value;
        return acc;
      }, {} as Record<string, any>) || {};

      const nameValue = settings.system_name as string || 'Manhattan';
      const logoValue = settings.system_logo as string || null;

      // Atualizar cache
      settingsCache = {
        systemName: nameValue,
        systemLogo: logoValue
      };
      lastFetchTime = now;

      // Atualizar estado de forma sincronizada para evitar flicker
      setSystemName(nameValue);
      setSystemLogo(logoValue);
      setIsReady(true);
      isInitialLoading = false;
    } catch (error) {
      console.error('Erro ao carregar configurações do sistema:', error);
      // Em caso de erro, usar valores padrão
      setSystemName('Manhattan');
      setSystemLogo(null);
      setIsReady(true);
      isInitialLoading = false;
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    // Limpar subscription anterior se existir
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Criar nova subscription para mudanças em tempo real
    subscriptionRef.current = supabase
      .channel('system-settings-changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'setting_key=in.(system_name,system_logo)'
        },
        (payload) => {
          if (import.meta.env.DEV) console.log('🔔 Configuração atualizada:', payload);
          
          const { setting_key, setting_value } = payload.new as any;
          
          if (setting_key === 'system_name') {
            const newName = setting_value as string;
            setSystemName(newName);
            // Atualizar cache imediatamente
            if (settingsCache) {
              settingsCache.systemName = newName;
            }
            setIsReady(true);
            if (import.meta.env.DEV) console.log('🔥 Nome do sistema atualizado em tempo real:', newName);
          }
          
          if (setting_key === 'system_logo') {
            const newLogo = setting_value as string;
            setSystemLogo(newLogo);
            // Atualizar cache imediatamente
            if (settingsCache) {
              settingsCache.systemLogo = newLogo;
            }
            setIsReady(true);
            if (import.meta.env.DEV) console.log('🔥 Logo do sistema atualizada em tempo real');
          }
        }
      )
      .subscribe();
  };

  const updateSystemName = (newName: string) => {
    setSystemName(newName);
    // Atualizar cache também
    if (settingsCache) {
      settingsCache.systemName = newName;
    }
  };

  const updateSystemLogo = (newLogo: string | null) => {
    setSystemLogo(newLogo);
    // Atualizar cache também
    if (settingsCache) {
      settingsCache.systemLogo = newLogo;
    }
  };

  const clearCache = () => {
    settingsCache = null;
    lastFetchTime = 0;
  };

  useEffect(() => {
    // Se já temos cache, usar imediatamente para evitar flicker
    if (settingsCache) {
      setSystemName(settingsCache.systemName);
      setSystemLogo(settingsCache.systemLogo);
      setIsReady(true);
      setLoading(false);
      isInitialLoading = false;
    } else {
      fetchSystemSettings();
    }

    // Configurar subscription em tempo real
    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    systemName,
    systemLogo,
    loading,
    isReady, // Novo campo para indicar quando os dados estão prontos
    updateSystemName,
    updateSystemLogo,
    refreshSettings: () => fetchSystemSettings(true),
    clearCache
  };
};