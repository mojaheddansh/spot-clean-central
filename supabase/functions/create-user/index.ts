import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await supabaseClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: callerProfile } = await supabaseClient.from('profiles').select('role').eq('id', caller.id).single();
    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { action } = body;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // CREATE USER
    if (!action || action === 'create') {
      const { institution_number, password, full_name, role } = body;

      if (!institution_number || !password || !full_name || !role) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const validRoles = ['admin', 'manager', 'cleaner', 'user'];
      if (!validRoles.includes(role)) {
        return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const email = `${institution_number}@internal.local`;

      const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('institution_number', institution_number).maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: 'Institution number already exists' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authErr || !authData.user) {
        return new Response(JSON.stringify({ error: authErr?.message || 'Failed to create user' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
        id: authData.user.id,
        full_name,
        institution_number,
        role,
        email,
      });

      if (profileErr) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(JSON.stringify({ error: profileErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true, user_id: authData.user.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // UPDATE USER
    if (action === 'update') {
      const { user_id, full_name, institution_number, role, is_active, password } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Check institution_number uniqueness if changed
      if (institution_number) {
        const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('institution_number', institution_number).neq('id', user_id).maybeSingle();
        if (existing) {
          return new Response(JSON.stringify({ error: 'Institution number already in use' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // Update profile
      const profileUpdate: Record<string, any> = {};
      if (full_name !== undefined) profileUpdate.full_name = full_name;
      if (institution_number !== undefined) profileUpdate.institution_number = institution_number;
      if (role !== undefined) profileUpdate.role = role;
      if (is_active !== undefined) profileUpdate.is_active = is_active;
      if (institution_number !== undefined) profileUpdate.email = `${institution_number}@internal.local`;

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profileErr } = await supabaseAdmin.from('profiles').update(profileUpdate).eq('id', user_id);
        if (profileErr) {
          return new Response(JSON.stringify({ error: profileErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // Update auth email if institution_number changed
      if (institution_number) {
        await supabaseAdmin.auth.admin.updateUserById(user_id, {
          email: `${institution_number}@internal.local`,
        });
      }

      // Update password if provided
      if (password && password.length >= 6) {
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
        if (pwErr) {
          return new Response(JSON.stringify({ error: pwErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
