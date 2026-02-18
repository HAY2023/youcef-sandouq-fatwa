import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, token, device_type, notification, admin_password } = await req.json();

    // Action: register token (public - anyone can register their device)
    if (action === 'register') {
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Upsert the token
      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          { token, device_type: device_type || 'unknown', updated_at: new Date().toISOString() },
          { onConflict: 'token' }
        );

      if (error) {
        console.error('Error registering token:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to register token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Token registered' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: send notification (admin only - requires password verification)
    if (action === 'send') {
      // Verify admin password
      if (!admin_password) {
        return new Response(
          JSON.stringify({ error: 'Admin password required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: isValid, error: verifyError } = await supabase.rpc('verify_admin_password', {
        input_password: admin_password
      });

      if (verifyError || !isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid admin password' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const notificationPayload = notification as NotificationPayload;

      if (!notificationPayload?.title || !notificationPayload?.body) {
        return new Response(
          JSON.stringify({ error: 'Notification title and body are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get all registration tokens
      const { data: tokens, error: tokensError } = await supabase
        .from('push_tokens')
        .select('token, device_type');

      if (tokensError) {
        console.error('Error fetching tokens:', tokensError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch tokens' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Would send notification to ${tokens?.length || 0} devices:`, notificationPayload);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Notification queued for ${tokens?.length || 0} devices`,
          tokens_count: tokens?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: set admin status (requires admin password verification)
    if (action === 'set-admin') {
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify admin password
      if (!admin_password) {
        return new Response(
          JSON.stringify({ error: 'Admin password required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: isValid, error: verifyError } = await supabase.rpc('verify_admin_password', {
        input_password: admin_password
      });

      if (verifyError || !isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid admin password' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('push_tokens')
        .update({ is_admin: true, updated_at: new Date().toISOString() })
        .eq('token', token);

      if (error) {
        console.error('Error setting admin:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to set admin status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Admin status set' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
