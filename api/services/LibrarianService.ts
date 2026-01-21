import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './SupabaseService.js';

export interface Signal {
    id: string;
    url: string;
    title: string;
    score: number;
    summary: string;
    date: string;
    category?: string;
    entities?: string[];
    content?: string;
}

export class LibrarianService {
    async getSignals(supabase?: SupabaseClient): Promise<Signal[]> {
        // Use provided client or try to get service role client (which may fail if no env)
        const client = supabase || (SupabaseService.isConfigured() ? SupabaseService.getServiceRoleClient() : null);

        if (!client) {
            console.warn('[Librarian] Supabase not configured, returning empty signals');
            return [];
        }

        const { data, error } = await client
            .from('signals')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Librarian] Error fetching signals:', error);
            return [];
        }

        return (data || []).map((s: any) => ({
            id: s.id,
            url: s.url,
            title: s.title,
            score: s.score,
            summary: s.summary,
            date: s.created_at,
            category: s.category,
            entities: s.entities,
            content: s.content
        }));
    }

    async saveSignal(metadata: Partial<Signal>, content: string, supabase?: SupabaseClient): Promise<void> {
        const client = supabase || (SupabaseService.isConfigured() ? SupabaseService.getServiceRoleClient() : null);

        if (!client) {
            console.warn('[Librarian] Supabase not configured, signal not saved to cloud');
            return;
        }

        // For saving, we need the user_id.
        // If the client is scoped, we can get it from auth.
        const { data: { user } } = await client.auth.getUser();

        // If no user (e.g. using service role without user context), fallback or skip
        // But for Zero-Env, we expect a scoped client.

        const { error } = await client
            .from('signals')
            .upsert({
                url: metadata.url,
                title: metadata.title,
                score: metadata.score,
                summary: metadata.summary,
                category: metadata.category,
                entities: metadata.entities || [],
                content: content,
                user_id: user?.id,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id, url'  // Column names separated by comma and space
            });

        if (error) {
            console.error('[Librarian] Error saving signal:', error);
        } else {
            console.log('[Librarian] Signal saved/updated successfully for URL:', metadata.url);
        }
    }

    private async getSystemUserId(): Promise<string | null> {
        // Legacy fallback
        if (SupabaseService.isConfigured()) {
            const supabase = SupabaseService.getServiceRoleClient();
            const { data } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
            return data?.id || null;
        }
        return null;
    }
}
