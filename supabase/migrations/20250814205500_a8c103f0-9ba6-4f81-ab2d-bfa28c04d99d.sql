-- Security Fix: Remove public read access from sensitive financial data
-- This fixes the vulnerability where customer financial data could be accessed by anyone

-- Drop the overly permissive policy that allows public read access
DROP POLICY IF EXISTS "Allow read access to profits" ON public.user_profits;

-- Create secure policies for user_profits table
-- Only allow admins and super admins to read all financial data
CREATE POLICY "Admins can read all user_profits" 
ON public.user_profits 
FOR SELECT 
USING (public.is_admin());

-- Allow users to read their own financial data (based on email matching their profile)
CREATE POLICY "Users can read own profit data" 
ON public.user_profits 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  email IN (
    SELECT p.email 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Only admins can insert/update financial data
CREATE POLICY "Admins can insert profit data" 
ON public.user_profits 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update profit data" 
ON public.user_profits 
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admins can delete financial data
CREATE POLICY "Admins can delete profit data" 
ON public.user_profits 
FOR DELETE 
USING (public.is_admin());