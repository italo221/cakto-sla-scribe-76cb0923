-- Consolidate user_kyc RLS policies to eliminate duplicate permissive SELECT policies

-- 1. Drop the existing policies
DROP POLICY IF EXISTS "Admins can read user_kyc" ON public.user_kyc;
DROP POLICY IF EXISTS "Users can read own kyc data" ON public.user_kyc;

-- 2. Create a single comprehensive SELECT policy that handles both admin and user access
CREATE POLICY "user_kyc_select_policy"
    ON public.user_kyc
    FOR SELECT
    TO authenticated
    USING (
        -- Admins can read all KYC data
        is_admin() 
        OR 
        -- Users can read their own KYC data (matched by email)
        email IN (
            SELECT p.email 
            FROM profiles p 
            WHERE p.user_id = auth.uid()
        )
    );

-- 3. Ensure email column has an index for performance
CREATE INDEX IF NOT EXISTS idx_user_kyc_email ON public.user_kyc (email);

-- 4. Add comment explaining the consolidated policy
COMMENT ON POLICY "user_kyc_select_policy" ON public.user_kyc 
IS 'Consolidated policy: Admins can read all KYC data, users can read their own KYC data matched by email';