-- 🚨 EMERGENCY DATABASE-LEVEL REALTIME SHUTDOWN (REVISED)
--
-- Realtime is consuming 60.9% of all database time:
-- - realtime.list_changes: 118,765 calls (48.5% of total time)
-- - realtime.subscription: 112,119 calls (12.4% of total time)

-- 1. Clear all existing realtime subscriptions
DELETE FROM realtime.subscription;

-- 2. Drop and recreate supabase_realtime publication without any tables
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- 3. Create a function to block new realtime subscriptions
CREATE OR REPLACE FUNCTION realtime.block_realtime_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the blocked attempt for monitoring
  RAISE WARNING 'Realtime subscription blocked for performance optimization - subscription_id: %', NEW.subscription_id;
  
  -- Prevent the subscription from being created
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add trigger to block any new realtime subscriptions
DROP TRIGGER IF EXISTS block_subscription_insert ON realtime.subscription;
CREATE TRIGGER block_subscription_insert
  BEFORE INSERT ON realtime.subscription
  FOR EACH ROW
  EXECUTE FUNCTION realtime.block_realtime_subscriptions();

-- 5. Create an index to speed up subscription cleanup if needed
CREATE INDEX IF NOT EXISTS idx_realtime_subscription_cleanup 
ON realtime.subscription (subscription_id, created_at);

-- 6. Add monitoring comments
COMMENT ON PUBLICATION supabase_realtime IS 'Emergency: Empty publication to prevent realtime overhead (was 60.9% of all DB time)';
COMMENT ON FUNCTION realtime.block_realtime_subscriptions() IS 'Emergency: Blocks realtime subscriptions that were causing 118k+ calls/hour';

-- 7. Log the successful shutdown
DO $$
BEGIN
  RAISE NOTICE 'Realtime emergency shutdown completed. Monitoring for remaining overhead...';
END $$;