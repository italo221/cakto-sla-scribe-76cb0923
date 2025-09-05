-- 🚨 EMERGENCY DATABASE-LEVEL REALTIME SHUTDOWN
--
-- Realtime is consuming 60.9% of all database time despite app-level fixes:
-- - realtime.list_changes: 118,765 calls (48.5% of total time)
-- - realtime.subscription: 112,119 calls (12.4% of total time)
--
-- This requires database-level intervention to completely block realtime

-- 1. Drop the supabase_realtime publication to prevent any new subscriptions
DROP PUBLICATION IF EXISTS supabase_realtime;

-- 2. Create a minimal publication without any tables to maintain compatibility
CREATE PUBLICATION supabase_realtime;

-- 3. Clear all existing realtime subscriptions
DELETE FROM realtime.subscription;

-- 4. Clear all existing realtime tenants/connections  
DELETE FROM realtime.tenants;

-- 5. Create a function to block realtime operations
CREATE OR REPLACE FUNCTION realtime.block_realtime_operations()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the blocked attempt
  RAISE WARNING 'Realtime operation blocked for performance - this should not happen!';
  
  -- Prevent the operation
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add triggers to block any new realtime subscriptions
DROP TRIGGER IF EXISTS block_subscription_insert ON realtime.subscription;
CREATE TRIGGER block_subscription_insert
  BEFORE INSERT ON realtime.subscription
  FOR EACH ROW
  EXECUTE FUNCTION realtime.block_realtime_operations();

-- 7. Add triggers to block any new realtime tenants
DROP TRIGGER IF EXISTS block_tenant_insert ON realtime.tenants;
CREATE TRIGGER block_tenant_insert
  BEFORE INSERT ON realtime.tenants
  FOR EACH ROW
  EXECUTE FUNCTION realtime.block_realtime_operations();

-- 8. Comment explaining the nuclear option
COMMENT ON PUBLICATION supabase_realtime IS 'Emergency: Publication cleared to stop 60.9% database overhead from realtime operations';
COMMENT ON FUNCTION realtime.block_realtime_operations() IS 'Emergency blocker: Prevents any realtime operations that were consuming 10GB+ daily bandwidth';