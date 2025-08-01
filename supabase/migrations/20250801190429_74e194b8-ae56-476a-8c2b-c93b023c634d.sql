-- Corrigir política RLS para permitir inserção de notificações pelo sistema
-- Atualmente a política permite apenas inserção pelo próprio usuário, mas as notificações
-- são criadas pelo sistema para outros usuários

-- Remover política restritiva atual
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Criar nova política mais permissiva para inserção de notificações
CREATE POLICY "Allow system to create notifications for any user"
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Manter política de visualização restrita ao próprio usuário
-- Política de UPDATE também já está correta

-- Verificar se a tabela tem REPLICA IDENTITY FULL para real-time
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação realtime se ainda não estiver
SELECT cron.schedule('check_realtime_publication', '*/5 * * * *', 'SELECT 1');
DO $$
BEGIN
  -- Tentar adicionar a tabela à publicação realtime
  -- Se já existir, o comando falhará silenciosamente
  PERFORM * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';
  IF NOT FOUND THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Se a publicação não existir, criar uma nova entrada
  INSERT INTO supabase_realtime.subscription (id, subscription_id, entity, filters, claims, created_at)
  VALUES (gen_random_uuid(), gen_random_uuid(), 'notifications', '[]'::jsonb, '{}'::jsonb, now())
  ON CONFLICT DO NOTHING;
END $$;