-- Fix participant_left notification type constraint
-- This migration adds 'participant_left' to the valid notification types
-- to fix the leave match functionality

-- Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;

-- Add the new constraint with 'participant_left' included
ALTER TABLE notifications ADD CONSTRAINT valid_notification_type 
CHECK (type = ANY (ARRAY[
  'friend_request'::text, 
  'friend_accepted'::text, 
  'friend_removed'::text, 
  'friend_request_accepted'::text, 
  'match_invitation'::text, 
  'match_reminder'::text, 
  'match_join_request'::text, 
  'system_alert'::text, 
  'content_violation'::text, 
  'level_up'::text, 
  'achievement_unlock'::text, 
  'invitation_accepted'::text, 
  'invitation_declined'::text, 
  'match_approved'::text, 
  'match_rejected'::text,
  'participant_left'::text
]));

-- Add comment for documentation
COMMENT ON CONSTRAINT valid_notification_type ON notifications IS 
'Ensures notification type is one of the valid predefined types including participant_left for match participation events';
