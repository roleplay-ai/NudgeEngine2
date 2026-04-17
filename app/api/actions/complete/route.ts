import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { action_id } = body;
  if (!action_id) return NextResponse.json({ error: 'action_id required' }, { status: 400 });

  const { data: row } = await supabase
    .from('user_actions')
    .select('user_id, commitment_plan_id')
    .eq('id', action_id)
    .single();

  if (!row || row.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { data: action, error } = await supabase
    .from('user_actions')
    .update({ status: 'completed', completed_at: now })
    .eq('id', action_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cancel any pending nudge notifications for this action
  await supabase
    .from('notification_queue')
    .update({ status: 'sent', sent_at: now })
    .eq('user_action_id', action_id)
    .eq('status', 'pending');

  const { data: remaining } = await supabase
    .from('user_actions')
    .select('id, status')
    .eq('commitment_plan_id', row.commitment_plan_id)
    .neq('status', 'completed')
    .neq('status', 'skipped');

  const allDone = (remaining?.length ?? 0) === 0;

  return NextResponse.json({ action, all_done: allDone });
}
