-- Fix Auth RLS Performance Issues and Duplicate Policies

-- 1. Fix user_kyc policy to use (SELECT auth.uid()) for better performance
DROP POLICY IF EXISTS "user_kyc_select_policy" ON public.user_kyc;
CREATE POLICY "user_kyc_select_policy"
    ON public.user_kyc
    FOR SELECT
    TO authenticated
    USING (
        -- Admins can read all KYC data
        is_admin() 
        OR 
        -- Users can read their own KYC data (matched by email) - optimized auth call
        email IN (
            SELECT p.email 
            FROM profiles p 
            WHERE p.user_id = (SELECT auth.uid())
        )
    );

-- 2. Fix lib_color_history policy
DROP POLICY IF EXISTS "Authenticated users can manage lib_color_history" ON public.lib_color_history;
CREATE POLICY "Authenticated users can manage lib_color_history"
    ON public.lib_color_history
    FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) IS NOT NULL)
    WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- 3. Fix lib_color_combinations policy  
DROP POLICY IF EXISTS "Authenticated users can manage lib_color_combinations" ON public.lib_color_combinations;
CREATE POLICY "Authenticated users can manage lib_color_combinations"
    ON public.lib_color_combinations
    FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) IS NOT NULL)
    WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- 4. Fix organized_tags policy
DROP POLICY IF EXISTS "Users can view their team tags and global tags" ON public.organized_tags;
CREATE POLICY "Users can view their team tags and global tags"
    ON public.organized_tags
    FOR SELECT
    TO authenticated
    USING ((is_global = true) OR (team_id IS NULL) OR (team_id IN ( 
        SELECT us.setor_id
        FROM user_setores us
        WHERE us.user_id = (SELECT auth.uid())
    )) OR is_admin());

-- 5. Fix ticket_external_links policy
DROP POLICY IF EXISTS "Users can view links for tickets they can access" ON public.ticket_external_links;
CREATE POLICY "Users can view links for tickets they can access"
    ON public.ticket_external_links
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) IS NOT NULL);

-- 6. Fix ticket_external_link_views policy
DROP POLICY IF EXISTS "Users can view logs for their links" ON public.ticket_external_link_views;
CREATE POLICY "Users can view logs for their links"
    ON public.ticket_external_link_views
    FOR SELECT
    TO authenticated
    USING (EXISTS ( 
        SELECT 1
        FROM ticket_external_links tel
        WHERE tel.id = ticket_external_link_views.link_id 
        AND ((tel.created_by = (SELECT auth.uid())) OR is_admin())
    ));

-- 7. Fix lib_user_links - consolidate multiple permissive SELECT policies
DROP POLICY IF EXISTS "Public can read active lib_user_links" ON public.lib_user_links;
DROP POLICY IF EXISTS "Users can manage their own links or demo profile" ON public.lib_user_links;
CREATE POLICY "lib_user_links_select_consolidated"
    ON public.lib_user_links
    FOR SELECT
    TO authenticated
    USING (
        -- Public can read active links OR users can manage their own links
        (is_active = true) OR 
        (profile_id IN ( 
            SELECT lib_link_profiles.id
            FROM lib_link_profiles
            WHERE ((lib_link_profiles.user_id = (SELECT auth.uid())) OR (lib_link_profiles.username = 'demo'::text))
        ))
    );
CREATE POLICY "lib_user_links_manage_own"
    ON public.lib_user_links
    FOR ALL
    TO authenticated
    USING (profile_id IN ( 
        SELECT lib_link_profiles.id
        FROM lib_link_profiles
        WHERE ((lib_link_profiles.user_id = (SELECT auth.uid())) OR (lib_link_profiles.username = 'demo'::text))
    ))
    WITH CHECK (profile_id IN ( 
        SELECT lib_link_profiles.id
        FROM lib_link_profiles
        WHERE ((lib_link_profiles.user_id = (SELECT auth.uid())) OR (lib_link_profiles.username = 'demo'::text))
    ));

-- 8. Fix lib_link_profiles - consolidate multiple permissive SELECT policies
DROP POLICY IF EXISTS "Public can read lib_link_profiles" ON public.lib_link_profiles;
DROP POLICY IF EXISTS "Authenticated users can manage their own lib_link_profiles" ON public.lib_link_profiles;
CREATE POLICY "lib_link_profiles_read_all"
    ON public.lib_link_profiles
    FOR SELECT
    TO authenticated
    USING (true); -- Anyone can read profiles
CREATE POLICY "lib_link_profiles_manage_own"
    ON public.lib_link_profiles
    FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- 9. Fix user_profits - consolidate multiple permissive SELECT policies
DROP POLICY IF EXISTS "Admins can read all user_profits" ON public.user_profits;
DROP POLICY IF EXISTS "Users can read own profit data" ON public.user_profits;
CREATE POLICY "user_profits_select_consolidated"
    ON public.user_profits
    FOR SELECT
    TO authenticated
    USING (
        -- Admins can read all profit data OR users can read their own
        is_admin() OR 
        (((SELECT auth.uid()) IS NOT NULL) AND (email IN ( 
            SELECT p.email
            FROM profiles p
            WHERE p.user_id = (SELECT auth.uid())
        )))
    );