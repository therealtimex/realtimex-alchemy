export type EventType = 'info' | 'analysis' | 'action' | 'error' | 'system';

export interface Actionable {
    type: 'blacklist_suggestion' | 'low_scores' | 'errors' | 'pattern_detection';
    label: string;
    filter: string; // Filter to apply in System Logs
    data?: any;     // Context data
}

export interface ProcessingEvent {
    id: string;
    user_id: string;
    event_type: EventType;
    agent_state: string;
    message: string;
    details: Record<string, any>;
    level?: 'debug' | 'info' | 'warn' | 'error';
    duration_ms?: number;
    metadata?: Record<string, any>;
    created_at: string;
}

export interface Signal {
    id: string;
    user_id: string;
    url: string;
    title: string;
    score: number;
    summary: string;
    category: string;
    entities: string[];
    tags?: string[];
    content?: string;
    is_favorite?: boolean;
    user_notes?: string | null;
    is_boosted?: boolean;
    is_dismissed?: boolean;
    mention_count?: number;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface AlchemySettings {
    user_id: string;
    llm_base_url?: string;
    llm_model_name?: string;
    llm_api_key?: string;
    custom_browser_paths?: any[];
    max_urls_per_sync?: number;
    sync_start_date?: string | null;
    last_sync_checkpoint?: string | null;
    // Legacy fields (kept for backward compatibility)
    sync_mode?: string;
    sync_from_date?: string;
}

export interface UserPersona {
    id: string;
    user_id: string;
    interest_summary: string | null;
    anti_patterns: string | null;
    last_updated_at: string;
    created_at: string;
}
