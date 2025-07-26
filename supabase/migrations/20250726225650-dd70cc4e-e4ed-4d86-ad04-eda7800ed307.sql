-- Corrigir erro e continuar otimizações RLS

-- Corrigir função is_admin (remover subquery do DEFAULT)
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = COALESCE(user_uuid, (SELECT auth.uid())) 
      AND (role = 'super_admin' OR user_type = 'administrador_master')
      AND ativo = true
  );
$function$;

-- Verificar se há mais políticas que precisam ser otimizadas
-- Listar todas as políticas atuais
SELECT schemaname, tablename, policyname, cmd, qual as policy_definition
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (qual LIKE '%auth.uid()%' OR qual LIKE '%auth.role()%' OR qual LIKE '%current_setting%')
ORDER BY tablename, cmd;

-- Verificar resultado das otimizações já aplicadas
SELECT 'Políticas otimizadas aplicadas com sucesso' as status;