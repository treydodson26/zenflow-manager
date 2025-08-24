-- Create table for storing Twilio sequence configurations
CREATE TABLE IF NOT EXISTS public.twilio_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  twilio_service_sid TEXT NOT NULL,
  template_sids JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.twilio_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on twilio_sequences"
ON public.twilio_sequences
FOR ALL
USING (true)
WITH CHECK (true);

-- Add twilio_message_sid and twilio_content_sid columns to communications_log if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications_log' AND column_name = 'twilio_message_sid') THEN
    ALTER TABLE public.communications_log ADD COLUMN twilio_message_sid TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_sequences' AND column_name = 'twilio_content_sid') THEN
    ALTER TABLE public.message_sequences ADD COLUMN twilio_content_sid TEXT;
  END IF;
END $$;

-- Add trigger for twilio_sequences updated_at
CREATE TRIGGER update_twilio_sequences_updated_at
  BEFORE UPDATE ON public.twilio_sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_communications_log_twilio_sid ON public.communications_log(twilio_message_sid);
CREATE INDEX IF NOT EXISTS idx_communications_log_customer_type ON public.communications_log(customer_id, message_type);
CREATE INDEX IF NOT EXISTS idx_twilio_sequences_active ON public.twilio_sequences(active);