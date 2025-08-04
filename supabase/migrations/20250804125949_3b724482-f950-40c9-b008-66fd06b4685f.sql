-- Corrigir trigger notify_ticket_setor_change para evitar erros de UUID
CREATE OR REPLACE FUNCTION public.notify_ticket_setor_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_profile RECORD;
  setor_origem RECORD;
  setor_destino RECORD;
  notification_title TEXT;
  notification_message TEXT;
  current_user_uuid UUID;
BEGIN
  -- Verificar se realmente houve mudança de setor
  IF COALESCE(OLD.setor_id, '00000000-0000-0000-0000-000000000000'::uuid) != COALESCE(NEW.setor_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    -- Obter UUID do usuário atual de forma segura
    current_user_uuid := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
    
    -- Buscar informações do usuário que fez a alteração
    SELECT nome_completo, email INTO user_profile
    FROM public.profiles
    WHERE user_id = current_user_uuid;
    
    -- Buscar nomes dos setores
    IF OLD.setor_id IS NOT NULL AND OLD.setor_id != '00000000-0000-0000-0000-000000000000'::uuid THEN
      SELECT nome INTO setor_origem FROM public.setores WHERE id = OLD.setor_id;
    END IF;
    
    IF NEW.setor_id IS NOT NULL AND NEW.setor_id != '00000000-0000-0000-0000-000000000000'::uuid THEN
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
    
    -- Notificar usuários do setor de origem (se existir e for válido)
    IF OLD.setor_id IS NOT NULL AND OLD.setor_id != '00000000-0000-0000-0000-000000000000'::uuid THEN
      INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
      SELECT DISTINCT us.user_id, NEW.id, 'ticket_update', notification_title, notification_message
      FROM public.user_setores us
      JOIN public.profiles p ON us.user_id = p.user_id
      WHERE us.setor_id = OLD.setor_id
        AND us.user_id IS NOT NULL
        AND us.user_id != current_user_uuid
        AND p.ativo = true;
    END IF;
    
    -- Notificar usuários do setor de destino (se existir e for válido)
    IF NEW.setor_id IS NOT NULL AND NEW.setor_id != '00000000-0000-0000-0000-000000000000'::uuid THEN
      INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
      SELECT DISTINCT us.user_id, NEW.id, 'ticket_update', notification_title, notification_message
      FROM public.user_setores us
      JOIN public.profiles p ON us.user_id = p.user_id
      WHERE us.setor_id = NEW.setor_id
        AND us.user_id IS NOT NULL
        AND us.user_id != current_user_uuid
        AND p.ativo = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;