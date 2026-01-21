import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            event_type,
            agent_state,
            message,
            details,
            level,
            duration_ms,
            metadata
        } = await req.json()

        // Get User
        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) throw new Error('Unauthorized')

        // Persist event (triggers Realtime)
        const { error } = await supabaseClient
            .from('processing_events')
            .insert([
                {
                    user_id: user.id,
                    event_type,
                    agent_state,
                    message,
                    details,
                    level: level || 'info', // 'debug', 'info', 'warn', 'error'
                    duration_ms: duration_ms || null,
                    metadata: metadata || {},
                    created_at: new Date().toISOString(),
                },
            ])

        if (error) throw error

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
