import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface NavbarSettings {
  position: 'top' | 'left';
  glassEffect: boolean;
}

export const useNavbarSettings = () => {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<NavbarSettings>({
    position: 'top',
    glassEffect: false
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    try {
      // Fetch navbar settings from database since they might not be in the profile type yet
      const { data, error } = await supabase
        .from('profiles')
        .select('navbar_position, navbar_glass')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Erro ao carregar configurações da navbar:', error);
        setSettings({ position: 'top', glassEffect: false });
      } else {
        setSettings({
          position: (data?.navbar_position as 'top' | 'left') || 'top',
          glassEffect: data?.navbar_glass || false
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações da navbar:', error);
      setSettings({ position: 'top', glassEffect: false });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<NavbarSettings>) => {
    if (!user) return false;

    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('profiles')
        .update({
          navbar_position: updatedSettings.position,
          navbar_glass: updatedSettings.glassEffect,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações da navbar:', error);
      return false;
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user, profile]);

  return {
    settings,
    loading,
    updateSettings,
    refreshSettings: loadSettings
  };
};