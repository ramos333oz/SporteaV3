-- Create required schema extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  student_id TEXT,
  faculty TEXT,
  campus TEXT,
  bio TEXT,
  sport_preferences JSONB,
  skill_levels JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- SPORTS
CREATE TABLE IF NOT EXISTS sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- LOCATIONS
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  campus TEXT,
  coordinates JSONB, -- {lat: 0, lng: 0}
  image_url TEXT,
  facilities JSONB,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- MATCHES
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  sport_id UUID REFERENCES sports(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER NOT NULL,
  skill_level TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'ongoing', 'completed', 'cancelled'
  price_per_person DECIMAL(10, 2) DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  access_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- PARTICIPANTS
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'declined', 'removed'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(match_id, user_id)
);

-- RATINGS
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rater_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  rated_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(rater_id, rated_user_id, match_id)
);

-- CHATS
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'match_invite', 'match_update', 'new_participant', etc.
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert default sports
INSERT INTO sports (name, description) 
VALUES 
  ('Badminton', 'Racquet sport played using racquets to hit a shuttlecock across a net'),
  ('Basketball', 'Team sport in which two teams, most commonly of five players each, opposing one another on a rectangular court'),
  ('Football', 'Team sport played between two teams of eleven players with a spherical ball'),
  ('Volleyball', 'Team sport in which two teams of six players are separated by a net'),
  ('Tennis', 'Racquet sport that can be played individually against a single opponent or between two teams of two players each'),
  ('Table Tennis', 'Ball sport played on a hard table divided by a net'),
  ('Futsal', 'Variant of association football played on a hard court, smaller than a football pitch, and mainly indoors')
ON CONFLICT (name) DO NOTHING;

-- Create RLS policies

-- Users policy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Matches policy
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view non-private matches" ON matches FOR SELECT USING (NOT is_private OR host_id = auth.uid());
CREATE POLICY "Participants can view private matches" ON matches FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM participants 
    WHERE match_id = matches.id AND user_id = auth.uid() AND status IN ('confirmed', 'pending')
  )
);
CREATE POLICY "Host can update their matches" ON matches FOR UPDATE TO authenticated USING (host_id = auth.uid());
CREATE POLICY "Host can delete their matches" ON matches FOR DELETE TO authenticated USING (host_id = auth.uid());
CREATE POLICY "Authenticated users can create matches" ON matches FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());

-- Participants policy
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Users can join matches" ON participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their participation" ON participants FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Host can manage participants" ON participants FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE id = participants.match_id AND host_id = auth.uid()
  )
);

-- Create function to handle match chat creation
CREATE OR REPLACE FUNCTION create_match_chat() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chats (match_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to create chat room when match is created
CREATE TRIGGER create_chat_on_match_insert
AFTER INSERT ON matches
FOR EACH ROW
EXECUTE PROCEDURE create_match_chat();

-- Create function to auto-join host as participant
CREATE OR REPLACE FUNCTION add_host_as_participant() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO participants (match_id, user_id, status)
  VALUES (NEW.id, NEW.host_id, 'confirmed');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add host as participant when match is created
CREATE TRIGGER add_host_on_match_insert
AFTER INSERT ON matches
FOR EACH ROW
EXECUTE PROCEDURE add_host_as_participant();
