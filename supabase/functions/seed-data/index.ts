import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const demoUsers = [
    { institution_number: '10000001', password: 'Admin123!', full_name: 'Admin User', role: 'admin' },
    { institution_number: '10000002', password: 'Manager123!', full_name: 'Manager User', role: 'manager' },
    { institution_number: '10000003', password: 'Cleaner123!', full_name: 'Cleaner One', role: 'cleaner' },
    { institution_number: '10000004', password: 'Cleaner123!', full_name: 'Cleaner Two', role: 'cleaner' },
    { institution_number: '10000005', password: 'User123!', full_name: 'User One', role: 'user' },
    { institution_number: '10000006', password: 'User123!', full_name: 'User Two', role: 'user' },
    { institution_number: '10000007', password: 'User123!', full_name: 'User Three', role: 'user' },
  ];

  const createdUsers: any[] = [];

  for (const u of demoUsers) {
    const email = `${u.institution_number}@internal.local`;
    const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('institution_number', u.institution_number).maybeSingle();
    if (existing) { createdUsers.push({ ...u, id: existing.id, skipped: true }); continue; }

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email, password: u.password, email_confirm: true,
    });
    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: authErr?.message, user: u }), { status: 500, headers: corsHeaders });
    }

    await supabaseAdmin.from('profiles').insert({
      id: authData.user.id, full_name: u.full_name,
      institution_number: u.institution_number, role: u.role, email,
    });
    createdUsers.push({ ...u, id: authData.user.id });
  }

  // Create rooms
  const admin = createdUsers.find(u => u.role === 'admin');
  const manager = createdUsers.find(u => u.role === 'manager');
  const cleaner1 = createdUsers.find(u => u.full_name === 'Cleaner One');
  const cleaner2 = createdUsers.find(u => u.full_name === 'Cleaner Two');

  const { data: existingRooms } = await supabaseAdmin.from('rooms').select('id');
  if (!existingRooms?.length) {
    const rooms = [
      { building: 'A', floor: '1', room_number: 'A101', room_name: 'Lecture Hall A101', room_type: 'classroom', manager_id: manager?.id, cleaner_id: cleaner1?.id },
      { building: 'A', floor: '1', room_number: 'A102', room_name: 'Faculty Office A102', room_type: 'office', manager_id: manager?.id, cleaner_id: cleaner1?.id },
      { building: 'B', floor: '2', room_number: 'B201', room_name: 'Conference Room B201', room_type: 'meeting_room', manager_id: manager?.id, cleaner_id: cleaner2?.id },
      { building: 'B', floor: '2', room_number: 'B202', room_name: 'Chemistry Lab B202', room_type: 'laboratory', manager_id: manager?.id, cleaner_id: cleaner2?.id },
      { building: 'C', floor: '3', room_number: 'C301', room_name: 'Restroom C301', room_type: 'toilet_wc', manager_id: manager?.id, cleaner_id: cleaner1?.id },
      { building: 'C', floor: '3', room_number: 'C302', room_name: 'Main Corridor C302', room_type: 'corridor', manager_id: manager?.id, cleaner_id: cleaner2?.id },
    ];
    const { data: createdRooms } = await supabaseAdmin.from('rooms').insert(rooms).select();

    if (createdRooms?.length) {
      // Seed complaints
      const user1 = createdUsers.find(u => u.full_name === 'User One');
      const complaints = [
        { room_id: createdRooms[0].id, user_id: user1?.id, complaint_type: 'dirty_floor', priority: 'high', description: 'Floor is very dirty after morning classes', status: 'new' },
        { room_id: createdRooms[0].id, guest_name: 'Visitor', complaint_type: 'trash_full', priority: 'medium', description: 'Trash bins are overflowing', status: 'in_review' },
        { room_id: createdRooms[4].id, complaint_type: 'dirty_toilet', priority: 'high', description: 'Toilet needs urgent cleaning', status: 'new' },
        { room_id: createdRooms[2].id, user_id: user1?.id, complaint_type: 'dirty_desk', priority: 'low', description: 'Desks have stains', status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: manager?.id },
      ];
      await supabaseAdmin.from('complaints').insert(complaints);

      // Seed cleaning records
      const { data: cleanRec } = await supabaseAdmin.from('cleaning_records').insert([
        { room_id: createdRooms[0].id, cleaner_id: cleaner1?.id, notes: 'Regular morning cleaning', status: 'completed' },
        { room_id: createdRooms[4].id, cleaner_id: cleaner1?.id, notes: 'Deep clean done', status: 'completed' },
      ]).select();

      if (cleanRec) {
        await supabaseAdmin.from('cleaning_record_items').insert([
          { cleaning_record_id: cleanRec[0].id, item_name: 'floor_cleaning', is_checked: true },
          { cleaning_record_id: cleanRec[0].id, item_name: 'wipe_desks', is_checked: true },
          { cleaning_record_id: cleanRec[0].id, item_name: 'empty_trash', is_checked: true },
          { cleaning_record_id: cleanRec[1].id, item_name: 'toilet_cleaning', is_checked: true },
          { cleaning_record_id: cleanRec[1].id, item_name: 'floor_cleaning', is_checked: true },
        ]);
      }

      // Seed timeline
      await supabaseAdmin.from('room_timelines').insert([
        { room_id: createdRooms[0].id, event_type: 'complaint_created', user_id: user1?.id, description: 'Complaint: dirty floor reported' },
        { room_id: createdRooms[0].id, event_type: 'cleaning_done', user_id: cleaner1?.id, description: 'Morning cleaning completed' },
        { room_id: createdRooms[4].id, event_type: 'complaint_created', description: 'Anonymous complaint: dirty toilet' },
        { room_id: createdRooms[4].id, event_type: 'cleaning_done', user_id: cleaner1?.id, description: 'Deep cleaning completed' },
      ]);

      // Seed notifications
      if (manager?.id) {
        await supabaseAdmin.from('notifications').insert([
          { user_id: manager.id, type: 'complaint', title: 'New Complaint', message: 'New complaint in Lecture Hall A101: dirty floor', channel: 'in_app' },
          { user_id: manager.id, type: 'complaint', title: 'Urgent Complaint', message: 'Urgent complaint in Restroom C301: dirty toilet', channel: 'in_app' },
        ]);
      }
    }
  }

  return new Response(JSON.stringify({ success: true, users: createdUsers.map(u => ({ institution_number: u.institution_number, role: u.role, password: u.skipped ? '(already exists)' : u.password })) }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
