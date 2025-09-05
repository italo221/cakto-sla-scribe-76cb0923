import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { subscribeToChannel } from '@/lib/realtimeManager';

interface ColorData {
  hsl: string;
  hex: string;
  name: string;
}

export const useSystemColors = () => {
  const loadAndApplySystemColors = async () => {
    try {
      if (import.meta.env.DEV) console.log('🎨 Carregando cores do sistema...');
      
      // Carregar todas as configurações de uma vez
      const { data: settingsData, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['primary_color', 'secondary_color']);

      if (error) throw error;

      const settings = settingsData?.reduce((acc, item) => {
        acc[item.setting_key] = item.setting_value;
        return acc;
      }, {} as Record<string, any>) || {};

      // Aplicar cor primária
      if (settings.primary_color) {
        const primaryColor = settings.primary_color as ColorData;
        document.documentElement.style.setProperty('--primary', primaryColor.hsl);
        if (import.meta.env.DEV) console.log('✅ Cor primária aplicada:', primaryColor.hsl);
      }

      // Aplicar cor secundária
      if (settings.secondary_color) {
        const secondaryColor = settings.secondary_color as ColorData;
        document.documentElement.style.setProperty('--secondary', secondaryColor.hsl);
        if (import.meta.env.DEV) console.log('✅ Cor secundária aplicada:', secondaryColor.hsl);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar cores do sistema:', error);
    }
  };

  useEffect(() => {
    // Carregar cores iniciais
    loadAndApplySystemColors();

    const unsubscribe = subscribeToChannel('system-colors-changes', (channel) => {
      channel.on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'setting_key=in.(primary_color,secondary_color)'
        },
        (payload) => {
          if (import.meta.env.DEV) console.log('🔔 Mudança detectada:', payload);

          const { setting_key, setting_value } = payload.new as any;

          if (setting_key === 'primary_color' && setting_value) {
            const colorData = setting_value as ColorData;
            document.documentElement.style.setProperty('--primary', colorData.hsl);
            if (import.meta.env.DEV) console.log('🔥 Cor primária atualizada em tempo real:', colorData.hsl);
          }

          if (setting_key === 'secondary_color' && setting_value) {
            const colorData = setting_value as ColorData;
            document.documentElement.style.setProperty('--secondary', colorData.hsl);
            if (import.meta.env.DEV) console.log('🔥 Cor secundária atualizada em tempo real:', colorData.hsl);
          }
        }
      );
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { loadAndApplySystemColors };
};