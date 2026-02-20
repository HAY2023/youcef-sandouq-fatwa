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

      // Get all admin tokens
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

      console.log(`Sending notification to ${tokens?.length || 0} devices:`, notificationPayload);

      // Check for FCM Server Key
      const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

      let successCount = 0;
      let failureCount = 0;

      if (fcmServerKey && tokens && tokens.length > 0) {
        // Send to FCM (Legacy API for simplicity in Deno without external libs)
        // Note: For production at scale, consider using a queue or batch sending
        const results = await Promise.all(tokens.map(async (t) => {
          try {
            const res = await fetch('https://fcm.googleapis.com/fcm/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${fcmServerKey}`
              },
              body: JSON.stringify({
                to: t.token,
                notification: {
                  title: notificationPayload.title,
                  body: notificationPayload.body,
                  sound: 'default'
                },
                data: notificationPayload.data || {}
              })
            });

            if (res.ok) return true;
            else {
              const text = await res.text();
              console.error(`FCM Error for token ${t.token.slice(0, 10)}...:`, text);
              return false;
            }
          } catch (e) {
            console.error(`Fetch Error for token ${t.token.slice(0, 10)}...:`, e);
            return false;
          }
        }));

        successCount = results.filter(r => r).length;
        failureCount = results.filter(r => !r).length;
      } else {
        console.warn('FCM_SERVER_KEY not set or no tokens found. Skipping actual FCM send.');
        // If testing without key, we treat it as "queued"
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: fcmServerKey
            ? `Sent to ${successCount} devices, failed ${failureCount}`
            : `Notification queued (Hypothetically) for ${tokens?.length || 0} devices. Set FCM_SERVER_KEY to really send.`,
          tokens_count: tokens?.length || 0,
          sent_count: successCount
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
