
-- Phase 1: Database Foundation for 4-stage pipeline
-- Safe, additive changes to align with desired schema while preserving existing data and logic.

-- 1) Extend clients with pipeline-specific fields and constraints
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS pipeline_stage text;

-- Set a conservative default for new rows
ALTER TABLE public.clients
  ALTER COLUMN pipeline_stage SET DEFAULT 'prospect';

-- Enforce valid pipeline values (prospect, lead, new_journey, active_member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_clients_pipeline_stage'
      AND conrelid = 'public.clients'::regclass
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT chk_clients_pipeline_stage
      CHECK (pipeline_stage IN ('prospect','lead','new_journey','active_member'));
  END IF;
END$$;

-- Track recency of engagement
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS days_since_last_visit integer;

-- Track membership state derived from pricing fields
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS has_membership boolean DEFAULT false;

-- Enforce intro_day bounds (0..30)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_clients_intro_day_range'
      AND conrelid = 'public.clients'::regclass
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT chk_clients_intro_day_range
      CHECK (intro_day IS NULL OR (intro_day >= 0 AND intro_day <= 30));
  END IF;
END$$;

-- Helpful indexes for pipeline filtering and lookups
CREATE INDEX IF NOT EXISTS idx_clients_pipeline_stage ON public.clients (pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_clients_intro_offer ON public.clients (is_intro_offer, intro_day);
CREATE INDEX IF NOT EXISTS idx_clients_days_since_registration ON public.clients (days_since_registration);
CREATE INDEX IF NOT EXISTS idx_clients_has_membership ON public.clients (has_membership);
CREATE INDEX IF NOT EXISTS idx_clients_client_email ON public.clients (client_email);

-- 2) Extend csv_imports with pipeline counters (non-breaking)
ALTER TABLE public.csv_imports
  ADD COLUMN IF NOT EXISTS prospects_count integer,
  ADD COLUMN IF NOT EXISTS leads_count integer,
  ADD COLUMN IF NOT EXISTS new_journeys_count integer,
  ADD COLUMN IF NOT EXISTS active_members_count integer,
  ADD COLUMN IF NOT EXISTS intro_offers_count integer;

-- Note:
-- - We intentionally keep existing clients.pipeline_segment and csv_imports columns to avoid breaking current logic.
-- - We will populate pipeline_stage, has_membership, days_since_last_visit during Phase 2 (edge function).
