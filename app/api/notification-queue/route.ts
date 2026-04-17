import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id') ?? user.id;

  const { data: notifications, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: notifications ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { user_id, channel, email_subject, email_body, scheduled_for, user_action_id, nudge_id } = body;

  if (!user_id || !channel || !scheduled_for) {
    return NextResponse.json({ error: 'user_id, channel, scheduled_for required' }, { status: 400 });
  }

  const { data: notification, error } = await supabase
    .from('notification_queue')
    .insert({
      user_id,
      channel,
      email_subject: email_subject ?? null,
      email_body: email_body ?? null,
      scheduled_for,
      user_action_id: user_action_id ?? null,
      nudge_id: nudge_id ?? null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notification }, { status: 201 });
}
