-- Add universal LLM fields
ALTER TABLE public.alchemy_settings
ADD COLUMN IF NOT EXISTS llm_base_url TEXT,
ADD COLUMN IF NOT EXISTS llm_model_name TEXT,
ADD COLUMN IF NOT EXISTS llm_api_key TEXT;

-- Update existing rows (optional migration of data)
-- For Ollama
UPDATE public.alchemy_settings 
SET llm_base_url = ollama_host,
    llm_model_name = 'llama3'
WHERE llm_provider = 'ollama' AND llm_base_url IS NULL;

-- For OpenAI
UPDATE public.alchemy_settings
SET llm_base_url = 'https://api.openai.com/v1',
    llm_model_name = 'gpt-4o',
    llm_api_key = openai_api_key
WHERE llm_provider = 'openai' AND llm_base_url IS NULL;

-- For Anthropic
UPDATE public.alchemy_settings
SET llm_base_url = 'https://api.anthropic.com/v1',
    llm_model_name = 'claude-3-5-sonnet-20240620',
    llm_api_key = anthropic_api_key
WHERE llm_provider = 'anthropic' AND llm_base_url IS NULL;
