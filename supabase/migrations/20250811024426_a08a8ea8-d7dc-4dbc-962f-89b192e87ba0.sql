-- Create marketing_images table and storage bucket for AI marketing images
-- 1) Table
CREATE TABLE IF NOT EXISTS public.marketing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  title TEXT,
  original_prompt TEXT NOT NULL,
  enhanced_prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size TEXT DEFAULT '1024x1024',
  style TEXT DEFAULT 'vivid',
  campaign TEXT,
  tags TEXT[],
  metadata JSONB,
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.marketing_images ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users manage their own records
DROP POLICY IF EXISTS "Users can view their own marketing_images" ON public.marketing_images;
CREATE POLICY "Users can view their own marketing_images"
ON public.marketing_images
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own marketing_images" ON public.marketing_images;
CREATE POLICY "Users can insert their own marketing_images"
ON public.marketing_images
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own marketing_images" ON public.marketing_images;
CREATE POLICY "Users can update their own marketing_images"
ON public.marketing_images
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own marketing_images" ON public.marketing_images;
CREATE POLICY "Users can delete their own marketing_images"
ON public.marketing_images
FOR DELETE
USING (auth.uid() = user_id);

-- Timestamps trigger
DROP TRIGGER IF EXISTS trg_marketing_images_updated_at ON public.marketing_images;
CREATE TRIGGER trg_marketing_images_updated_at
BEFORE UPDATE ON public.marketing_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_images_user_id ON public.marketing_images(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_images_campaign ON public.marketing_images(campaign);
CREATE INDEX IF NOT EXISTS idx_marketing_images_tags ON public.marketing_images USING GIN(tags);

-- 2) Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai_artifacts', 'ai_artifacts', false)
ON CONFLICT (id) DO NOTHING;

-- Optional: storage access policies for owners (signed URLs will be used for access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owners can manage ai_artifacts'
  ) THEN
    CREATE POLICY "Owners can manage ai_artifacts"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'ai_artifacts' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'ai_artifacts' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;