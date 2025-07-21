-- Segunda parte: Tabelas de logs, comentários e políticas RLS

-- 1. Tabela de logs de ações
CREATE TABLE IF NOT EXISTS public.sla_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sla_id UUID NOT NULL REFERENCES public.sla_demandas(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  autor_id UUID NOT NULL REFERENCES public.profiles(user_id),
  autor_email TEXT NOT NULL,
  setor_origem_id UUID REFERENCES public.setores(id),
  setor_destino_id UUID REFERENCES public.setores(id),
  justificativa TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela de comentários internos por setor
CREATE TABLE IF NOT EXISTS public.sla_comentarios_internos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sla_id UUID NOT NULL REFERENCES public.sla_demandas(id) ON DELETE CASCADE,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.profiles(user_id),
  autor_nome TEXT NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Habilitar RLS nas novas tabelas
ALTER TABLE public.sla_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_comentarios_internos ENABLE ROW LEVEL SECURITY;

-- 4. Função de segurança para verificar tipo de usuário
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid 
    AND user_type = 'administrador_master'
  );
$$;

-- 5. Função para verificar acesso a setor
CREATE OR REPLACE FUNCTION public.user_has_setor_access(setor_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_setores 
    WHERE user_id = user_uuid 
    AND setor_id = setor_uuid
  );
$$;

-- 6. Políticas RLS para profiles
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Administradores podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Administradores podem inserir perfis" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

-- 7. Políticas RLS para setores
DROP POLICY IF EXISTS "Usuários autenticados podem ver setores" ON public.setores;
DROP POLICY IF EXISTS "Apenas administradores podem gerenciar setores" ON public.setores;

CREATE POLICY "setores_select_authenticated"
  ON public.setores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "setores_all_admin"
  ON public.setores FOR ALL
  USING (public.is_admin());

-- 8. Políticas RLS para user_setores
DROP POLICY IF EXISTS "Usuários podem ver seus próprios setores" ON public.user_setores;
DROP POLICY IF EXISTS "Administradores podem ver todos os relacionamentos" ON public.user_setores;
DROP POLICY IF EXISTS "Administradores podem gerenciar relacionamentos" ON public.user_setores;

CREATE POLICY "user_setores_select_own"
  ON public.user_setores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_setores_select_admin"
  ON public.user_setores FOR SELECT
  USING (public.is_admin());

CREATE POLICY "user_setores_all_admin"
  ON public.user_setores FOR ALL
  USING (public.is_admin());

-- 9. Atualizar políticas RLS para sla_demandas
DROP POLICY IF EXISTS "Administradores podem ver todos os SLAs" ON public.sla_demandas;
DROP POLICY IF EXISTS "Colaboradores podem ver SLAs do seu setor" ON public.sla_demandas;
DROP POLICY IF EXISTS "Usuários autenticados podem criar SLAs" ON public.sla_demandas;
DROP POLICY IF EXISTS "Administradores podem atualizar todos os SLAs" ON public.sla_demandas;
DROP POLICY IF EXISTS "Colaboradores podem atualizar SLAs do seu setor" ON public.sla_demandas;

CREATE POLICY "sla_select_admin"
  ON public.sla_demandas FOR SELECT
  USING (public.is_admin());

CREATE POLICY "sla_select_setor"
  ON public.sla_demandas FOR SELECT
  USING (public.user_has_setor_access(setor_id));

CREATE POLICY "sla_insert_authenticated"
  ON public.sla_demandas FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sla_update_admin"
  ON public.sla_demandas FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "sla_update_setor"
  ON public.sla_demandas FOR UPDATE
  USING (public.user_has_setor_access(setor_id));