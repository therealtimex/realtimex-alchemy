
import { SupabaseClient } from '@supabase/supabase-js';
import { embeddingService } from './EmbeddingService.js';
import { SDKService } from './SDKService.js';
import { AlchemySettings } from '../lib/types.js';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    context_sources?: any[];
    created_at: string;
}

export interface ChatSession {
    id: string;
    title: string;
    updated_at: string;
}

export class ChatService {

    /**
     * Create a new chat session
     */
    async createSession(userId: string, supabase: SupabaseClient): Promise<ChatSession | null> {
        const { data, error } = await supabase
            .from('chat_sessions')
            .insert([{ user_id: userId, title: 'New Chat' }])
            .select()
            .single();

        if (error) {
            console.error('[ChatService] Failed to create session:', error);
            return null;
        }
        return data;
    }

    /**
     * Get all sessions for a user
     */
    async getSessions(userId: string, supabase: SupabaseClient): Promise<ChatSession[]> {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) return [];
        return data;
    }

    /**
     * Get messages for a session
     */
    async getMessages(sessionId: string, userId: string, supabase: SupabaseClient): Promise<ChatMessage[]> {
        // Verify ownership via RLS (implicit in query usually, but good to be explicit if needed)
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) return [];
        return data;
    }

    /**
     * Send a message and get a response (RAG)
     */
    async sendMessage(
        sessionId: string,
        content: string,
        userId: string,
        supabase: SupabaseClient,
        settings: AlchemySettings
    ): Promise<ChatMessage | null> {
        try {
            // 1. Save User Message
            const { error: msgError } = await supabase
                .from('chat_messages')
                .insert([{
                    session_id: sessionId,
                    role: 'user',
                    content: content
                }]);

            if (msgError) throw msgError;

            // 2. Generate Embedding for Query
            const queryEmbedding = await embeddingService.generateEmbedding(content, settings);

            let context = "";
            let sources: any[] = [];

            // 3. Retrieve Context (if embedding checks out)
            if (queryEmbedding) {
                const similar = await embeddingService.findSimilarSignals(
                    queryEmbedding,
                    userId,
                    supabase,
                    0.55, // Lowered threshold for better recall
                    10    // Increased Top K
                );

                console.log(`[ChatService] RAG Retrieval: Found ${similar.length} signals for query: "${content}"`);

                if (similar.length > 0) {
                    sources = similar.map(s => ({
                        id: s.id,
                        score: s.score,
                        title: s.metadata?.title,
                        url: s.metadata?.url,
                        summary: s.metadata?.summary
                    }));

                    context = "Here is the relevant context from the user's browsing history:\n\n";
                    sources.forEach((s, i) => {
                        context += `[${i + 1}] Title: ${s.title}\nURL: ${s.url}\nSummary: ${s.summary}\n\n`;
                    });
                }
            }

            // 4. Construct Prompt
            const systemPrompt = `
You are Alchemist, an intelligent research assistant powered by the user's browsing history.
Use the provided context to answer the user's question. 
If the answer is not in the context, use your general knowledge but clearly state that it's from general knowledge, not their history.
Cite your sources using the format [1], [2] when referring to specific context items.
Be concise, helpful, and professional.
            `.trim();

            const finalPrompt = context
                ? `${context}\n\nUser Question: ${content}`
                : `User Question: ${content}`;

            // 5. Call LLM
            const sdk = SDKService.getSDK();
            if (!sdk) throw new Error('SDK not available');

            // Retrieve conversation history (last 10 messages, excluding the just-inserted user message)
            const history = await this.getMessages(sessionId, userId, supabase);
            const previousMessages = history.slice(0, -1).slice(-10); // Exclude last (current) message, take up to 10

            const messages = [
                { role: 'system' as const, content: systemPrompt },
                ...previousMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                { role: 'user' as const, content: finalPrompt } // Current turn with RAG context
            ];

            console.log('[ChatService] Final Prompt being sent to LLM:', JSON.stringify(messages, null, 2));

            const response = await sdk.llm.chat(messages, {
                provider: settings.llm_provider || 'realtimexai',
                model: settings.llm_model || 'gpt-4o'
            });

            console.log('[ChatService] LLM Response:', JSON.stringify(response, null, 2));

            const aiContent = response.response?.content || "I'm sorry, I couldn't generate a response. The LLM returned empty content.";

            // 6. Save Assistant Message
            const { data: aiMsg, error: aiError } = await supabase
                .from('chat_messages')
                .insert([{
                    session_id: sessionId,
                    role: 'assistant',
                    content: aiContent,
                    context_sources: sources
                }])
                .select()
                .single();

            if (aiError) throw aiError;

            // 7. Update Session Title (if first few messages/New Chat)
            // Simple heuristic: if title is 'New Chat', update it
            // (Async, don't block)
            this.updateSessionTitle(sessionId, content, aiContent, supabase, settings);

            // Touch updated_at
            await supabase
                .from('chat_sessions')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', sessionId);

            return aiMsg;

        } catch (error: any) {
            console.error('[ChatService] Send message failed:', error);
            // Return error message as AI response so UI doesn't break
            return {
                id: 'error',
                role: 'assistant',
                content: `Error: ${error.message}`,
                created_at: new Date().toISOString()
            };
        }
    }

    /**
     * Auto-generate title for session
     */
    private async updateSessionTitle(
        sessionId: string,
        userMsg: string,
        aiMsg: string,
        supabase: SupabaseClient,
        settings: AlchemySettings
    ) {
        try {
            const { data } = await supabase
                .from('chat_sessions')
                .select('title')
                .eq('id', sessionId)
                .single();

            if (data && data.title === 'New Chat') {
                const sdk = SDKService.getSDK();
                if (!sdk) return;

                const response = await sdk.llm.chat([
                    { role: 'system', content: 'Generate a very short title (3-5 words) for this chat conversation. Return ONLY the title.' },
                    { role: 'user', content: `User: ${userMsg}\nAI: ${aiMsg}` }
                ], {
                    provider: settings.llm_provider || 'realtimexai',
                    model: 'gpt-4o-mini'
                });

                const newTitle = response.response?.content?.replace(/['"]/g, '').trim();

                if (newTitle) {
                    await supabase
                        .from('chat_sessions')
                        .update({ title: newTitle })
                        .eq('id', sessionId);
                }
            }
        } catch (e) {
            // Ignore title generation errors
        }
    }
}

export const chatService = new ChatService();
