-- Corrigir a função notify_comment_mentions - usar string_to_array corretamente
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
  all_matches text;
BEGIN
  -- Buscar informações do autor
  SELECT nome_completo, email INTO autor_profile
  FROM public.profiles
  WHERE user_id = NEW.autor_id;
  
  -- Buscar informações do ticket
  SELECT titulo INTO ticket_info
  FROM public.sla_demandas
  WHERE id = NEW.sla_id;
  
  -- Extrair menções do comentário usando uma abordagem mais simples
  IF NEW.comentario ~ 'data-user-id="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"' THEN
    -- Extrair todos os UUIDs de uma vez e iterar sobre eles
    all_matches := regexp_replace(NEW.comentario, '.*?data-user-id="([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})".*?', E'\\1\n', 'g');
    
    -- Processar cada UUID encontrado
    FOR user_id_text IN 
      SELECT unnest(string_to_array(trim(both E'\n' from all_matches), E'\n'))
      WHERE unnest(string_to_array(trim(both E'\n' from all_matches), E'\n')) != ''
    LOOP
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