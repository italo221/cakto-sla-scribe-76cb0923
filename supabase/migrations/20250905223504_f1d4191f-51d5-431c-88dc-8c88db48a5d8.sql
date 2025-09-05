-- 🚨 EMERGENCY DATABASE-LEVEL REALTIME SHUTDOWN (Fixed)
--
-- Realtime is consuming 60.9% of all database time despite app-level fixes:
-- - realtime.list_changes: 118,765 calls (48.5% of total time)  
-- - realtime.subscription: 112,119 calls (12.4% of total time)

-- 1. Drop the supabase_realtime publication to prevent any new subscriptions
DROP PUBLICATION IF EXISTS supabase_realtime;

-- 2. Create a minimal publication without any tables to maintain compatibility
CREATE PUBLICATION supabase_realtime;

-- 3. Clear all existing realtime subscriptions (this table exists)
DELETE FROM realtime.subscription;

-- 4. Create a function to block realtime operations  
CREATE OR REPLACE FUNCTION realtime.block_realtime_operations()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the blocked attempt
  RAISE WARNING 'Realtime operation blocked for performance - consuming 60.9%% of database time!';
  
  -- Prevent the operation
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add trigger to block any new realtime subscriptions
DROP TRIGGER IF EXISTS block_subscription_insert ON realtime.subscription;
CREATE TRIGGER block_subscription_insert
  BEFORE INSERT ON realtime.subscription
  FOR EACH ROW
  EXECUTE FUNCTION realtime.block_realtime_operations();

-- 6. Block any attempts to update subscriptions too
DROP TRIGGER IF EXISTS block_subscription_update ON realtime.subscription;
CREATE TRIGGER block_subscription_update
  BEFORE UPDATE ON realtime.subscription
  FOR EACH ROW
  EXECUTE FUNCTION realtime.block_realtime_operations();

-- 7. Set all existing tables to NOT use realtime
ALTER TABLE IF EXISTS public.sla_demandas REPLICA IDENTITY DEFAULT;
ALTER TABLE IF EXISTS public.sla_comentarios_internos REPLICA IDENTITY DEFAULT;
ALTER TABLE IF EXISTS public.notifications REPLICA IDENTITY DEFAULT;
ALTER TABLE IF EXISTS public.system_settings REPLICA IDENTITY DEFAULT;

-- 8. Comment explaining the nuclear option
COMMENT ON PUBLICATION supabase_realtime IS 'EMERGENCY: Publication emptied to stop 118k+ realtime calls consuming 60.9% of database time';
COMMENT ON FUNCTION realtime.block_realtime_operations() IS 'EMERGENCY: Blocks all realtime operations that were consuming 10GB+ daily bandwidth';