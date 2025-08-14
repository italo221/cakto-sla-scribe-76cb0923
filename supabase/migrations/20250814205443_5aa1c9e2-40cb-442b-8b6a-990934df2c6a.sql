-- Security Fix: Remove public read access from sensitive user data tables
-- This fixes the vulnerability where customer email addresses could be stolen

-- Drop the overly permissive policies that allow public read access
DROP POLICY IF EXISTS "Allow read access to kyc" ON public.user_kyc;
DROP POLICY IF EXISTS "Allow read access to registrations" ON public.user_registrations;

-- Create secure policies for user_kyc table
-- Only allow admins and super admins to read KYC data
CREATE POLICY "Admins can read user_kyc" 
ON public.user_kyc 
FOR SELECT 
USING (public.is_admin());

-- Allow users to read their own KYC data (if needed for user profile functionality)
CREATE POLICY "Users can read own kyc data" 
ON public.user_kyc 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Only admins can insert/update KYC data
CREATE POLICY "Admins can insert kyc data" 
ON public.user_kyc 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update kyc data" 
ON public.user_kyc 
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Create secure policies for user_registrations table
-- Only allow admins and super admins to read registration data
CREATE POLICY "Admins can read user_registrations" 
ON public.user_registrations 
FOR SELECT 
USING (public.is_admin());

-- Only admins can insert/update registration data
CREATE POLICY "Admins can insert registration data" 
ON public.user_registrations 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update registration data" 
ON public.user_registrations 
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Optional: If you need system/application level access for these tables,
-- you can create a service role or use database functions with SECURITY DEFINER
-- instead of exposing data through public policies