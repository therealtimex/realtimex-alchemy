-- Chat Sessions Table
CREATE TABLE chat_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text DEFAULT 'New Chat',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for chat sessions
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_updated ON chat_sessions(updated_at DESC);

-- RLS for chat sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat sessions"
ON chat_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat sessions"
ON chat_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
ON chat_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
ON chat_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Chat Messages Table
CREATE TABLE chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content text NOT NULL,
    -- Store citations/sources used for this message
    -- Format: [{ id: 'signal_uuid', title: '...', url: '...' }]
    context_sources jsonb DEFAULT '[]'::jsonb, 
    created_at timestamptz DEFAULT now()
);

-- Indexes for chat messages
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at ASC);

-- RLS for chat messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Note: We rely on the session ownership for security. 
-- A user can see messages if they own the session.

CREATE POLICY "Users can view messages from their sessions"
ON chat_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM chat_sessions 
        WHERE id = chat_messages.session_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages into their sessions"
ON chat_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM chat_sessions 
        WHERE id = chat_messages.session_id 
        AND user_id = auth.uid()
    )
);
