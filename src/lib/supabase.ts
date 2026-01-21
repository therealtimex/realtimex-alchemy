import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabase-config';

const config = getSupabaseConfig();
const supabaseUrl = config?.url || import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = config?.anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

export const isSupabaseConfigured = !!(config?.url || import.meta.env.VITE_SUPABASE_URL);
