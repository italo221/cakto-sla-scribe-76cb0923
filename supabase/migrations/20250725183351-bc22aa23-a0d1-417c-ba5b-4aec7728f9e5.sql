-- Atualizar configurações do sistema para suportar cor secundária
UPDATE public.system_settings 
SET setting_value = '{"hsl": "142 86% 28%", "hex": "#16a34a", "name": "Verde Padrão"}'
WHERE setting_key = 'primary_color';

-- Adicionar configuração de cor secundária
INSERT INTO public.system_settings (setting_key, setting_value) VALUES 
('secondary_color', '{"hsl": "262 83% 58%", "hex": "#8b5cf6", "name": "Roxo Padrão"}')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Criar tabela para combinações de cores (pares primária + secundária)
CREATE TABLE public.color_combinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_color_hsl TEXT NOT NULL,
  primary_color_hex TEXT NOT NULL,
  secondary_color_hsl TEXT NOT NULL,
  secondary_color_hex TEXT NOT NULL,
  combination_name TEXT,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Habilitar RLS para combinações de cores
ALTER TABLE public.color_combinations ENABLE ROW LEVEL SECURITY;

-- Política para super admins
CREATE POLICY "Super admins can manage color combinations" 
ON public.color_combinations 
FOR ALL
USING (public.is_super_admin());

-- Inserir combinação padrão
INSERT INTO public.color_combinations (
  primary_color_hsl, primary_color_hex, 
  secondary_color_hsl, secondary_color_hex, 
  combination_name
) VALUES (
  '142 86% 28%', '#16a34a',
  '262 83% 58%', '#8b5cf6',
  'Verde & Roxo Padrão'
);