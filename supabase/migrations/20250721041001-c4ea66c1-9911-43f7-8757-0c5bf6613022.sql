-- Terceira parte: Políticas finais, triggers e funções

-- 1. Políticas RLS para logs de ações
CREATE POLICY "sla_logs_select_admin"
  ON public.sla_action_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "sla_logs_select_setor_access"
  ON public.sla_action_logs FOR SELECT
  USING (
    sla_id IN (
      SELECT s.id 
      FROM public.sla_demandas s
      WHERE public.user_has_setor_access(s.setor_id)
    )
  );

CREATE POLICY "sla_logs_insert_authenticated"
  ON public.sla_action_logs FOR INSERT
  WITH CHECK (auth.uid() = autor_id);

-- 2. Políticas RLS para comentários internos
CREATE POLICY "comentarios_select_admin"
  ON public.sla_comentarios_internos FOR SELECT
  USING (public.is_admin());

CREATE POLICY "comentarios_select_setor"
  ON public.sla_comentarios_internos FOR SELECT
  USING (public.user_has_setor_access(setor_id));

CREATE POLICY "comentarios_insert_setor"
  ON public.sla_comentarios_internos FOR INSERT
  WITH CHECK (public.user_has_setor_access(setor_id));

-- 3. Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nome_completo, user_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nome_completo', new.email),
    COALESCE((new.raw_user_meta_data->>'user_type')::public.user_type, 'colaborador_setor')
  );
  RETURN new;
END;
$$;

-- 4. Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Triggers para updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_setores_updated_at ON public.setores;
CREATE TRIGGER update_setores_updated_at
  BEFORE UPDATE ON public.setores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sla_demandas_updated_at ON public.sla_demandas;
CREATE TRIGGER update_sla_demandas_updated_at
  BEFORE UPDATE ON public.sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Função para log de ações automático
CREATE OR REPLACE FUNCTION public.log_sla_action(
  p_sla_id UUID,
  p_acao TEXT,
  p_setor_origem_id UUID DEFAULT NULL,
  p_setor_destino_id UUID DEFAULT NULL,
  p_justificativa TEXT DEFAULT NULL,
  p_dados_anteriores JSONB DEFAULT NULL,
  p_dados_novos JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
  user_profile RECORD;
BEGIN
  -- Buscar dados do usuário
  SELECT email, nome_completo INTO user_profile
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Inserir log
  INSERT INTO public.sla_action_logs (
    sla_id, acao, autor_id, autor_email,
    setor_origem_id, setor_destino_id, justificativa,
    dados_anteriores, dados_novos
  ) VALUES (
    p_sla_id, p_acao, auth.uid(), user_profile.email,
    p_setor_origem_id, p_setor_destino_id, p_justificativa,
    p_dados_anteriores, p_dados_novos
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 8. Função para adicionar comentário interno
CREATE OR REPLACE FUNCTION public.add_sla_comment(
  p_sla_id UUID,
  p_setor_id UUID,
  p_comentario TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  comment_id UUID;
  user_profile RECORD;
BEGIN
  -- Verificar se usuário tem acesso ao setor
  IF NOT public.user_has_setor_access(p_setor_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado ao setor';
  END IF;
  
  -- Buscar dados do usuário
  SELECT nome_completo INTO user_profile
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Inserir comentário
  INSERT INTO public.sla_comentarios_internos (
    sla_id, setor_id, autor_id, autor_nome, comentario
  ) VALUES (
    p_sla_id, p_setor_id, auth.uid(), user_profile.nome_completo, p_comentario
  ) RETURNING id INTO comment_id;
  
  RETURN comment_id;
END;
$$;