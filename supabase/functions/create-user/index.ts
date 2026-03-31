import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await supabaseClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Check admin role
    const { data: callerProfile } = await supabaseClient.from('profiles').select('role').eq('id', caller.id).single();
    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { institution_number, password, full_name, role } = body;

    if (!institution_number || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
    }

    const validRoles = ['admin', 'manager', 'cleaner', 'user'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400, headers: corsHeaders });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const email = `${institution_number}@internal.local`;

    // Check if institution number already exists
    const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('institution_number', institution_number).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: 'Institution number already exists' }), { status: 409, headers: corsHeaders });
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: authErr?.message || 'Failed to create user' }), { status: 500, headers: corsHeaders });
    }

    // Create profile
    const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
      full_name,
      institution_number,
      role,
      email,
    });

    if (profileErr) {
      // Cleanup: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: profileErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, user_id: authData.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
