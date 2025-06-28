-- Create match_invitations table
CREATE TABLE IF NOT EXISTS match_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invitation_type TEXT NOT NULL DEFAULT 'direct' CHECK (invitation_type IN ('direct', 'request')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(match_id, invitee_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_invitations_match_id ON match_invitations(match_id);
CREATE INDEX IF NOT EXISTS idx_match_invitations_invitee_id ON match_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_match_invitations_status ON match_invitations(status);

-- Enable RLS
ALTER TABLE match_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own invitations" ON match_invitations
  FOR SELECT USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE POLICY "Users can create invitations for their matches" ON match_invitations
  FOR INSERT WITH CHECK (
    inviter_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM matches WHERE id = match_id AND host_id = auth.uid())
  );

CREATE POLICY "Users can update their received invitations" ON match_invitations
  FOR UPDATE USING (invitee_id = auth.uid());

-- Add new notification types for invitations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'match_invitation',
      'invitation_accepted',
      'invitation_declined',
      'friend_request',
      'friend_request_accepted',
      'match_update',
      'match_cancelled',
      'join_request',
      'join_request_accepted',
      'join_request_rejected'
    );
  ELSE
    -- Add new notification types if they don't exist
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'match_invitation';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invitation_accepted';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invitation_declined';
  END IF;
END$$; 