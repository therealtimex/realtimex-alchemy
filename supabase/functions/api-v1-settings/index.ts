import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { handleCors, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/auth.ts';

/**
 * Settings API for Alchemy
 *
 * GET /api-v1-settings - Get alchemy settings
 * PATCH /api-v1-settings - Update alchemy settings
 * GET /api-v1-settings/stats - Get user intelligence statistics
 */

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Verify user authentication
  const { user, error: authError } = await verifyUser(req);
  if (authError || !user) {
    return createErrorResponse(401, authError || 'Unauthorized');
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // GET /api-v1-settings/stats - Get statistics
    if (req.method === 'GET' && pathParts[1] === 'stats') {
      // Get signal count
      const { count: signalCount } = await supabaseAdmin
        .from('signals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get high density signal count (score >= 80)
      const { count: highDensityCount } = await supabaseAdmin
        .from('signals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('score', 80);

      // Get category distribution
      const { data: categoryData } = await supabaseAdmin
        .from('signals')
        .select('category')
        .eq('user_id', user.id);

      const categoryCounts: Record<string, number> = {};
      for (const signal of categoryData || []) {
        const cat = signal.category || 'Research';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }

      // Get recent activity (last 10 events)
      const { data: recentEvents } = await supabaseAdmin
        .from('processing_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      return createSuccessResponse({
        stats: {
          signalCount: signalCount || 0,
          highDensityCount: highDensityCount || 0,
          categoryCounts,
          recentEvents: recentEvents || [],
        },
      });
    }

    // GET /api-v1-settings - Get settings
    if (req.method === 'GET' && pathParts.length === 1) {
      const { data, error } = await supabaseAdmin
        .from('alchemy_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Database error:', error);
        return createErrorResponse(500, 'Failed to fetch settings');
      }

      // Return default settings if none exist
      const settings = data || {
        user_id: user.id,
        llm_provider: 'ollama',
        ollama_host: 'http://localhost:11434',
      };

      return createSuccessResponse({ settings });
    }

    // PATCH /api-v1-settings - Update settings
    if (req.method === 'PATCH' && pathParts.length === 1) {
      const updates = await req.json();

      const { data: updatedSettings, error } = await supabaseAdmin
        .from('alchemy_settings')
        .upsert(
          {
            user_id: user.id,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return createErrorResponse(500, 'Failed to update settings');
      }

      return createSuccessResponse({ settings: updatedSettings });
    }

    return createErrorResponse(405, 'Method not allowed');
  } catch (error) {
    console.error('Request error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
});
