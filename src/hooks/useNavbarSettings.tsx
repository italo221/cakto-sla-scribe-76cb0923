import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface NavbarSettings {
  navbar_position: 'top' | 'left';
  navbar_glass: boolean;
}

const DEFAULT_SETTINGS: NavbarSettings = {
  navbar_position: 'top',
  navbar_glass: false,
};

export function useNavbarSettings() {
  const [settings, setSettings] = useState<NavbarSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Load settings from database
  useEffect(() => {
    if (profile) {
      setSettings({
        navbar_position: ((profile as any).navbar_position as 'top' | 'left') || 'top',
        navbar_glass: (profile as any).navbar_glass || false,
      });
    }
    setLoading(false);
  }, [profile]);

  const updateSettings = async (newSettings: Partial<NavbarSettings>) => {
    if (!user) return;

    try {
      setLoading(true);
      
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('profiles')
        .update({
          navbar_position: updatedSettings.navbar_position,
          navbar_glass: updatedSettings.navbar_glass,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(updatedSettings);
      
      toast({
        title: "Configurações salvas",
        description: "Suas preferências de navegação foram atualizadas.",
      });
    } catch (error) {
      console.error('Error updating navbar settings:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    updateSettings,
    loading,
  };
}