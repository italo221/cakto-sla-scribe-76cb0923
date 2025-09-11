-- Atualizar função notify_comment_mentions para incluir número do ticket
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
  user_id_text text;
  uuid_array text[];
  i integer;
BEGIN
  -- Buscar informações do autor
  SELECT nome_completo, email INTO autor_profile
  FROM public.profiles
  WHERE user_id = NEW.autor_id;
  
  -- Buscar informações do ticket incluindo número
  SELECT titulo, ticket_number INTO ticket_info
  FROM public.sla_demandas
  WHERE id = NEW.sla_id;
  
  -- Extrair menções do comentário
  IF NEW.comentario ~ 'data-user-id="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"' THEN
    -- Extrair todos os UUIDs em um array
    SELECT ARRAY(
      SELECT regexp_matches(NEW.comentario, 'data-user-id="([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"', 'g')
    ) INTO uuid_array;
    
    -- Processar cada UUID encontrado
    FOR i IN 1..array_length(uuid_array, 1) LOOP
      user_id_text := uuid_array[i][1];
      
      -- Converter texto para UUID com validação
      BEGIN
        mentioned_user_id := user_id_text::uuid;
      EXCEPTION
        WHEN OTHERS THEN
          CONTINUE; -- Pular se não for UUID válido
      END;
      
      -- Verificar se o usuário mencionado existe e não é o próprio autor
      IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.autor_id THEN
        -- Buscar nome do usuário mencionado
        SELECT nome_completo INTO mentioned_user_name
        FROM public.profiles
        WHERE user_id = mentioned_user_id
        AND ativo = true;
        
        -- Se encontrou o usuário, criar notificação incluindo número do ticket
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
            'Você foi mencionado em um comentário no ticket ' || 
            COALESCE(ticket_info.ticket_number, 'N/A') || ': ' || 
            COALESCE(ticket_info.titulo, 'Ticket')
          );
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;