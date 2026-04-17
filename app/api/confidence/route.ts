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

  const ok = await isParticipantInCohort(supabase, user.id, cohortId);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: checkins, error } = await supabase
    .from('confidence_checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('cohort_id', cohortId)
    .order('week_number', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const latest = checkins && checkins.length > 0 ? checkins[checkins.length - 1] : null;
  return NextResponse.json({ checkins: checkins ?? [], latest });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { cohort_id, confidence_score, reflection, week_number } = body;

  if (!cohort_id || confidence_score == null || week_number == null) {
    return NextResponse.json({ error: 'cohort_id, confidence_score, week_number are required' }, { status: 400 });
  }

  if (confidence_score < 1 || confidence_score > 10) {
    return NextResponse.json({ error: 'confidence_score must be 1–10' }, { status: 400 });
  }

  const ok = await isParticipantInCohort(supabase, user.id, cohort_id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: existing } = await supabase
    .from('confidence_checkins')
    .select('id')
    .eq('user_id', user.id)
    .eq('cohort_id', cohort_id)
    .eq('week_number', week_number)
    .maybeSingle();

  let checkin;
  if (existing) {
    const { data, error } = await supabase
      .from('confidence_checkins')
      .update({ confidence_score, reflection: reflection ?? null })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    checkin = data;
  } else {
    const { data, error } = await supabase
      .from('confidence_checkins')
      .insert({ user_id: user.id, cohort_id, confidence_score, reflection: reflection ?? null, week_number })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    checkin = data;
  }

  return NextResponse.json({ checkin });
}
