import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cohortId = searchParams.get('cohort_id');
  if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

  const { data: batchMessages } = await supabase
    .from('messages')
    .select('*, users!messages_sender_id_fkey(id, name, avatar_url)')
    .eq('cohort_id', cohortId)
    .eq('is_batch', true)
    .order('created_at', { ascending: false });

  const { data: directMessages } = await supabase
    .from('messages')
    .select('*, users!messages_sender_id_fkey(id, name, avatar_url)')
    .eq('cohort_id', cohortId)
    .eq('is_batch', false)
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    batch_messages: batchMessages ?? [],
    direct_messages: directMessages ?? [],
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { cohort_id, content, recipient_id, is_batch } = body;

  if (!cohort_id || !content?.trim()) {
    return NextResponse.json({ error: 'cohort_id and content are required' }, { status: 400 });
  }

  const { data: callerUC } = await supabase
    .from('user_companies')
    .select('role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const role = callerUC?.role;

  if (is_batch && role !== 'trainer') {
    return NextResponse.json({ error: 'Only trainers can send batch messages' }, { status: 403 });
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      cohort_id,
      sender_id: user.id,
      recipient_id: is_batch ? null : (recipient_id ?? null),
      content: content.trim(),
      is_batch: !!is_batch,
    })
    .select('*, users!messages_sender_id_fkey(id, name, avatar_url)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message }, { status: 201 });
}
