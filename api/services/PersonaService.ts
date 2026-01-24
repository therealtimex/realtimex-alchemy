import { SupabaseClient } from '@supabase/supabase-js';
import { SDKService } from './SDKService.js';
import { UserPersona } from '../lib/types.js';

export class PersonaService {
    private static instance: PersonaService;

    private constructor() { }

    public static getInstance(): PersonaService {
        if (!PersonaService.instance) {
            PersonaService.instance = new PersonaService();
        }
        return PersonaService.instance;
    }

    /**
     * Consolidates recent user interactions into a structured persona.
     * This describes what the user likes and dislikes based on their feedback.
     */
    async consolidatePersona(userId: string, supabase: SupabaseClient): Promise<void> {
        console.log('[PersonaService] Consolidating user persona...');

        // 1. Fetch recent interactions (Last 50)
        // Favorites & Boosts (Positive)
        const { data: positives } = await supabase
            .from('signals')
            .select('title, summary, category, is_boosted, is_favorite, user_notes')
            .or('is_boosted.eq.true,is_favorite.eq.true')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(50);

        // Dismissals (Negative)
        const { data: negatives } = await supabase
            .from('signals')
            .select('title, summary, category')
            .eq('is_dismissed', true)
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(50);

        if ((!positives || positives.length === 0) && (!negatives || negatives.length === 0)) {
            console.log('[PersonaService] No interactions to consolidate.');
            return;
        }

        // 2. Fetch existing persona to update it (Incremental learning)
        const { data: existingPersona } = await supabase
            .from('user_persona')
            .select('*')
            .eq('user_id', userId)
            .single();

        // 3. Construct LLM Prompt
        const prompt = `
        Act as an expert profiler. Analyze the User's feedback history to build a technical "User Persona".
        
        CURRENT PERSONA (Previous State):
        Interests: ${existingPersona?.interest_summary || "None"}
        Dislikes: ${existingPersona?.anti_patterns || "None"}

        RECENT POSITIVE INTERACTIONS (Favorites/Boosts/Notes):
        ${positives?.map(p => `- ${p.title} (${p.category}) ${p.user_notes ? `[NOTE: ${p.user_notes}]` : ''}`).join('\n') || "None"}

        RECENT NEGATIVE INTERACTIONS (Dismissals):
        ${negatives?.map(n => `- ${n.title} (${n.category})`).join('\n') || "None"}

        TASK:
        Synthesize this data into a concise, high-level summary.
        1. "interest_summary": 2-3 sentences describing the user's specific technical interests (e.g., "Focuses on React performance and Rust backend. Likes in-depth tutorials, avoids surface-level news.").
        2. "anti_patterns": 1-2 sentences describing what they avoid (e.g., "Dislikes marketing fluff, Web3 hype, and generic product announcements.").

        Return strictly JSON:
        {
            "interest_summary": "...",
            "anti_patterns": "..."
        }
        `;

        // 4. Call LLM
        const sdk = SDKService.getSDK();
        if (!sdk) {
            console.error('[PersonaService] SDK not available for persona consolidation.');
            return;
        }

        // We use a cheap/fast model for this if available, or just the default
        try {
            const response = await sdk.llm.chat([
                { role: 'system', content: 'You are a precise analyzer. Return ONLY valid JSON.' },
                { role: 'user', content: prompt }
            ], {
                // Use default model from settings or allow override? 
                // For now, we rely on the SDK's default or configured model.
                // ideally we fetch settings here too, but for simplicity we assume default env var or settings are handled in SDKService/Alchemist
            });

            const content = response.response?.content || '{}';
            const parsed = this.parseJSON(content);

            if (parsed.interest_summary && parsed.anti_patterns) {
                // 5. Update Database
                const { error } = await supabase
                    .from('user_persona')
                    .upsert({
                        user_id: userId,
                        interest_summary: parsed.interest_summary,
                        anti_patterns: parsed.anti_patterns,
                        last_updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                if (error) {
                    console.error('[PersonaService] Failed to save persona:', error);
                } else {
                    console.log('[PersonaService] Persona updated successfully.');
                }
            }
        } catch (err) {
            console.error('[PersonaService] LLM error:', err);
        }
    }

    private parseJSON(input: string): any {
        try {
            const jsonMatch = input.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : input;
            const cleaned = jsonStr
                .replace(/<\|[\s\S]*?\|>/g, '') // remove think blocks
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            return JSON.parse(cleaned);
        } catch (e) {
            console.error('[PersonaService] JSON Parse Error:', e);
            return {};
        }
    }
}

export const personaService = PersonaService.getInstance();
