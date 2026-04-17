import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canAccessCohortAsStaff } from '@/lib/api/cohort-access';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cohortId = searchParams.get('cohort_id');
  if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

  const { data: nudges, error } = await supabase
    .from('nudges')
    .select('*, skills(id, name)')
    .eq('cohort_id', cohortId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ nudges: nudges ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { cohort_id, skill_id, what, how, why, time_minutes, scheduled_date } = body;

  if (!cohort_id || !what?.trim()) {
    return NextResponse.json({ error: 'cohort_id and what are required' }, { status: 400 });
  }

  const staff = await canAccessCohortAsStaff(supabase, user.id, cohort_id);
  if (!staff) return NextResponse.json({ error: 'Forbidden — trainers only' }, { status: 403 });

  const { data: nudge, error } = await supabase
    .from('nudges')
    .insert({
      cohort_id,
      skill_id: skill_id ?? null,
      what: what.trim(),
      how: how ?? null,
      why: why ?? null,
      time_minutes: time_minutes ?? 5,
      scheduled_date: scheduled_date ?? null,
      created_by: user.id,
    })
    .select('*, skills(id, name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If scheduled, queue notification for all enrolled participants
  if (scheduled_date && nudge) {
    const { data: participants } = await supabase
      .from('user_cohorts')
      .select('user_id')
      .eq('cohort_id', cohort_id)
      .eq('cohort_role', 'participant');

    const scheduledFor = new Date(`${scheduled_date}T09:00:00`).toISOString();
    const emailSubject = `New nudge from your trainer: ${nudge.what.slice(0, 60)}`;
    const emailBody = [
      `<h2>Today's Nudge 💡</h2>`,
      `<p><strong>What:</strong> ${nudge.what}</p>`,
      nudge.how ? `<p><strong>How:</strong> ${nudge.how}</p>` : '',
      nudge.why ? `<p><strong>Why:</strong> ${nudge.why}</p>` : '',
      `<p><em>Estimated time: ${nudge.time_minutes} min</em></p>`,
    ].filter(Boolean).join('');

    if (participants && participants.length > 0) {
      await supabase.from('notification_queue').insert(
        participants.map(p => ({
          user_id: p.user_id,
          nudge_id: nudge.id,
          channel: 'email',
          email_subject: emailSubject,
          email_body: emailBody,
          scheduled_for: scheduledFor,
          status: 'pending',
        }))
      );
    }
  }

  return NextResponse.json({ nudge }, { status: 201 });
}
