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
    .from('user_actions')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!row || row.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { status, custom_title, nudge_scheduled_date, completed_at } = body;

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (custom_title !== undefined) updates.custom_title = custom_title;
  if (nudge_scheduled_date !== undefined) updates.nudge_scheduled_date = nudge_scheduled_date;
  if (completed_at !== undefined) updates.completed_at = completed_at;

  const { data: action, error } = await supabase
    .from('user_actions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ action });
}
