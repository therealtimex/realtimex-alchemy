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
    content?: string;
    created_at?: string;
}
