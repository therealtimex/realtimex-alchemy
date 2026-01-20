-- Phase 5: Initial Alchemist Schema

-- 1. Signals (Extracted Intelligence)
CREATE TABLE IF NOT EXISTS signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    summary TEXT,
    category TEXT,
    entities JSONB DEFAULT '[]'::jsonb,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_signals_user_id ON signals(user_id);
CREATE INDEX IF NOT EXISTS idx_signals_score ON signals(score);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);

-- 2. History Checkpoints (Incemental Mining)
CREATE TABLE IF NOT EXISTS history_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    browser TEXT NOT NULL,
    last_visit_time BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, browser)
);

-- 3. Alchemy Settings (Configuration BYOK)
CREATE TABLE IF NOT EXISTS alchemy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    llm_provider TEXT DEFAULT 'ollama',
    ollama_host TEXT DEFAULT 'http://localhost:11434',
    openai_api_key TEXT,
    anthropic_api_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE alchemy_settings ENABLE ROW LEVEL SECURITY;

-- 4. Profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

-- 5. Helper Function: Get any user ID (for CLI/Backend fallbacks)
CREATE OR REPLACE FUNCTION get_any_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM profiles LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Profile Trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    
    INSERT INTO public.alchemy_settings (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Policies
CREATE POLICY "Users can only see their own signals" ON signals
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own checkpoints" ON history_checkpoints
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own settings" ON alchemy_settings
    FOR ALL USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE signals;
ALTER PUBLICATION supabase_realtime ADD TABLE history_checkpoints;
