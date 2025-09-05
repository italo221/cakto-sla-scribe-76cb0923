-- Schedule daily cleanup of old records via edge function
select cron.schedule(
  'cleanup_old_records',
  '0 3 * * *',
  $$
  select net.http_post(
    url := 'http://localhost:54321/functions/v1/cleanup-old-records'
  );
  $$
);
