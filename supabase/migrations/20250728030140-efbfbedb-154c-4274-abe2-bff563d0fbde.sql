-- Bloquear Operadores de se auto-promoverem a Super Admin
-- Esta função substitui a edição direta e garante que apenas Super Admins podem alterar roles

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
      COALESCE((SELECT email FROM profiles WHERE user_id = auth.uid()), 'Sistema'),
      'security_validation'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Aplicar o trigger na tabela profiles
DROP TRIGGER IF EXISTS validate_role_changes ON public.profiles;
CREATE TRIGGER validate_role_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_role_change();