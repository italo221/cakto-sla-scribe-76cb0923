-- Criar triggers para notificações automáticas de mudança de status e setor
-- Isso garantirá que todas as mudanças sejam capturadas automaticamente

-- 1. Função para criar notificações de mudança de status
CREATE OR REPLACE FUNCTION notify_ticket_status_change()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Verificar se realmente houve mudança de status
  IF OLD.status != NEW.status THEN
    -- Buscar informações do usuário que fez a alteração
    SELECT nome_completo, email INTO user_profile
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    -- Definir título e mensagem baseado na mudança
    CASE 
      WHEN NEW.status = 'em_andamento' THEN
        notification_title := 'Ticket iniciado';
        notification_message := 'O ticket "' || NEW.titulo || '" foi iniciado';
      WHEN NEW.status = 'resolvido' THEN
        notification_title := 'Ticket resolvido';
        notification_message := 'O ticket "' || NEW.titulo || '" foi resolvido';
      WHEN NEW.status = 'fechado' THEN
        notification_title := 'Ticket fechado';
        notification_message := 'O ticket "' || NEW.titulo || '" foi fechado';
      ELSE
        notification_title := 'Status atualizado';
        notification_message := 'O status do ticket "' || NEW.titulo || '" foi alterado para ' || NEW.status;
    END CASE;
    
    -- Adicionar quem fez a alteração na mensagem
    IF user_profile.nome_completo IS NOT NULL THEN
      notification_message := notification_message || ' por ' || user_profile.nome_completo;
    END IF;
    
    -- Buscar usuários relacionados ao ticket para notificar
    -- Notificar o solicitante (se diferente de quem fez a alteração)
    INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
    SELECT DISTINCT p.user_id, NEW.id, 'ticket_update', notification_title, notification_message
    FROM public.profiles p
    WHERE (p.nome_completo = NEW.solicitante OR p.email = NEW.solicitante)
      AND p.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
      AND p.ativo = true;
    
    -- Notificar usuários do setor responsável (se existir setor_id)
    IF NEW.setor_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
      SELECT DISTINCT us.user_id, NEW.id, 'ticket_update', notification_title, notification_message
      FROM public.user_setores us
      JOIN public.profiles p ON us.user_id = p.user_id
      WHERE us.setor_id = NEW.setor_id
        AND us.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
        AND p.ativo = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para criar notificações de transferência de setor
CREATE OR REPLACE FUNCTION notify_ticket_setor_change()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  setor_origem RECORD;
  setor_destino RECORD;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Verificar se realmente houve mudança de setor
  IF COALESCE(OLD.setor_id, '') != COALESCE(NEW.setor_id, '') THEN
    -- Buscar informações do usuário que fez a alteração
    SELECT nome_completo, email INTO user_profile
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    -- Buscar nomes dos setores
    IF OLD.setor_id IS NOT NULL THEN
      SELECT nome INTO setor_origem FROM public.setores WHERE id = OLD.setor_id;
    END IF;
    
    IF NEW.setor_id IS NOT NULL THEN
      SELECT nome INTO setor_destino FROM public.setores WHERE id = NEW.setor_id;
    END IF;
    
    -- Definir título e mensagem
    notification_title := 'Ticket transferido';
    notification_message := 'O ticket "' || NEW.titulo || '" foi transferido';
    
    IF setor_origem.nome IS NOT NULL AND setor_destino.nome IS NOT NULL THEN
      notification_message := notification_message || ' de ' || setor_origem.nome || ' para ' || setor_destino.nome;
    ELSIF setor_destino.nome IS NOT NULL THEN
      notification_message := notification_message || ' para ' || setor_destino.nome;
    END IF;
    
    -- Adicionar quem fez a alteração
    IF user_profile.nome_completo IS NOT NULL THEN
      notification_message := notification_message || ' por ' || user_profile.nome_completo;
    END IF;
    
    -- Notificar usuários do setor de origem (se existir)
    IF OLD.setor_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
      SELECT DISTINCT us.user_id, NEW.id, 'ticket_update', notification_title, notification_message
      FROM public.user_setores us
      JOIN public.profiles p ON us.user_id = p.user_id
      WHERE us.setor_id = OLD.setor_id
        AND us.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
        AND p.ativo = true;
    END IF;
    
    -- Notificar usuários do setor de destino (se existir)
    IF NEW.setor_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
      SELECT DISTINCT us.user_id, NEW.id, 'ticket_update', notification_title, notification_message
      FROM public.user_setores us
      JOIN public.profiles p ON us.user_id = p.user_id
      WHERE us.setor_id = NEW.setor_id
        AND us.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
        AND p.ativo = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar triggers
DROP TRIGGER IF EXISTS trigger_notify_ticket_status_change ON public.sla_demandas;
CREATE TRIGGER trigger_notify_ticket_status_change
  AFTER UPDATE ON public.sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_status_change();

DROP TRIGGER IF EXISTS trigger_notify_ticket_setor_change ON public.sla_demandas;
CREATE TRIGGER trigger_notify_ticket_setor_change
  AFTER UPDATE ON public.sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_setor_change();