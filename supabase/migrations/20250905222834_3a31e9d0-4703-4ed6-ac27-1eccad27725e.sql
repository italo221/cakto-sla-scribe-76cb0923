-- Fix remaining multiple permissive policies

-- Fix lib_link_profiles - consolidate SELECT policies
DROP POLICY IF EXISTS "lib_link_profiles_read_all" ON public.lib_link_profiles;
DROP POLICY IF EXISTS "lib_link_profiles_manage_own" ON public.lib_link_profiles;

-- Create single SELECT policy that handles both read access and ownership check
CREATE POLICY "lib_link_profiles_select_consolidated"
    ON public.lib_link_profiles
    FOR SELECT
    TO authenticated
    USING (true); -- Anyone can read profiles (public access)

-- Create separate policies for INSERT, UPDATE, DELETE that require ownership
CREATE POLICY "lib_link_profiles_insert_own"
    ON public.lib_link_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "lib_link_profiles_update_own"
    ON public.lib_link_profiles
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "lib_link_profiles_delete_own"
    ON public.lib_link_profiles
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Fix lib_user_links - consolidate SELECT policies
DROP POLICY IF EXISTS "lib_user_links_select_consolidated" ON public.lib_user_links;
DROP POLICY IF EXISTS "lib_user_links_manage_own" ON public.lib_user_links;

-- Create single SELECT policy that handles both public read and ownership
CREATE POLICY "lib_user_links_select_consolidated"
    ON public.lib_user_links
    FOR SELECT
    TO authenticated
    USING (
        -- Public can read active links OR users can manage their own links/demo
        (is_active = true) OR 
        (profile_id IN ( 
            SELECT lib_link_profiles.id
            FROM lib_link_profiles
            WHERE ((lib_link_profiles.user_id = (SELECT auth.uid())) OR (lib_link_profiles.username = 'demo'::text))
        ))
    );

-- Create separate policies for INSERT, UPDATE, DELETE that require ownership
CREATE POLICY "lib_user_links_insert_own"
    ON public.lib_user_links
    FOR INSERT
    TO authenticated
    WITH CHECK (profile_id IN ( 
        SELECT lib_link_profiles.id
        FROM lib_link_profiles
        WHERE ((lib_link_profiles.user_id = (SELECT auth.uid())) OR (lib_link_profiles.username = 'demo'::text))
    ));

CREATE POLICY "lib_user_links_update_own"
    ON public.lib_user_links
    FOR UPDATE
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

CREATE POLICY "lib_user_links_delete_own"
    ON public.lib_user_links
    FOR DELETE
    TO authenticated
    USING (profile_id IN ( 
        SELECT lib_link_profiles.id
        FROM lib_link_profiles
        WHERE ((lib_link_profiles.user_id = (SELECT auth.uid())) OR (lib_link_profiles.username = 'demo'::text))
    ));