-- Corrigir a função notify_comment_mentions
CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  mentioned_user_id uuid;
  mentioned_user_name text;
  autor_profile RECORD;
  ticket_info RECORD;
  user_id_matches text[];
  user_id_text text;
BEGIN
  -- Buscar informações do autor
  SELECT nome_completo, email INTO autor_profile
  FROM public.profiles
  WHERE user_id = NEW.autor_id;
  
  -- Buscar informações do ticket
  SELECT titulo INTO ticket_info
  FROM public.sla_demandas
  WHERE id = NEW.sla_id;
  
  -- Extrair menções do comentário (buscar spans com data-user-id)
  IF NEW.comentario ~ 'data-user-id="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"' THEN
    -- Usar regex para extrair todos os user_ids mencionados
    user_id_matches := regexp_matches(NEW.comentario, 'data-user-id="([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"', 'g');
    
    -- Processar cada user_id encontrado
    FOREACH user_id_text IN ARRAY user_id_matches
    LOOP
      -- Converter texto para UUID
      BEGIN
        mentioned_user_id := user_id_text::uuid;
      EXCEPTION
        WHEN invalid_text_representation THEN
          CONTINUE; -- Pular se não for UUID válido
      END;
      
      -- Verificar se o usuário mencionado existe e não é o próprio autor
      IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.autor_id THEN
        -- Buscar nome do usuário mencionado
        SELECT nome_completo INTO mentioned_user_name
        FROM public.profiles
        WHERE user_id = mentioned_user_id
        AND ativo = true;
        
        -- Se encontrou o usuário, criar notificação
        IF mentioned_user_name IS NOT NULL THEN
          INSERT INTO public.notifications (
            user_id,
            ticket_id,
            comment_id,
            type,
            title,
            message
          ) VALUES (
            mentioned_user_id,
            NEW.sla_id,
            NEW.id,
            'mention',
            COALESCE(autor_profile.nome_completo, 'Usuário') || ' mencionou você',
            'Você foi mencionado em um comentário no ticket: ' || COALESCE(ticket_info.titulo, 'Ticket')
          );
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;