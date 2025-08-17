-- Create pricing_plans table for managing customer segment logic
CREATE TABLE public.pricing_plans (
  plan_name text PRIMARY KEY,
  plan_category text NOT NULL CHECK (plan_category IN ('Intro', 'Membership', 'Drop-In')),
  plan_duration_days integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage pricing plans
CREATE POLICY "Allow authenticated users to manage pricing_plans" 
ON public.pricing_plans 
FOR ALL 
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pricing_plans_updated_at
BEFORE UPDATE ON public.pricing_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();