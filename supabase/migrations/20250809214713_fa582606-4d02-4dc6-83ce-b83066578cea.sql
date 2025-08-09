-- AI threads and messages for per-customer chat history
CREATE TABLE IF NOT EXISTS public.ai_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id integer REFERENCES public.customers(id) ON DELETE SET NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow authenticated users to manage ai_threads"
ON public.ai_threads
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE TRIGGER IF NOT EXISTS update_ai_threads_updated_at
BEFORE UPDATE ON public.ai_threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ai_threads_customer_id ON public.ai_threads(customer_id);

-- Messages within a thread
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow authenticated users to manage ai_messages"
ON public.ai_messages
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE TRIGGER IF NOT EXISTS update_ai_messages_updated_at
BEFORE UPDATE ON public.ai_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ai_messages_thread_id ON public.ai_messages(thread_id);

-- Enrichment data for a customer
CREATE TABLE IF NOT EXISTS public.customer_enrichment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id integer NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  summary text,
  tags text[],
  sources jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_enrichment ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow authenticated users to manage customer_enrichment"
ON public.customer_enrichment
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE TRIGGER IF NOT EXISTS update_customer_enrichment_updated_at
BEFORE UPDATE ON public.customer_enrichment
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_customer_enrichment_customer_id ON public.customer_enrichment(customer_id);

-- Freeform notes captured by staff
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id integer NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  author text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow authenticated users to manage customer_notes"
ON public.customer_notes
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE TRIGGER IF NOT EXISTS update_customer_notes_updated_at
BEFORE UPDATE ON public.customer_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON public.customer_notes(customer_id);
