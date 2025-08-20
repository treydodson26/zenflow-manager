-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the sequence automation to run every hour
SELECT cron.schedule(
  'process-sequences-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://mvndgpmetndvjsmvhqqh.supabase.co/functions/v1/process-sequence-automation',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bmRncG1ldG5kdmpzbXZocXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDk3NTUsImV4cCI6MjA2MTUyNTc1NX0.07clcHdUPZv-GWGGGVvLsk0PaSSYorbk2Md3_Qv4rw4"}'::jsonb,
        body:='{"triggered_by": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Also schedule a more frequent check during business hours (every 15 minutes from 6 AM to 10 PM)
SELECT cron.schedule(
  'process-sequences-business-hours',
  '*/15 6-22 * * *', -- Every 15 minutes between 6 AM and 10 PM
  $$
  SELECT
    net.http_post(
        url:='https://mvndgpmetndvjsmvhqqh.supabase.co/functions/v1/process-sequence-automation',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bmRncG1ldG5kdmpzbXZocXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDk3NTUsImV4cCI6MjA2MTUyNTc1NX0.07clcHdUPZv-GWGGGVvLsk0PaSSYorbk2Md3_Qv4rw4"}'::jsonb,
        body:='{"triggered_by": "cron_business_hours"}'::jsonb
    ) as request_id;
  $$
);