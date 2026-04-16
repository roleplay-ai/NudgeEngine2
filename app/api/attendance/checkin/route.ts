import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isParticipantInCohort } from '@/lib/api/cohort-access';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { cohort_id } = body;

  if (!cohort_id) {
    return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });
  }

  const ok = await isParticipantInCohort(supabase, user.id, cohort_id);
  if (!ok) return NextResponse.json({ error: 'Not enrolled in this cohort' }, { status: 403 });

  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('attendance')
    .select('pre_confirmed')
    .eq('user_id', user.id)
    .eq('cohort_id', cohort_id)
    .maybeSingle();

  const { data: attendance, error } = await supabase
    .from('attendance')
    .upsert(
      {
        user_id: user.id,
        cohort_id: cohort_id,
        pre_confirmed: existing?.pre_confirmed ?? false,
        live_checkin: true,
        checkin_time: now,
      },
      { onConflict: 'user_id,cohort_id' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ attendance, message: 'Checked in!' });
}
