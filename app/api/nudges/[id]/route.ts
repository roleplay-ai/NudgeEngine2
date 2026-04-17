import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: row } = await supabase
    .from('nudges')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!row || row.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { what, how, why, time_minutes, scheduled_date, skill_id } = body;

  const updates: Record<string, unknown> = {};
  if (what !== undefined) updates.what = what;
  if (how !== undefined) updates.how = how;
  if (why !== undefined) updates.why = why;
  if (time_minutes !== undefined) updates.time_minutes = time_minutes;
  if (scheduled_date !== undefined) updates.scheduled_date = scheduled_date;
  if (skill_id !== undefined) updates.skill_id = skill_id;

  const { data: nudge, error } = await supabase
    .from('nudges')
    .update(updates)
    .eq('id', id)
    .select('*, skills(id, name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ nudge });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: row } = await supabase
    .from('nudges')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!row || row.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await supabase.from('notification_queue').delete().eq('nudge_id', id).eq('status', 'pending');
  const { error } = await supabase.from('nudges').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
