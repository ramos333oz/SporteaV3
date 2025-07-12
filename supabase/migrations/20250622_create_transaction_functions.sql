-- =====================================================
-- SPORTEA TRANSACTION FUNCTIONS
-- Phase 1: Critical Fixes - Database Transactions
-- =====================================================

-- Function 1: Join Match Transaction
-- Atomically handles join requests with notifications
CREATE OR REPLACE FUNCTION join_match_transaction(
  p_match_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_match_record RECORD;
  v_user_record RECORD;
  v_existing_participant RECORD;
  v_participant_id UUID;
  v_notification_id UUID;
  v_result JSON;
BEGIN
  -- Start transaction (implicit in function)
  
  -- 1. Validate match exists and is joinable
  SELECT id, title, host_id, status, max_participants
  INTO v_match_record
  FROM matches 
  WHERE id = p_match_id AND status = 'upcoming';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Match not found or not available for joining',
      'code', 'MATCH_NOT_FOUND'
    );
  END IF;
  
  -- 2. Validate user exists
  SELECT id, full_name, username
  INTO v_user_record
  FROM users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found',
      'code', 'USER_NOT_FOUND'
    );
  END IF;
  
  -- 3. Check if user is the host
  IF v_match_record.host_id = p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Host cannot join their own match',
      'code', 'HOST_CANNOT_JOIN'
    );
  END IF;
  
  -- 4. Check existing participation
  SELECT id, status
  INTO v_existing_participant
  FROM participants
  WHERE match_id = p_match_id AND user_id = p_user_id;
  
  IF FOUND THEN
    -- Handle different existing statuses
    CASE v_existing_participant.status
      WHEN 'confirmed' THEN
        RETURN json_build_object(
          'success', false,
          'error', 'You have already joined this match',
          'code', 'ALREADY_JOINED',
          'status', 'confirmed'
        );
      WHEN 'pending' THEN
        RETURN json_build_object(
          'success', false,
          'error', 'You have already sent a request to join this match',
          'code', 'REQUEST_PENDING',
          'status', 'pending'
        );
      WHEN 'declined' THEN
        RETURN json_build_object(
          'success', false,
          'error', 'Your previous request was declined. Please contact the host.',
          'code', 'REQUEST_DECLINED',
          'status', 'declined'
        );
      WHEN 'left' THEN
        -- Allow rejoin by updating status to pending
        UPDATE participants 
        SET status = 'pending', updated_at = NOW()
        WHERE id = v_existing_participant.id;
        v_participant_id := v_existing_participant.id;
      ELSE
        RETURN json_build_object(
          'success', false,
          'error', 'Unknown participation status',
          'code', 'UNKNOWN_STATUS'
        );
    END CASE;
  ELSE
    -- 5. Create new participant record
    INSERT INTO participants (match_id, user_id, status, created_at, updated_at)
    VALUES (p_match_id, p_user_id, 'pending', NOW(), NOW())
    RETURNING id INTO v_participant_id;
  END IF;
  
  -- 6. Create notification for host (CRITICAL - must succeed)
  INSERT INTO notifications (
    user_id,
    type,
    title,
    content,
    match_id,
    is_read,
    created_at
  ) VALUES (
    v_match_record.host_id,
    'match_join_request',
    'New Join Request',
    json_build_object(
      'message', COALESCE(v_user_record.full_name, v_user_record.username, 'A user') || ' wants to join your match "' || v_match_record.title || '"',
      'sender_id', p_user_id,
      'sender_name', COALESCE(v_user_record.full_name, v_user_record.username),
      'match_title', v_match_record.title
    )::text,
    p_match_id,
    false,
    NOW()
  ) RETURNING id INTO v_notification_id;
  
  -- 7. Build success response
  v_result := json_build_object(
    'success', true,
    'message', 'Join request sent successfully',
    'data', json_build_object(
      'participant_id', v_participant_id,
      'notification_id', v_notification_id,
      'status', 'pending',
      'match_id', p_match_id,
      'user_id', p_user_id
    )
  );
  
  -- Log successful transaction
  RAISE LOG 'join_match_transaction SUCCESS: user_id=%, match_id=%, participant_id=%', 
    p_user_id, p_match_id, v_participant_id;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE LOG 'join_match_transaction ERROR: user_id=%, match_id=%, error=%', 
      p_user_id, p_match_id, SQLERRM;
    
    -- Return error response (transaction will auto-rollback)
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction failed: ' || SQLERRM,
      'code', 'TRANSACTION_ERROR'
    );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function 2: Leave Match Transaction
-- Atomically handles leaving matches with cleanup
CREATE OR REPLACE FUNCTION leave_match_transaction(
  p_match_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_participant_record RECORD;
  v_match_record RECORD;
  v_user_record RECORD;
  v_notification_id UUID;
  v_result JSON;
BEGIN
  -- 1. Validate participant exists and get current status
  SELECT id, status, created_at
  INTO v_participant_record
  FROM participants
  WHERE match_id = p_match_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are not a participant in this match',
      'code', 'NOT_PARTICIPANT'
    );
  END IF;
  
  -- 2. Check if already left
  IF v_participant_record.status = 'left' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You have already left this match',
      'code', 'ALREADY_LEFT'
    );
  END IF;
  
  -- 3. Get match and user details for notification
  SELECT m.title, m.host_id, u.full_name, u.username
  INTO v_match_record
  FROM matches m, users u
  WHERE m.id = p_match_id AND u.id = p_user_id;
  
  -- 4. Update participant status to 'left'
  UPDATE participants 
  SET status = 'left', updated_at = NOW()
  WHERE id = v_participant_record.id;
  
  -- 5. Create notification for host (if user was confirmed)
  IF v_participant_record.status = 'confirmed' THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      content,
      match_id,
      is_read,
      created_at
    ) VALUES (
      v_match_record.host_id,
      'participant_left',
      'Participant Left Match',
      json_build_object(
        'message', COALESCE(v_match_record.full_name, v_match_record.username, 'A participant') || ' has left your match "' || v_match_record.title || '"',
        'participant_id', p_user_id,
        'participant_name', COALESCE(v_match_record.full_name, v_match_record.username),
        'match_title', v_match_record.title,
        'previous_status', v_participant_record.status
      )::text,
      p_match_id,
      false,
      NOW()
    ) RETURNING id INTO v_notification_id;
  END IF;
  
  -- 6. Build success response
  v_result := json_build_object(
    'success', true,
    'message', CASE 
      WHEN v_participant_record.status = 'confirmed' THEN 'You have successfully left the match'
      WHEN v_participant_record.status = 'pending' THEN 'Your join request has been cancelled'
      ELSE 'Status updated successfully'
    END,
    'data', json_build_object(
      'participant_id', v_participant_record.id,
      'previous_status', v_participant_record.status,
      'new_status', 'left',
      'notification_id', v_notification_id
    )
  );
  
  -- Log successful transaction
  RAISE LOG 'leave_match_transaction SUCCESS: user_id=%, match_id=%, previous_status=%', 
    p_user_id, p_match_id, v_participant_record.status;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE LOG 'leave_match_transaction ERROR: user_id=%, match_id=%, error=%', 
      p_user_id, p_match_id, SQLERRM;
    
    -- Return error response (transaction will auto-rollback)
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction failed: ' || SQLERRM,
      'code', 'TRANSACTION_ERROR'
    );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function 3: Accept Join Request Transaction
-- Atomically accepts join requests with notifications
CREATE OR REPLACE FUNCTION accept_join_request_transaction(
  p_match_id UUID,
  p_user_id UUID,
  p_host_id UUID
) RETURNS JSON AS $$
DECLARE
  v_participant_record RECORD;
  v_match_record RECORD;
  v_user_record RECORD;
  v_current_count INTEGER;
  v_notification_id UUID;
  v_result JSON;
BEGIN
  -- 1. Validate host permission
  SELECT id, title, max_participants, host_id
  INTO v_match_record
  FROM matches
  WHERE id = p_match_id AND host_id = p_host_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Match not found or you are not the host',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  -- 2. Get participant record
  SELECT id, status
  INTO v_participant_record
  FROM participants
  WHERE match_id = p_match_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Join request not found',
      'code', 'REQUEST_NOT_FOUND'
    );
  END IF;

  -- 3. Check if request is pending
  IF v_participant_record.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Request is not pending (current status: ' || v_participant_record.status || ')',
      'code', 'INVALID_STATUS',
      'current_status', v_participant_record.status
    );
  END IF;

  -- 4. Check match capacity
  SELECT COUNT(*)
  INTO v_current_count
  FROM participants
  WHERE match_id = p_match_id AND status = 'confirmed';

  IF v_current_count >= v_match_record.max_participants THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Match is already at maximum capacity',
      'code', 'MATCH_FULL',
      'current_count', v_current_count,
      'max_participants', v_match_record.max_participants
    );
  END IF;

  -- 5. Get user details for notification
  SELECT full_name, username
  INTO v_user_record
  FROM users
  WHERE id = p_user_id;

  -- 6. Update participant status to confirmed
  UPDATE participants
  SET status = 'confirmed', updated_at = NOW()
  WHERE id = v_participant_record.id;

  -- 7. Create notification for user (CRITICAL - must succeed)
  INSERT INTO notifications (
    user_id,
    type,
    title,
    content,
    match_id,
    is_read,
    created_at
  ) VALUES (
    p_user_id,
    'join_request_accepted',
    'Join Request Accepted',
    json_build_object(
      'message', 'Your request to join "' || v_match_record.title || '" has been accepted',
      'match_title', v_match_record.title,
      'match_id', p_match_id,
      'host_id', p_host_id
    )::text,
    p_match_id,
    false,
    NOW()
  ) RETURNING id INTO v_notification_id;

  -- 8. Build success response
  v_result := json_build_object(
    'success', true,
    'message', 'Join request accepted successfully',
    'data', json_build_object(
      'participant_id', v_participant_record.id,
      'notification_id', v_notification_id,
      'user_id', p_user_id,
      'match_id', p_match_id,
      'new_status', 'confirmed',
      'participant_count', v_current_count + 1
    )
  );

  -- Log successful transaction
  RAISE LOG 'accept_join_request_transaction SUCCESS: host_id=%, user_id=%, match_id=%',
    p_host_id, p_user_id, p_match_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE LOG 'accept_join_request_transaction ERROR: host_id=%, user_id=%, match_id=%, error=%',
      p_host_id, p_user_id, p_match_id, SQLERRM;

    -- Return error response (transaction will auto-rollback)
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction failed: ' || SQLERRM,
      'code', 'TRANSACTION_ERROR'
    );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function 4: Decline Join Request Transaction
-- Atomically declines join requests with notifications
CREATE OR REPLACE FUNCTION decline_join_request_transaction(
  p_match_id UUID,
  p_user_id UUID,
  p_host_id UUID
) RETURNS JSON AS $$
DECLARE
  v_participant_record RECORD;
  v_match_record RECORD;
  v_user_record RECORD;
  v_notification_id UUID;
  v_result JSON;
BEGIN
  -- 1. Validate host permission
  SELECT id, title, host_id
  INTO v_match_record
  FROM matches
  WHERE id = p_match_id AND host_id = p_host_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Match not found or you are not the host',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  -- 2. Get participant record
  SELECT id, status
  INTO v_participant_record
  FROM participants
  WHERE match_id = p_match_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Join request not found',
      'code', 'REQUEST_NOT_FOUND'
    );
  END IF;

  -- 3. Check if request is pending
  IF v_participant_record.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Request is not pending (current status: ' || v_participant_record.status || ')',
      'code', 'INVALID_STATUS',
      'current_status', v_participant_record.status
    );
  END IF;

  -- 4. Get user details for notification
  SELECT full_name, username
  INTO v_user_record
  FROM users
  WHERE id = p_user_id;

  -- 5. Update participant status to declined
  UPDATE participants
  SET status = 'declined', updated_at = NOW()
  WHERE id = v_participant_record.id;

  -- 6. Create notification for user (CRITICAL - must succeed)
  INSERT INTO notifications (
    user_id,
    type,
    title,
    content,
    match_id,
    is_read,
    created_at
  ) VALUES (
    p_user_id,
    'join_request_declined',
    'Join Request Declined',
    json_build_object(
      'message', 'Your request to join "' || v_match_record.title || '" has been declined',
      'match_title', v_match_record.title,
      'match_id', p_match_id,
      'host_id', p_host_id
    )::text,
    p_match_id,
    false,
    NOW()
  ) RETURNING id INTO v_notification_id;

  -- 7. Build success response
  v_result := json_build_object(
    'success', true,
    'message', 'Join request declined successfully',
    'data', json_build_object(
      'participant_id', v_participant_record.id,
      'notification_id', v_notification_id,
      'user_id', p_user_id,
      'match_id', p_match_id,
      'new_status', 'declined'
    )
  );

  -- Log successful transaction
  RAISE LOG 'decline_join_request_transaction SUCCESS: host_id=%, user_id=%, match_id=%',
    p_host_id, p_user_id, p_match_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE LOG 'decline_join_request_transaction ERROR: host_id=%, user_id=%, match_id=%, error=%',
      p_host_id, p_user_id, p_match_id, SQLERRM;

    -- Return error response (transaction will auto-rollback)
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction failed: ' || SQLERRM,
      'code', 'TRANSACTION_ERROR'
    );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION join_match_transaction(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION leave_match_transaction(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_join_request_transaction(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_join_request_transaction(UUID, UUID, UUID) TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION join_match_transaction(UUID, UUID) IS
'Atomically handles join match requests with notifications. Returns JSON with success/error status.';

COMMENT ON FUNCTION leave_match_transaction(UUID, UUID) IS
'Atomically handles leaving matches with cleanup and notifications. Returns JSON with success/error status.';

COMMENT ON FUNCTION accept_join_request_transaction(UUID, UUID, UUID) IS
'Atomically accepts join requests with capacity checks and notifications. Returns JSON with success/error status.';

COMMENT ON FUNCTION decline_join_request_transaction(UUID, UUID, UUID) IS
'Atomically declines join requests with notifications. Returns JSON with success/error status.';
