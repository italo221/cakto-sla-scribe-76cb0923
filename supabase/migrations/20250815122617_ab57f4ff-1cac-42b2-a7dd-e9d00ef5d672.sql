-- Allow operators to create tickets for any sector
-- Operators should be able to create tickets for any sector, not just their own
-- This is important for cross-sector collaboration and ticket routing

-- Update the INSERT policy to allow operators to create tickets for any sector
DROP POLICY IF EXISTS "sla_demandas_insert_authenticated_with_sector" ON public.sla_demandas;

CREATE POLICY "sla_demandas_insert_operators_any_sector" 
ON public.sla_demandas 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR 
    public.can_edit() OR  -- Operators can create tickets for any sector
    public.user_has_setor_access(setor_id)  -- Regular users can only create for their sectors
  )
);

-- For SELECT and UPDATE, keep sector-based restrictions
-- Users should only see/edit tickets from sectors they have access to
-- But allow viewing tickets they created even if transferred to other sectors
DROP POLICY IF EXISTS "sla_demandas_select_sector_access" ON public.sla_demandas;

CREATE POLICY "sla_demandas_select_access_or_creator" 
ON public.sla_demandas 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR 
    public.user_has_setor_access(setor_id) OR
    -- Allow users to see tickets they created, even if moved to other sectors
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
        AND (p.email = solicitante OR p.nome_completo = solicitante)
    )
  )
);

-- Keep UPDATE restricted to sector access and admins
DROP POLICY IF EXISTS "sla_demandas_update_authenticated_with_sector" ON public.sla_demandas;

CREATE POLICY "sla_demandas_update_sector_access_only" 
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