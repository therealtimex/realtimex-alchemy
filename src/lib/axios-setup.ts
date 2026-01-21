import axios from 'axios';
import { supabase } from './supabase';
import { getSupabaseConfig } from './supabase-config';

export function setupAxios() {
    axios.interceptors.request.use(async (config) => {
        try {
            // Add Authorization header from active session
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                config.headers.Authorization = `Bearer ${session.access_token}`;
            }

            // Add Supabase connection details from local config
            const sbConfig = getSupabaseConfig();
            if (sbConfig) {
                config.headers['x-supabase-url'] = sbConfig.url;
                config.headers['x-supabase-key'] = sbConfig.anonKey;
            }
        } catch (error) {
            console.error('[Axios] Error injecting headers:', error);
        }
        return config;
    });
}
