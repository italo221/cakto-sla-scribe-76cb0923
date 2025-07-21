-- Remover todas as políticas RLS e deixar acesso público para todos

-- Desabilitar RLS em todas as tabelas principais
ALTER TABLE public.sla_demandas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_comentarios_internos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_action_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_setores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Atualizar função is_admin para sempre retornar true
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT true; -- Sempre retorna true, todos são admin agora
$function$;

-- Atualizar função user_has_setor_access para sempre retornar true
CREATE OR REPLACE FUNCTION public.user_has_setor_access(setor_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT true; -- Sempre retorna true, todos têm acesso a todos os setores
$function$;