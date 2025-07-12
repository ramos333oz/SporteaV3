# Real-Time Messaging System Implementation Guide

## Overview

This document outlines the implementation of a comprehensive real-time messaging system for Sportea using Supabase Realtime, enabling match chats, direct messages, and group conversations.

## Architecture Overview

### Technology Stack
- **Backend**: Supabase Realtime (WebSocket-based)
- **Frontend**: React with Supabase client
- **Database**: PostgreSQL with real-time subscriptions
- **Authentication**: Supabase Auth integration

### Message Types
1. **Match Chat**: Team coordination for specific matches
2. **Direct Messages**: Private conversations between friends
3. **Group Chat**: Friend groups or recurring teams

## Database Schema

### 1. Chat Rooms Table

```sql
-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('match', 'direct', 'group')),
  name TEXT,
  description TEXT,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Indexes
  INDEX idx_chat_rooms_type ON chat_rooms(type),
  INDEX idx_chat_rooms_match_id ON chat_rooms(match_id),
  INDEX idx_chat_rooms_created_by ON chat_rooms(created_by)
);

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
```

### 2. Chat Participants Table

```sql
-- Create chat_participants table
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_muted BOOLEAN DEFAULT false,
  
  -- Constraints
  UNIQUE(chat_room_id, user_id),
  
  -- Indexes
  INDEX idx_chat_participants_room_id ON chat_participants(chat_room_id),
  INDEX idx_chat_participants_user_id ON chat_participants(user_id)
);

-- Enable RLS
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
```

### 3. Messages Table

```sql
-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB DEFAULT '{}',
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Indexes
  INDEX idx_messages_chat_room_id ON messages(chat_room_id),
  INDEX idx_messages_sender_id ON messages(sender_id),
  INDEX idx_messages_created_at ON messages(created_at DESC)
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```

### 4. Message Reactions Table

```sql
-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Constraints
  UNIQUE(message_id, user_id, emoji),
  
  -- Indexes
  INDEX idx_message_reactions_message_id ON message_reactions(message_id),
  INDEX idx_message_reactions_user_id ON message_reactions(user_id)
);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
```

## Row Level Security Policies

```sql
-- Chat Rooms Policies
CREATE POLICY "Users can view chat rooms they participate in" ON chat_rooms
  FOR SELECT USING (
    id IN (
      SELECT chat_room_id FROM chat_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Chat Participants Policies
CREATE POLICY "Users can view participants of their chat rooms" ON chat_participants
  FOR SELECT USING (
    chat_room_id IN (
      SELECT chat_room_id FROM chat_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Chat admins can manage participants" ON chat_participants
  FOR ALL USING (
    chat_room_id IN (
      SELECT chat_room_id FROM chat_participants 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Messages Policies
CREATE POLICY "Users can view messages in their chat rooms" ON messages
  FOR SELECT USING (
    chat_room_id IN (
      SELECT chat_room_id FROM chat_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their chat rooms" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    chat_room_id IN (
      SELECT chat_room_id FROM chat_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit their own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Message Reactions Policies
CREATE POLICY "Users can view reactions in their chat rooms" ON message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN chat_participants cp ON m.chat_room_id = cp.chat_room_id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add reactions to messages" ON message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
      SELECT m.id FROM messages m
      JOIN chat_participants cp ON m.chat_room_id = cp.chat_room_id
      WHERE cp.user_id = auth.uid()
    )
  );
```

## Backend Services

### 1. Chat Service

```javascript
// src/services/chatService.js
import { supabase } from './supabase';

export const chatService = {
  // Create or get match chat room
  getOrCreateMatchChat: async (matchId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if match chat already exists
      let { data: chatRoom, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('type', 'match')
        .eq('match_id', matchId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Create chat room if it doesn't exist
      if (!chatRoom) {
        const { data: match } = await supabase
          .from('matches')
          .select('title, host_id')
          .eq('id', matchId)
          .single();

        const { data: newChatRoom, error: createError } = await supabase
          .from('chat_rooms')
          .insert({
            type: 'match',
            name: `${match.title} Chat`,
            match_id: matchId,
            created_by: match.host_id
          })
          .select()
          .single();

        if (createError) throw createError;
        chatRoom = newChatRoom;

        // Add host as admin
        await supabase
          .from('chat_participants')
          .insert({
            chat_room_id: chatRoom.id,
            user_id: match.host_id,
            role: 'admin'
          });
      }

      // Add current user as participant if not already
      await supabase
        .from('chat_participants')
        .upsert({
          chat_room_id: chatRoom.id,
          user_id: user.id,
          role: 'member'
        });

      return { success: true, data: chatRoom };
    } catch (error) {
      console.error('Error getting/creating match chat:', error);
      return { success: false, error: error.message };
    }
  },

  // Create direct message chat
  createDirectChat: async (friendId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if direct chat already exists
      const { data: existingChat } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_participants!inner(user_id)
        `)
        .eq('type', 'direct')
        .eq('chat_participants.user_id', user.id)
        .eq('chat_participants.user_id', friendId);

      if (existingChat && existingChat.length > 0) {
        return { success: true, data: existingChat[0] };
      }

      // Create new direct chat
      const { data: chatRoom, error } = await supabase
        .from('chat_rooms')
        .insert({
          type: 'direct',
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add both users as participants
      await supabase
        .from('chat_participants')
        .insert([
          { chat_room_id: chatRoom.id, user_id: user.id, role: 'admin' },
          { chat_room_id: chatRoom.id, user_id: friendId, role: 'admin' }
        ]);

      return { success: true, data: chatRoom };
    } catch (error) {
      console.error('Error creating direct chat:', error);
      return { success: false, error: error.message };
    }
  },

  // Send message
  sendMessage: async (chatRoomId, content, messageType = 'text', replyToId = null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_room_id: chatRoomId,
          sender_id: user.id,
          content,
          message_type: messageType,
          reply_to_id: replyToId
        })
        .select(`
          *,
          sender:users!sender_id(id, full_name, username, avatar_url),
          reply_to:messages!reply_to_id(id, content, sender:users!sender_id(full_name))
        `)
        .single();

      if (error) throw error;

      // Update last activity in chat room
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatRoomId);

      return { success: true, data };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  },

  // Get chat messages
  getMessages: async (chatRoomId, limit = 50, before = null) => {
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:users!sender_id(id, full_name, username, avatar_url),
          reply_to:messages!reply_to_id(id, content, sender:users!sender_id(full_name)),
          reactions:message_reactions(emoji, user_id, users!user_id(full_name))
        `)
        .eq('chat_room_id', chatRoomId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data: data.reverse() };
    } catch (error) {
      console.error('Error getting messages:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user's chat rooms
  getUserChatRooms: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          *,
          chat_room:chat_rooms(
            *,
            match:matches(id, title, start_time),
            last_message:messages(content, created_at, sender:users!sender_id(full_name))
          )
        `)
        .eq('user_id', user.id)
        .order('chat_room.updated_at', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error getting user chat rooms:', error);
      return { success: false, error: error.message };
    }
  },

  // Subscribe to chat room messages
  subscribeToMessages: (chatRoomId, callback) => {
    return supabase
      .channel(`messages:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to typing indicators
  subscribeToTyping: (chatRoomId, callback) => {
    return supabase
      .channel(`typing:${chatRoomId}`)
      .on('broadcast', { event: 'typing' }, callback)
      .subscribe();
  },

  // Send typing indicator
  sendTypingIndicator: (chatRoomId, isTyping) => {
    return supabase
      .channel(`typing:${chatRoomId}`)
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { isTyping, userId: supabase.auth.user()?.id }
      });
  }
};
```

## Frontend Components

### 1. Chat Interface Component

```jsx
// src/components/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  List,
  ListItem,
  Typography,
  Avatar,
  Chip
} from '@mui/material';
import { Send as SendIcon, AttachFile as AttachIcon } from '@mui/icons-material';
import { chatService } from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';

const ChatInterface = ({ chatRoomId, chatRoom }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (chatRoomId) {
      loadMessages();
      subscribeToMessages();
      subscribeToTyping();
    }

    return () => {
      // Cleanup subscriptions
    };
  }, [chatRoomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const result = await chatService.getMessages(chatRoomId);
      if (result.success) {
        setMessages(result.data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    return chatService.subscribeToMessages(chatRoomId, (payload) => {
      setMessages(prev => [...prev, payload.new]);
    });
  };

  const subscribeToTyping = () => {
    return chatService.subscribeToTyping(chatRoomId, (payload) => {
      const { isTyping, userId } = payload.payload;
      setTypingUsers(prev => 
        isTyping 
          ? [...prev.filter(id => id !== userId), userId]
          : prev.filter(id => id !== userId)
      );
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage;
    setNewMessage('');

    try {
      const result = await chatService.sendMessage(chatRoomId, messageContent);
      if (!result.success) {
        // Handle error
        setNewMessage(messageContent);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
    }
  };

  const handleTyping = () => {
    chatService.sendTypingIndicator(chatRoomId, true);
    
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      chatService.sendTypingIndicator(chatRoomId, false);
    }, 1000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chat Header */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <Typography variant="h6">
          {chatRoom?.name || 'Chat'}
        </Typography>
        {chatRoom?.type === 'match' && (
          <Typography variant="body2" color="text.secondary">
            Match Chat
          </Typography>
        )}
      </Paper>

      {/* Messages List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <List>
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isOwn={message.sender_id === user.id}
            />
          ))}
        </List>
        
        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <Box sx={{ p: 1 }}>
            <Chip
              size="small"
              label={`${typingUsers.length} user(s) typing...`}
              variant="outlined"
            />
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            multiline
            maxRows={4}
          />
          <IconButton color="primary" onClick={handleSendMessage}>
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

const MessageItem = ({ message, isOwn }) => (
  <ListItem
    sx={{
      flexDirection: 'column',
      alignItems: isOwn ? 'flex-end' : 'flex-start',
      py: 0.5
    }}
  >
    <Box
      sx={{
        maxWidth: '70%',
        bgcolor: isOwn ? 'primary.main' : 'grey.100',
        color: isOwn ? 'primary.contrastText' : 'text.primary',
        borderRadius: 2,
        p: 1.5,
        mb: 0.5
      }}
    >
      {!isOwn && (
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          {message.sender.full_name}
        </Typography>
      )}
      <Typography variant="body2">
        {message.content}
      </Typography>
    </Box>
    <Typography variant="caption" color="text.secondary">
      {new Date(message.created_at).toLocaleTimeString()}
    </Typography>
  </ListItem>
);

export default ChatInterface;
```

This implementation provides a solid foundation for real-time messaging in Sportea, with room for future enhancements like file sharing, message reactions, and advanced moderation features.
