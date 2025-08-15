-- Fix critical security issues by adding RLS policies to exposed tables

-- Secure customer_engagement_stats table
ALTER TABLE public.customer_engagement_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view customer engagement stats" 
ON public.customer_engagement_stats 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Secure customers_by_stage table  
ALTER TABLE public.customers_by_stage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view customers by stage" 
ON public.customers_by_stage 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Secure dashboard_metrics table
ALTER TABLE public.dashboard_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view dashboard metrics" 
ON public.dashboard_metrics 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Secure intro_offer_customers table  
ALTER TABLE public.intro_offer_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view intro offer customers" 
ON public.intro_offer_customers 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Secure user_rate_limits table
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits" 
ON public.user_rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits" 
ON public.user_rate_limits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits" 
ON public.user_rate_limits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Fix search_path for existing functions
CREATE OR REPLACE FUNCTION public.assign_customer_segment(customer_id_param integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  customer_record RECORD;
  total_spent DECIMAL(10,2) := 0;
  has_intro_offer BOOLEAN := false;
  has_classes BOOLEAN := false;
  segment_result TEXT;
BEGIN
  -- Get customer data
  SELECT * INTO customer_record FROM customers WHERE id = customer_id_param;
  
  IF NOT FOUND THEN
    RETURN 'customer_not_found';
  END IF;
  
  -- Calculate total spend (mock calculation - would integrate with payment system)
  total_spent := COALESCE(customer_record.total_lifetime_value, 0);
  
  -- Check if customer has intro offer
  has_intro_offer := customer_record.status = 'intro_trial';
  
  -- Check if customer has any bookings
  SELECT EXISTS(
    SELECT 1 FROM bookings WHERE customer_id = customer_id_param
  ) INTO has_classes;
  
  -- Determine segment with priority: intro_offer > drop_in > prospect
  IF has_intro_offer THEN
    segment_result := 'intro_offer';
  ELSIF has_classes AND total_spent > 0 THEN
    segment_result := 'drop_in';
  ELSE
    segment_result := 'prospect';
  END IF;
  
  -- Insert or update segment assignment
  INSERT INTO customer_segments (customer_id, segment_type, total_spend, last_visit_date)
  VALUES (customer_id_param, segment_result, total_spent, customer_record.last_seen::date)
  ON CONFLICT (customer_id, segment_type) 
  DO UPDATE SET 
    total_spend = EXCLUDED.total_spend,
    last_visit_date = EXCLUDED.last_visit_date,
    updated_at = now();
  
  RETURN segment_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_n8n_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  webhook_payload jsonb;
BEGIN
  -- Determine the event type and data
  IF TG_OP = 'DELETE' THEN
    webhook_payload := jsonb_build_object(
      'eventType', 'DELETE',
      'tableName', TG_TABLE_NAME,
      'data', row_to_json(OLD)
    );
  ELSE
    webhook_payload := jsonb_build_object(
      'eventType', TG_OP,
      'tableName', TG_TABLE_NAME,
      'data', row_to_json(NEW)
    );
  END IF;

  -- Call the edge function asynchronously
  PERFORM net.http_post(
    url := 'https://mvndgpmetndvjsmvhqqh.supabase.co/functions/v1/send-n8n-webhook',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bmRncG1ldG5kdmpzbXZocXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDk3NTUsImV4cCI6MjA2MTUyNTc1NX0.07clcHdUPZv-GWGGGVvLsk0PaSSYorbk2Md3_Qv4rw4"}'::jsonb,
    body := webhook_payload::jsonb
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;