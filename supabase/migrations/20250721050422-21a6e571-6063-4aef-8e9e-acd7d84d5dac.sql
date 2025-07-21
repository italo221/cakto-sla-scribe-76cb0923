-- Política temporária para permitir inserção em setores para usuários autenticados
-- (enquanto não há usuários admin configurados)
DROP POLICY IF EXISTS "setores_all_admin" ON public.setores;

CREATE POLICY "setores_insert_authenticated" ON public.setores
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "setores_update_authenticated" ON public.setores
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "setores_delete_admin" ON public.setores
  FOR DELETE USING (is_admin());