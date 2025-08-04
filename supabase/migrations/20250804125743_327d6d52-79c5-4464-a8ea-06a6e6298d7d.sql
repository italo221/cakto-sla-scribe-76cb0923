-- Corrigir trigger notify_ticket_status_change para evitar erros de UUID
CREATE OR REPLACE FUNCTION public.notify_ticket_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_profile RECORD;
  notification_title TEXT;
  notification_message TEXT;
  current_user_uuid UUID;
BEGIN
  -- Verificar se realmente houve mudança de status
  IF OLD.status != NEW.status THEN
    -- Obter UUID do usuário atual de forma segura
    current_user_uuid := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
    
    -- Buscar informações do usuário que fez a alteração
    SELECT nome_completo, email INTO user_profile
    FROM public.profiles
    WHERE user_id = current_user_uuid;
    
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
    
    -- Buscar usuários relacionados ao ticket para notificar (com verificação de UUID válido)
    -- Notificar o solicitante (se diferente de quem fez a alteração)
    INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
    SELECT DISTINCT p.user_id, NEW.id, 'ticket_update', notification_title, notification_message
    FROM public.profiles p
    WHERE (p.nome_completo = NEW.solicitante OR p.email = NEW.solicitante)
      AND p.user_id IS NOT NULL
      AND p.user_id != current_user_uuid
      AND p.ativo = true;
    
    -- Notificar usuários do setor responsável (se existir setor_id válido)
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