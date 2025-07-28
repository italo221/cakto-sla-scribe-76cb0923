import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemSettings {
  systemName: string;
  systemLogo: string | null;
}

// Cache global dos settings para evitar requisições desnecessárias
let settingsCache: SystemSettings | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const useSystemSettings = () => {
  const [systemName, setSystemName] = useState('Cakto');
  const [systemLogo, setSystemLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSystemSettings = async (forceRefresh = false) => {
    const now = Date.now();
    
    // Se temos cache válido e não é refresh forçado, usar o cache
    if (!forceRefresh && settingsCache && (now - lastFetchTime) < CACHE_DURATION) {
      setSystemName(settingsCache.systemName);
      setSystemLogo(settingsCache.systemLogo);
      return;
    }

    setLoading(true);
    
    try {
      const [nameResponse, logoResponse] = await Promise.all([
        supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'system_name')
          .single(),
        supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'system_logo')
          .single()
      ]);

      const nameValue = nameResponse.data?.setting_value as string || 'Manhattan';
      const logoValue = logoResponse.data?.setting_value as string || null;

      // Atualizar cache
      settingsCache = {
        systemName: nameValue,
        systemLogo: logoValue
      };
      lastFetchTime = now;

      // Atualizar estado
      setSystemName(nameValue);
      setSystemLogo(logoValue);
    } catch (error) {
      console.error('Erro ao carregar configurações do sistema:', error);
    } finally {
      setLoading(false);
    }
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
    // Se já temos cache, usar imediatamente
    if (settingsCache) {
      setSystemName(settingsCache.systemName);
      setSystemLogo(settingsCache.systemLogo);
      setLoading(false);
    } else {
      fetchSystemSettings();
    }
  }, []);

  return {
    systemName,
    systemLogo,
    loading,
    updateSystemName,
    updateSystemLogo,
    refreshSettings: () => fetchSystemSettings(true),
    clearCache
  };
};