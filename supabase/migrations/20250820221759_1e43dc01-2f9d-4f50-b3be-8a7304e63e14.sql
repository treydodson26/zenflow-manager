-- Add approval workflow to message queue
ALTER TABLE public.message_queue 
ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending_review',
ADD COLUMN approved_by UUID,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN review_notes TEXT;

-- Update existing status values to be more specific
UPDATE public.message_queue 
SET approval_status = 'pending_review' 
WHERE status = 'pending';

-- Add index for approval workflow
CREATE INDEX idx_message_queue_approval_status ON public.message_queue(approval_status);

-- Create function to approve messages
CREATE OR REPLACE FUNCTION public.approve_queued_message(
  message_id_param UUID,
  approver_id_param UUID,
  notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE message_queue 
  SET 
    approval_status = 'approved',
    approved_by = approver_id_param,
    approved_at = now(),
    review_notes = notes_param,
    status = 'pending' -- Ready to send after approval
  WHERE id = message_id_param
    AND approval_status = 'pending_review';
  
  RETURN FOUND;
END;
$function$;

-- Create function to reject messages
CREATE OR REPLACE FUNCTION public.reject_queued_message(
  message_id_param UUID,
  reviewer_id_param UUID,
  rejection_reason_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE message_queue 
  SET 
    approval_status = 'rejected',
    approved_by = reviewer_id_param,
    approved_at = now(),
    review_notes = rejection_reason_param,
    status = 'cancelled'
  WHERE id = message_id_param
    AND approval_status = 'pending_review';
  
  RETURN FOUND;
END;
$function$;