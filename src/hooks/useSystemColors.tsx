import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface ColorData {
  hsl: string;
  hex: string;
  name: string;
}

export const useSystemColors = () => {
  const loadAndApplySystemColors = async () => {
    try {
      console.log('🎨 Carregando cores do sistema...');
      
      // Carregar cor primária
      const { data: primaryData, error: primaryError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'primary_color')
        .single();

      if (!primaryError && primaryData) {
        const primaryColor = primaryData.setting_value as unknown as ColorData;
        document.documentElement.style.setProperty('--primary', primaryColor.hsl);
        console.log('✅ Cor primária aplicada:', primaryColor.hsl);
      }

      // Carregar cor secundária
      const { data: secondaryData, error: secondaryError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'secondary_color')
        .single();

      if (!secondaryError && secondaryData) {
        const secondaryColor = secondaryData.setting_value as unknown as ColorData;
        document.documentElement.style.setProperty('--secondary', secondaryColor.hsl);
        console.log('✅ Cor secundária aplicada:', secondaryColor.hsl);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar cores do sistema:', error);
    }
  };

  useEffect(() => {
    loadAndApplySystemColors();
  }, []);

  return { loadAndApplySystemColors };
};