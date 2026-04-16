import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isParticipantInCohort } from '@/lib/api/cohort-access';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cohortId = searchParams.get('cohort_id');
  if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

  const participant = await isParticipantInCohort(supabase, user.id, cohortId);
  if (!participant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: attendance, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('cohort_id', cohortId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ attendance: attendance ?? null });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { cohort_id, pre_confirmed } = body;

  if (!cohort_id || typeof pre_confirmed !== 'boolean') {
    return NextResponse.json({ error: 'cohort_id and pre_confirmed (boolean) required' }, { status: 400 });
  }

  const ok = await isParticipantInCohort(supabase, user.id, cohort_id);
  if (!ok) return NextResponse.json({ error: 'Not enrolled in this cohort' }, { status: 403 });

  const { data: existing } = await supabase
    .from('attendance')
    .select('live_checkin, checkin_time')
    .eq('user_id', user.id)
    .eq('cohort_id', cohort_id)
    .maybeSingle();

  const { data: attendance, error } = await supabase
    .from('attendance')
    .upsert(
      {
        user_id: user.id,
        cohort_id: cohort_id,
        pre_confirmed,
        live_checkin: existing?.live_checkin ?? false,
        checkin_time: existing?.checkin_time ?? null,
      },
      { onConflict: 'user_id,cohort_id' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ attendance });
}
