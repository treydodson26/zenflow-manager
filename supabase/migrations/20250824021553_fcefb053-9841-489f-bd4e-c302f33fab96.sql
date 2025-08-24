-- Fix security policy for twilio_sequences table
DROP POLICY IF EXISTS "Allow all operations on twilio_sequences" ON public.twilio_sequences;

CREATE POLICY "Allow authenticated users to manage twilio_sequences"
ON public.twilio_sequences
FOR ALL
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);