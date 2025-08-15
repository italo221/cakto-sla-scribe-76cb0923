-- Fix ticket creation permissions: Allow users with sector access to create tickets
-- The current policy is too restrictive, requiring can_edit() which only allows super_admin or operador roles
-- We need to allow any authenticated user with sector access to create tickets

-- Update the INSERT policy for sla_demandas to allow sector members to create tickets
DROP POLICY IF EXISTS "sla_demandas_insert_sector_access" ON public.sla_demandas;

CREATE POLICY "sla_demandas_insert_authenticated_with_sector" 
ON public.sla_demandas 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR 
    public.user_has_setor_access(setor_id)
  )
);

-- Update the UPDATE policy to allow sector members to update their sector's tickets
DROP POLICY IF EXISTS "sla_demandas_update_sector_access" ON public.sla_demandas;

CREATE POLICY "sla_demandas_update_authenticated_with_sector" 
ON public.sla_demandas 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR 
    public.user_has_setor_access(setor_id)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR 
    public.user_has_setor_access(setor_id)
  )
);