-- Add missing columns to csv_imports table for edge function compatibility

ALTER TABLE csv_imports 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS filename TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processing',
ADD COLUMN IF NOT EXISTS total_records INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_records INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_records INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_records INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_details JSONB;

-- Update existing records to have a reasonable status
UPDATE csv_imports 
SET status = 'completed', 
    completed_at = created_at 
WHERE status IS NULL AND success = true;

UPDATE csv_imports 
SET status = 'failed', 
    completed_at = created_at 
WHERE status IS NULL AND success = false;

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_csv_imports_status ON csv_imports(status);
CREATE INDEX IF NOT EXISTS idx_csv_imports_completed_at ON csv_imports(completed_at);