-- Verificar triggers existentes para evitar duplicidade
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname LIKE '%notify%' OR tgname LIKE '%mention%';

-- Criar trigger específica para menções em comentários
-- Esta trigger detecta menções no comentário e cria notificações
CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  mention_data jsonb;
  mentioned_user_id uuid;
  mentioned_user_name text;
  autor_profile RECORD;
  ticket_info RECORD;
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
  -- Procurar por padrões como data-user-id="uuid"
  IF NEW.comentario ~ 'data-user-id="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"' THEN
    -- Usar regex para extrair todos os user_ids mencionados
    FOR mention_data IN 
      SELECT unnest(regexp_matches(NEW.comentario, 'data-user-id="([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"', 'g')) as user_id
    LOOP
      mentioned_user_id := mention_data->>'user_id'::uuid;
      
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

-- Criar trigger apenas se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_notify_comment_mentions'
  ) THEN
    CREATE TRIGGER trigger_notify_comment_mentions
      AFTER INSERT OR UPDATE ON public.sla_comentarios_internos
      FOR EACH ROW
      EXECUTE FUNCTION notify_comment_mentions();
  END IF;
END $$;