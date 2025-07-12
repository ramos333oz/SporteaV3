-- HOTFIX: Fix admin decision trigger bug
-- Issue: handle_admin_decision function was setting status to 'approved' for all decisions including 'reject'
-- Fix: Set correct status based on admin_decision value

-- Drop and recreate the function with the correct logic
CREATE OR REPLACE FUNCTION handle_admin_decision()
RETURNS TRIGGER AS $$
BEGIN
  -- Update match status based on admin decision
  IF NEW.admin_decision = 'approve' THEN
    UPDATE matches SET moderation_status = 'approved' WHERE id = NEW.match_id;
  ELSIF NEW.admin_decision = 'reject' THEN
    UPDATE matches SET moderation_status = 'rejected' WHERE id = NEW.match_id;
  ELSIF NEW.admin_decision = 'warn' THEN
    UPDATE matches SET moderation_status = 'approved' WHERE id = NEW.match_id;
  END IF;
  
  -- Update queue status and completion time - FIX: Set correct status based on decision
  NEW.status = CASE 
    WHEN NEW.admin_decision = 'approve' THEN 'approved'
    WHEN NEW.admin_decision = 'reject' THEN 'rejected'
    WHEN NEW.admin_decision = 'warn' THEN 'approved'
    ELSE NEW.status
  END;
  NEW.completed_at = CASE 
    WHEN NEW.admin_decision IN ('approve', 'reject', 'warn') THEN NOW()
    ELSE NEW.completed_at
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix existing incorrectly processed rejections
-- Update any queue items where admin_decision is 'reject' but status is 'approved'
UPDATE admin_review_queue 
SET status = 'rejected'
WHERE admin_decision = 'reject' 
AND status = 'approved';

-- Also update match status for rejected matches that weren't properly cancelled
UPDATE matches 
SET status = 'cancelled', moderation_status = 'rejected'
WHERE id IN (
  SELECT match_id 
  FROM admin_review_queue 
  WHERE admin_decision = 'reject'
);

-- Add comment for tracking
COMMENT ON FUNCTION handle_admin_decision() IS 'Fixed trigger function that correctly sets queue status based on admin decision (approve->approved, reject->rejected, warn->approved)';
