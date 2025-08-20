-- Add customer journey tracking for automated sequences
CREATE TABLE public.customer_journey_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  current_day INTEGER NOT NULL DEFAULT 0,
  sequence_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_message_sent_day INTEGER DEFAULT NULL,
  next_message_due_date DATE DEFAULT NULL,
  journey_status TEXT NOT NULL DEFAULT 'active',
  segment_type TEXT NOT NULL DEFAULT 'prospect',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, segment_type)
);

-- Enable RLS
ALTER TABLE public.customer_journey_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to manage journey progress" 
ON public.customer_journey_progress 
FOR ALL 
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);

-- Add message queue table for scheduled messages
CREATE TABLE public.message_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  sequence_id INTEGER NOT NULL,
  message_type TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  subject TEXT,
  content TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to manage message queue" 
ON public.message_queue 
FOR ALL 
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);

-- Create indexes for performance
CREATE INDEX idx_customer_journey_progress_customer_id ON public.customer_journey_progress(customer_id);
CREATE INDEX idx_customer_journey_progress_next_due ON public.customer_journey_progress(next_message_due_date) WHERE journey_status = 'active';
CREATE INDEX idx_message_queue_scheduled ON public.message_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_message_queue_status ON public.message_queue(status);

-- Create trigger for updated_at
CREATE TRIGGER update_customer_journey_progress_updated_at
BEFORE UPDATE ON public.customer_journey_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_queue_updated_at
BEFORE UPDATE ON public.message_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize customer journey
CREATE OR REPLACE FUNCTION public.initialize_customer_journey(
  customer_id_param INTEGER,
  segment_type_param TEXT DEFAULT 'prospect'
)
RETURNS UUID
LANGUAGE plpgsql
AS $function$
DECLARE
  journey_id UUID;
  next_sequence_day INTEGER;
  next_due_date DATE;
BEGIN
  -- Find the first active sequence day for this segment
  SELECT day INTO next_sequence_day
  FROM message_sequences 
  WHERE active = true 
  ORDER BY day ASC 
  LIMIT 1;
  
  -- Calculate next due date (start tomorrow for day 0 messages)
  next_due_date := CURRENT_DATE + (COALESCE(next_sequence_day, 0) + 1);
  
  -- Insert or update journey progress
  INSERT INTO customer_journey_progress (
    customer_id, 
    current_day, 
    sequence_start_date,
    next_message_due_date,
    segment_type
  )
  VALUES (
    customer_id_param, 
    0, 
    CURRENT_DATE,
    next_due_date,
    segment_type_param
  )
  ON CONFLICT (customer_id, segment_type) 
  DO UPDATE SET 
    current_day = 0,
    sequence_start_date = CURRENT_DATE,
    next_message_due_date = next_due_date,
    journey_status = 'active',
    updated_at = now()
  RETURNING id INTO journey_id;
  
  RETURN journey_id;
END;
$function$;