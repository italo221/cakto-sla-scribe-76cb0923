-- Add navigation settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN navbar_position text DEFAULT 'top',
ADD COLUMN navbar_glass boolean DEFAULT false;