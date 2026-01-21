-- Add processing_events table for real-time terminal feed
CREATE TABLE IF NOT EXISTS processing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'info', 'analysis', 'action', 'error', 'system'
    agent_state TEXT NOT NULL, -- e.g. 'Thinking', 'Mining', 'Analyzing', 'Done'
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE processing_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can only see their own processing events" ON processing_events
    FOR ALL USING (auth.uid() = user_id);

-- Indices
CREATE INDEX IF NOT EXISTS idx_processing_events_user_id ON processing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_events_created_at ON processing_events(created_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE processing_events;
