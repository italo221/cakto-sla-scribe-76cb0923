-- Corrigir o search_path da função para segurança
CREATE OR REPLACE FUNCTION public.validate_profile_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se está tentando alterar o role
  IF OLD.role != NEW.role THEN
    -- Apenas Super Admins podem alterar roles (incluindo o próprio)
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Apenas Super Administradores podem alterar roles de usuários';
    END IF;
    
    -- Log da alteração sensível
    INSERT INTO public.sla_logs (
      tipo_acao,
      dados_criados,
      usuario_responsavel,
      origem
    ) VALUES (
      'alteracao_role_usuario',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role_anterior', OLD.role,
        'role_novo', NEW.role,
        'alterado_por', auth.uid()
      ),
      COALESCE((SELECT email FROM public.profiles WHERE user_id = auth.uid()), 'Sistema'),
      'security_validation'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';