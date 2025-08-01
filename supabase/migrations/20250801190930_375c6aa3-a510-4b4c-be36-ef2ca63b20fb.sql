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

-- Verificar se a tabela tem REPLICA IDENTITY FULL para real-time
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Verificar se a tabela está na publicação realtime
DO $$
BEGIN
  -- Tentar adicionar a tabela à publicação realtime se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Se a publicação não existir, ignorar silenciosamente
  NULL;
END $$;