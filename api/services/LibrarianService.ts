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
    async getSignals(): Promise<Signal[]> {
        if (!SupabaseService.isConfigured()) {
            console.warn('[Librarian] Supabase not configured, returning empty signals');
            return [];
        }

        const supabase = SupabaseService.getServiceRoleClient();
        const { data, error } = await supabase
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

    async saveSignal(metadata: Partial<Signal>, content: string): Promise<void> {
        if (!SupabaseService.isConfigured()) {
            console.warn('[Librarian] Supabase not configured, signal not saved to cloud');
            return;
        }

        const supabase = SupabaseService.getServiceRoleClient();
        const { error } = await supabase
            .from('signals')
            .insert([{
                url: metadata.url,
                title: metadata.title,
                score: metadata.score,
                summary: metadata.summary,
                category: metadata.category,
                entities: metadata.entities || [],
                content: content,
                user_id: (await this.getSystemUserId()) // We'll need a way to link to a default user or handle auth
            }]);

        if (error) {
            console.error('[Librarian] Error saving signal:', error);
        }
    }

    private async getSystemUserId(): Promise<string | null> {
        // For CLI/Automation, we might need a default user or handle this via config
        // In a real app, this would be the authenticated user ID
        const supabase = SupabaseService.getServiceRoleClient();
        const { data } = await supabase.from('profiles').select('id').limit(1).single();
        return data?.id || null;
    }
}
