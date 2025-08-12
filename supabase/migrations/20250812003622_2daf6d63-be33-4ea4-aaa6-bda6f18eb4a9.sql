-- Add navbar customization fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS navbar_position TEXT DEFAULT 'top' CHECK (navbar_position IN ('top', 'left')),
ADD COLUMN IF NOT EXISTS navbar_glass BOOLEAN DEFAULT false;