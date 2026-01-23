export type EventType = 'info' | 'analysis' | 'warning' | 'action' | 'error' | 'system';

export interface ProcessingEvent {
    eventType: EventType;
    agentState: string;
    message: string;
    details?: Record<string, any>;
    level?: 'debug' | 'info' | 'warn' | 'error';
    durationMs?: number;
    metadata?: Record<string, any>;
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
    llm_base_url?: string;
    llm_model?: string;
    llm_api_key?: string;
    embedding_model?: string;
    embedding_base_url?: string;
    embedding_api_key?: string;
    blacklist_domains?: string[];
    debug_logging?: boolean;
}
