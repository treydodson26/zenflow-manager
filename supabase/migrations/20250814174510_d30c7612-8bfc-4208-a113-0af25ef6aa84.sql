-- First, clean up any foreign key references to the manual sequences we want to delete
UPDATE public.communications_log 
SET message_sequence_id = NULL 
WHERE message_sequence_id IN (SELECT id FROM public.message_sequences WHERE day < 0);

-- Now delete the manual/test sequences with negative days
DELETE FROM public.message_sequences WHERE day < 0;

-- Update RLS policies for message_sequences to allow public read access temporarily
-- (since there's no authentication implemented yet)
DROP POLICY IF EXISTS "Allow authenticated users to view message sequences" ON public.message_sequences;
DROP POLICY IF EXISTS "Allow authenticated users to update message sequences" ON public.message_sequences;

-- Create new policies that allow public access
CREATE POLICY "Allow public to view message sequences" 
ON public.message_sequences 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public to update message sequences" 
ON public.message_sequences 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public to insert message sequences" 
ON public.message_sequences 
FOR INSERT 
WITH CHECK (true);