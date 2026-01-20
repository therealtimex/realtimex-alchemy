import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config/index.js';

export class SupabaseService {
    private static instance: SupabaseClient | null = null;
    private static serviceRoleInstance: SupabaseClient | null = null;

    static getClient(): SupabaseClient {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            throw new Error('Supabase URL and Anon Key must be configured');
        }

        if (!this.instance) {
            this.instance = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
                auth: { persistSession: false }
            });
        }
        return this.instance;
    }

    static getServiceRoleClient(): SupabaseClient {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Supabase URL and Service Role Key must be configured');
        }

        if (!this.serviceRoleInstance) {
            this.serviceRoleInstance = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                }
            );
        }
        return this.serviceRoleInstance;
    }

    static isConfigured(): boolean {
        return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
    }
}
