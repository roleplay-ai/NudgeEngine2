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

  const { data: uc } = await supabase
    .from('user_cohorts')
    .select('buddy_user_id')
    .eq('user_id', user.id)
    .eq('cohort_id', cohortId)
    .single();

  if (!uc?.buddy_user_id) return NextResponse.json({ buddy: null });

  const { data: buddyUser } = await supabase
    .from('users')
    .select('id, name, email, avatar_url')
    .eq('id', uc.buddy_user_id)
    .single();

  return NextResponse.json({ buddy: buddyUser ?? null });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { cohort_id, buddy_user_id } = body;
  if (!cohort_id || !buddy_user_id) {
    return NextResponse.json({ error: 'cohort_id and buddy_user_id required' }, { status: 400 });
  }

  const [myEnrolled, theirEnrolled] = await Promise.all([
    isParticipantInCohort(supabase, user.id, cohort_id),
    isParticipantInCohort(supabase, buddy_user_id, cohort_id),
  ]);

  if (!myEnrolled || !theirEnrolled) {
    return NextResponse.json({ error: 'Both users must be enrolled in this cohort' }, { status: 403 });
  }

  await supabase.from('user_cohorts').update({ buddy_user_id }).eq('user_id', user.id).eq('cohort_id', cohort_id);
  await supabase.from('user_cohorts').update({ buddy_user_id: user.id }).eq('user_id', buddy_user_id).eq('cohort_id', cohort_id);

  return NextResponse.json({ success: true });
}
