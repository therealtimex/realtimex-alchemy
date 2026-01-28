export type EventType = 'info' | 'analysis' | 'action' | 'error' | 'system' | 'warning';

export interface Actionable {
    type: 'blacklist_suggestion' | 'low_scores' | 'errors' | 'pattern_detection';
    label: string;
    filter: string; // Filter to apply in System Logs
    data?: any;     // Context data
}

export interface ProcessingEvent {
    id: string;
    userId: string;
    eventType: EventType;
    agentState: string;
    message: string;
    details: Record<string, any>;
    level?: 'debug' | 'info' | 'warn' | 'error';
    durationMs?: number;
    metadata?: Record<string, any>;
    created_at: string;
    actionable?: Actionable;
    // Support snake_case for new code compatibility (optional)
    event_type?: EventType;
    agent_state?: string;
    user_id?: string;
    duration_ms?: number;
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

export interface BrowserSource {
    path: string;
    name?: string;     // Optional in some contexts
    source?: string;   // Optional in some contexts
    // Required by MinerService
    label: string;
    browser: string;
    enabled: boolean | string; // Can be string 'true' from environment/db
}

export interface HistoryEntry {
    url: string;
    title: string;
    visit_count: number;
    last_visit_time: number; // MinerService expects number (unix ms)
    source: string;
    metadata?: any;
    // Additional fields used by MinerService internals
    id?: string;
    browser?: string;
}

export interface AlchemySettings {
    user_id: string;
    // LLM Configuration (via RealTimeX SDK)
    llm_provider?: string;
    llm_model?: string;
    // Embedding Configuration (via RealTimeX SDK)
    embedding_provider?: string;
    embedding_model?: string;
    // Browser Sources
    custom_browser_paths?: BrowserSource[];
    // Sync Settings
    max_urls_per_sync?: number;
    sync_mode?: string;
    sync_start_date?: string | null;
    last_sync_checkpoint?: string | null;
    // Filtering
    blacklist_domains?: string[];
    blocked_tags?: string[];
    // UI/Debug Settings
    sound_enabled?: boolean;
    debug_logging?: boolean;
    // Metadata
    customized_at?: string | null;
}

export interface UserPersona {
    id: string;
    user_id: string;
    interest_summary: string | null;
    anti_patterns: string | null;
    last_updated_at: string;
    created_at: string;
}

// Transmute Engine Types
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

export type AssetStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Asset {
    id: string;
    user_id: string;
    engine_id: string | null;
    title: string;
    type: 'markdown' | 'audio' | 'image';
    content: string | null;
    metadata: Record<string, any>;
    status?: AssetStatus; // Default 'completed' for legacy
    job_id?: string;
    error_message?: string;
    created_at: string;
}

export type ExecutionMode = 'local' | 'desktop';

export interface ProductionBrief {
    agent_name: string;
    auto_run: boolean;
    raw_data: {
        job_id: string;
        context: {
            title: string;
            signals: Array<{
                title: string;
                summary: string;
                url: string;
                source_urls?: string[];
                content?: string;
            }>;
            user_persona?: {
                interest_summary: string | null;
                anti_patterns: string | null;
            };
        };
        directives: Record<string, any> & {
            prompt: string;
            system_prompt?: string;
            execution_mode: ExecutionMode;
        };
        output_config: {
            system_path?: string;
            filename: string;
            target_asset_id: string;
        };
    };
}
