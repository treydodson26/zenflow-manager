-- Create customer_segment_snapshots table for tracking daily segment states
CREATE TABLE public.customer_segment_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id text NOT NULL UNIQUE,
  customer_id integer NOT NULL,
  customer_name text NOT NULL,
  segment_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.customer_segment_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to manage snapshots" 
ON public.customer_segment_snapshots 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create index for performance
CREATE INDEX idx_customer_segment_snapshots_snapshot_id ON public.customer_segment_snapshots(snapshot_id);
CREATE INDEX idx_customer_segment_snapshots_customer_id ON public.customer_segment_snapshots(customer_id);