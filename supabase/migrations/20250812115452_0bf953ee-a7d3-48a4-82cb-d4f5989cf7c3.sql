-- Create core instructor hub tables
-- Contractors (Instructors)
CREATE TABLE IF NOT EXISTS public.contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  certification_level TEXT, -- e.g., '200-hour', '500-hour'
  specializations TEXT[],   -- e.g., ['prenatal','senior']
  base_rate NUMERIC NOT NULL DEFAULT 0,
  per_student_fee NUMERIC NOT NULL DEFAULT 0,
  is_substitute BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  emergency_contact JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Instructor certifications
CREATE TABLE IF NOT EXISTS public.instructor_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  certification_type TEXT NOT NULL,
  issued_date DATE,
  expires_at DATE,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Instructor recurring schedule assignments
CREATE TABLE IF NOT EXISTS public.instructor_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  class_id UUID, -- optional linkage to a class session if applicable
  day_of_week INT, -- 0-6 (Sun-Sat)
  time TIME WITHOUT TIME ZONE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Substitute requests
CREATE TABLE IF NOT EXISTS public.substitute_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID,
  original_instructor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  substitute_instructor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  request_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, confirmed, declined, escalated, cancelled
  response_time TIMESTAMPTZ,
  required_certification TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payroll records (monthly)
CREATE TABLE IF NOT EXISTS public.payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  pay_period TEXT NOT NULL, -- e.g., '2025-08'
  classes_taught INT NOT NULL DEFAULT 0,
  total_students INT NOT NULL DEFAULT 0,
  base_pay NUMERIC NOT NULL DEFAULT 0,
  student_pay NUMERIC NOT NULL DEFAULT 0,
  total_pay NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, approved, exported, paid
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitute_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- Policies: allow authenticated users to manage their data (studio staff app)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contractors' AND policyname = 'Allow authenticated users to manage contractors'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage contractors" ON public.contractors
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'instructor_certifications' AND policyname = 'Allow authenticated users to manage instructor_certifications'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage instructor_certifications" ON public.instructor_certifications
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'instructor_schedule' AND policyname = 'Allow authenticated users to manage instructor_schedule'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage instructor_schedule" ON public.instructor_schedule
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'substitute_requests' AND policyname = 'Allow authenticated users to manage substitute_requests'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage substitute_requests" ON public.substitute_requests
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payroll' AND policyname = 'Allow authenticated users to manage payroll'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage payroll" ON public.payroll
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Triggers to maintain updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contractors_updated_at'
  ) THEN
    CREATE TRIGGER trg_contractors_updated_at
    BEFORE UPDATE ON public.contractors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_instructor_certifications_updated_at'
  ) THEN
    CREATE TRIGGER trg_instructor_certifications_updated_at
    BEFORE UPDATE ON public.instructor_certifications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_instructor_schedule_updated_at'
  ) THEN
    CREATE TRIGGER trg_instructor_schedule_updated_at
    BEFORE UPDATE ON public.instructor_schedule
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_substitute_requests_updated_at'
  ) THEN
    CREATE TRIGGER trg_substitute_requests_updated_at
    BEFORE UPDATE ON public.substitute_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payroll_updated_at'
  ) THEN
    CREATE TRIGGER trg_payroll_updated_at
    BEFORE UPDATE ON public.payroll
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_contractors_active ON public.contractors(is_active);
CREATE INDEX IF NOT EXISTS idx_instructor_schedule_instructor ON public.instructor_schedule(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_schedule_day_time ON public.instructor_schedule(day_of_week, time);
CREATE INDEX IF NOT EXISTS idx_sub_requests_status ON public.substitute_requests(status);
CREATE INDEX IF NOT EXISTS idx_sub_requests_times ON public.substitute_requests(request_time);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON public.payroll(pay_period);
CREATE INDEX IF NOT EXISTS idx_payroll_instructor ON public.payroll(instructor_id);
