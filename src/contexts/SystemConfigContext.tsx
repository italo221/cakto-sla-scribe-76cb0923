import { createContext, useContext, useState, useEffect } from 'react';

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

const defaultConfig: SystemConfig = {
  systemName: 'Manhattan',
  systemLogo: null,
  primaryColor: { hsl: '142 76% 36%', hex: '#16a34a', name: 'Verde Padrão' },
  secondaryColor: { hsl: '262 83% 58%', hex: '#8b5cf6', name: 'Roxo Padrão' },
  isInitialized: true
};

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined);

export const SystemConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);

  // Apply CSS styles
  useEffect(() => {
    if (config.primaryColor?.hsl) {
      document.documentElement.style.setProperty('--primary', config.primaryColor.hsl);
    }
    if (config.secondaryColor?.hsl) {
      document.documentElement.style.setProperty('--secondary', config.secondaryColor.hsl);
    }
  }, [config.primaryColor, config.secondaryColor]);

  const updateSystemName = (name: string) => {
    setConfig(prev => ({ ...prev, systemName: name }));
  };

  const updateSystemLogo = (logo: string | null) => {
    setConfig(prev => ({ ...prev, systemLogo: logo }));
  };

  const updateColors = (primary: ColorData, secondary: ColorData) => {
    document.documentElement.style.setProperty('--primary', primary.hsl);
    document.documentElement.style.setProperty('--secondary', secondary.hsl);
    setConfig(prev => ({ ...prev, primaryColor: primary, secondaryColor: secondary }));
  };

  const clearCache = () => {
    // Placeholder for cache clearing
  };

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