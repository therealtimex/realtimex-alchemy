import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './SupabaseService.js';
import { EventService } from './EventService.js';
import { ProcessingEvent, EventType } from '../lib/types.js';

export class ProcessingEventService {
    private static instance: ProcessingEventService;
    private sseEvents = EventService.getInstance();

    static getInstance() {
        if (!this.instance) {
            this.instance = new ProcessingEventService();
        }
        return this.instance;
    }

    async log(event: ProcessingEvent, supabase?: SupabaseClient) {
        // 1. Log to SSE for instant feedback in existing terminal
        this.sseEvents.emit({
            type: event.eventType,
            message: event.message,
            data: event.details
        });

        // Mirror to console for developer visibility
        const icon = event.eventType === 'error' ? '❌' : event.eventType === 'action' ? '⚡' : 'ℹ️';
        console.log(`[${new Date().toLocaleTimeString()}] ${icon} [${event.agentState}] ${event.message}`);

        // 2. Persist to Supabase for the new Advanced Terminal
        const client = supabase || (SupabaseService.isConfigured() ? SupabaseService.getServiceRoleClient() : null);

        if (client) {
            try {
                const userId = event.userId || await this.getFallbackUserId(client);

                if (userId) {
                    await client.from('processing_events').insert([{
                        user_id: userId,
                        event_type: event.eventType,
                        agent_state: event.agentState,
                        message: event.message,
                        details: event.details || {},
                        level: event.level || 'info',
                        duration_ms: event.durationMs || null,
                        metadata: event.metadata || {},
                        created_at: new Date().toISOString()
                    }]);
                }
            } catch (error) {
                console.error('[ProcessingEventService] Failed to persist event:', error);
            }
        } else {
            // Supabase not configured and no client provided - skip persistence
            // console.warn('[ProcessingEventService] Skipping persistence (no config)');
        }
    }

    private async getFallbackUserId(client: SupabaseClient): Promise<string | null> {
        // Safe check for auth
        if (!client || !client.auth) return null;

        // Try to get user from client auth context first
        try {
            const { data: { user } } = await client.auth.getUser();
            if (user) return user.id;
        } catch (e) {
            // Ignore auth errors during fallback lookup
        }

        // Fallback to searching DB if we have service role (unlikely in Zero-Env)
        if (SupabaseService.isConfigured()) {
            try {
                const { data } = await client.from('profiles').select('id').limit(1).maybeSingle();
                return data?.id || null;
            } catch (e) { return null; }
        }
        return null;
    }
}
