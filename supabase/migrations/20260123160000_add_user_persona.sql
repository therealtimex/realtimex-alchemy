-- Create user_persona table for long-term active learning
CREATE TABLE IF NOT EXISTS user_persona (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  interest_summary text,
  anti_patterns text,
  last_updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_persona ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own persona"
  ON user_persona FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own persona"
  ON user_persona FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own persona"
  ON user_persona FOR UPDATE
  USING (auth.uid() = user_id);
