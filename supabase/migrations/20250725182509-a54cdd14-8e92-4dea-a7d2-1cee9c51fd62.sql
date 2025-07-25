-- Criar tabela para configurações de personalização do sistema
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Política para super admins lerem todas as configurações
CREATE POLICY "Super admins can view all settings" 
ON public.system_settings 
FOR SELECT 
USING (public.is_super_admin());

-- Política para super admins modificarem configurações
CREATE POLICY "Super admins can insert settings" 
ON public.system_settings 
FOR INSERT 
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update settings" 
ON public.system_settings 
FOR UPDATE 
USING (public.is_super_admin());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configurações padrão de cores
INSERT INTO public.system_settings (setting_key, setting_value) VALUES 
('primary_color', '{"hsl": "142 86% 28%", "hex": "#16a34a", "name": "Verde Padrão"}'),
('color_history', '{"colors": []}');

-- Criar tabela para histórico de cores usadas
CREATE TABLE public.color_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  color_hsl TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  color_name TEXT,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Habilitar RLS para histórico de cores
ALTER TABLE public.color_history ENABLE ROW LEVEL SECURITY;

-- Política para super admins
CREATE POLICY "Super admins can manage color history" 
ON public.color_history 
FOR ALL
USING (public.is_super_admin());