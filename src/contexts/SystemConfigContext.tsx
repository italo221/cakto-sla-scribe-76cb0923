import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ColorData {
  hsl: string;
  hex: string;
  name: string;
}

interface SystemConfig {
  systemName: string;
  systemLogo: string | null;
  primaryColor: ColorData | null;
  secondaryColor: ColorData | null;
  isInitialized: boolean;
}

interface SystemConfigContextType extends SystemConfig {
  updateSystemName: (name: string) => void;
  updateSystemLogo: (logo: string | null) => void;
  updateColors: (primary: ColorData, secondary: ColorData) => void;
  clearCache: () => void;
}

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined);

// Cache global para evitar múltiplos carregamentos
let globalConfig: SystemConfig | null = null;
let isLoading = false;

export const SystemConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<SystemConfig>({
    systemName: '',
    systemLogo: null,
    primaryColor: null,
    secondaryColor: null,
    isInitialized: false
  });
  
  const subscriptionRef = useRef<any>(null);
  const hasAppliedInitialStyles = useRef(false);

  // Aplicar estilos CSS imediatamente
  const applyStyles = (systemConfig: SystemConfig) => {
    if (systemConfig.primaryColor?.hsl) {
      document.documentElement.style.setProperty('--primary', systemConfig.primaryColor.hsl);
    }
    if (systemConfig.secondaryColor?.hsl) {
      document.documentElement.style.setProperty('--secondary', systemConfig.secondaryColor.hsl);
    }
  };

  // Carregar configurações iniciais
  const loadInitialConfig = async () => {
    if (isLoading || globalConfig?.isInitialized) {
      if (globalConfig) {
        setConfig(globalConfig);
        if (!hasAppliedInitialStyles.current) {
          applyStyles(globalConfig);
          hasAppliedInitialStyles.current = true;
        }
      }
      return;
    }

    isLoading = true;
    
    try {
      // Implementar timeout para configurações
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Configuration timeout after 8 seconds')), 8000);
      });

      // Carregar todas as configurações de uma vez
      const fetchPromise = supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['system_name', 'system_logo', 'primary_color', 'secondary_color']);

      const { data: settingsData, error } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (error) throw error;

      const settings = settingsData?.reduce((acc, item) => {
        acc[item.setting_key] = item.setting_value;
        return acc;
      }, {} as Record<string, any>) || {};

      const newConfig: SystemConfig = {
        systemName: settings.system_name as string || 'Manhattan',
        systemLogo: settings.system_logo as string || null,
        primaryColor: settings.primary_color as ColorData || null,
        secondaryColor: settings.secondary_color as ColorData || null,
        isInitialized: true
      };

      // Aplicar estilos imediatamente
      applyStyles(newConfig);
      hasAppliedInitialStyles.current = true;

      // Atualizar estado e cache global
      setConfig(newConfig);
      globalConfig = newConfig;

      if (import.meta.env.DEV) {
        console.log('🚀 Configurações do sistema carregadas:', newConfig);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      
      // Configuração padrão em caso de erro
      const defaultConfig: SystemConfig = {
        systemName: 'Manhattan',
        systemLogo: null,
        primaryColor: { hsl: '142 76% 36%', hex: '#16a34a', name: 'Verde Padrão' },
        secondaryColor: { hsl: '262 83% 58%', hex: '#8b5cf6', name: 'Roxo Padrão' },
        isInitialized: true
      };
      
      applyStyles(defaultConfig);
      setConfig(defaultConfig);
      globalConfig = defaultConfig;
      hasAppliedInitialStyles.current = true;
    } finally {
      isLoading = false;
    }
  };

  // Configurar subscription em tempo real
  const setupRealtimeSubscription = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = supabase
      .channel('system-config-realtime')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'setting_key=in.(system_name,system_logo,primary_color,secondary_color)'
        },
        (payload) => {
          if (import.meta.env.DEV) {
            console.log('🔔 Configuração atualizada em tempo real:', payload);
          }
          
          const { setting_key, setting_value } = payload.new as any;
          
          setConfig(prev => {
            const updated = { ...prev };
            
            switch (setting_key) {
              case 'system_name':
                updated.systemName = setting_value as string;
                break;
              case 'system_logo':
                updated.systemLogo = setting_value as string;
                break;
              case 'primary_color':
                updated.primaryColor = setting_value as ColorData;
                if (setting_value?.hsl) {
                  document.documentElement.style.setProperty('--primary', setting_value.hsl);
                }
                break;
              case 'secondary_color':
                updated.secondaryColor = setting_value as ColorData;
                if (setting_value?.hsl) {
                  document.documentElement.style.setProperty('--secondary', setting_value.hsl);
                }
                break;
            }
            
            // Atualizar cache global
            globalConfig = updated;
            return updated;
          });
        }
      )
      .subscribe();
  };

  // Funções de atualização
  const updateSystemName = (name: string) => {
    setConfig(prev => {
      const updated = { ...prev, systemName: name };
      globalConfig = updated;
      return updated;
    });
  };

  const updateSystemLogo = (logo: string | null) => {
    setConfig(prev => {
      const updated = { ...prev, systemLogo: logo };
      globalConfig = updated;
      return updated;
    });
  };

  const updateColors = (primary: ColorData, secondary: ColorData) => {
    // Aplicar CSS imediatamente
    document.documentElement.style.setProperty('--primary', primary.hsl);
    document.documentElement.style.setProperty('--secondary', secondary.hsl);
    
    setConfig(prev => {
      const updated = { 
        ...prev, 
        primaryColor: primary, 
        secondaryColor: secondary 
      };
      globalConfig = updated;
      return updated;
    });
  };

  const clearCache = () => {
    globalConfig = null;
    hasAppliedInitialStyles.current = false;
  };

  // Inicializar ao montar o provider
  useEffect(() => {
    loadInitialConfig();
    setupRealtimeSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  const contextValue: SystemConfigContextType = {
    ...config,
    updateSystemName,
    updateSystemLogo,
    updateColors,
    clearCache
  };

  return (
    <SystemConfigContext.Provider value={contextValue}>
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = () => {
  const context = useContext(SystemConfigContext);
  if (context === undefined) {
    throw new Error('useSystemConfig must be used within a SystemConfigProvider');
  }
  return context;
};