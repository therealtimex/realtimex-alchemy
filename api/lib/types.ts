export type EventType = 'info' | 'analysis' | 'warning' | 'action' | 'error' | 'system';

export interface Actionable {
    type: 'blacklist_suggestion' | 'low_scores' | 'errors' | 'pattern_detection';
    label: string;
    filter: string; // Filter to apply in System Logs
    data?: any;     // Context data
}

export interface ProcessingEvent {
    eventType: EventType;
    agentState: string;
    message: string;
    details?: Record<string, any>;
    level?: 'debug' | 'info' | 'warn' | 'error';
    durationMs?: number;
    metadata?: Record<string, any>;
    actionable?: Actionable;
    userId?: string;
}

export interface HistoryEntry {
    id: string;
    url: string;
    title: string;
    visit_count: number;
    last_visit_time: number;
    browser: string;
}

export interface Signal {
    id?: string;
    user_id?: string;
    url: string;
    title: string;
    score: number;
    summary: string;
    category: string;
    entities: string[] | any; // Jsonb
    tags?: string[];
    content?: string;
    mention_count?: number;
    has_embedding?: boolean;
    embedding_model?: string;
    metadata?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
}

export interface BrowserSource {
    path: string;
    label: string;
    browser: string;
    enabled: boolean;
}

export interface AlchemySettings {
    id?: string;
    user_id?: string;
    custom_browser_paths?: BrowserSource[];
    max_urls_per_sync?: number;
    sync_mode?: 'incremental' | 'full';
    sync_start_date?: string | null;
    last_sync_checkpoint?: string | null;
    // LLM Configuration (SDK-powered)
    llm_provider?: string;           // NEW: realtimexai, openai, anthropic, google, ollama
    llm_model?: string;
    llm_base_url?: string;           // DEPRECATED: kept for backward compatibility
    llm_api_key?: string;            // DEPRECATED: kept for backward compatibility
    // Embedding Configuration (SDK-powered)
    embedding_provider?: string;     // NEW: realtimexai, openai, gemini
    embedding_model?: string;
    embedding_base_url?: string;     // DEPRECATED: kept for backward compatibility
    embedding_api_key?: string;      // DEPRECATED: kept for backward compatibility
    blacklist_domains?: string[];
    debug_logging?: boolean;
}

export interface UserPersona {
    id: string;
    user_id: string;
    interest_summary: string | null;
    anti_patterns: string | null;
    last_updated_at: string;
    created_at: string;
}

export type EngineType = 'newsletter' | 'thread' | 'audio' | 'report';
export type EngineStatus = 'active' | 'paused' | 'draft';

export interface Engine {
    id: string;
    user_id: string;
    title: string;
    type: EngineType;
    config: Record<string, any>;
    status: EngineStatus;
    last_run_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Asset {
    id: string;
    user_id: string;
    engine_id: string | null;
    title: string;
    type: 'markdown' | 'audio' | 'image';
    content: string | null;
    metadata: Record<string, any>;
    created_at: string;
}
