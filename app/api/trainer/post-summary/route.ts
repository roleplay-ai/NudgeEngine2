import { NextResponse, type NextRequest } from 'next/server';
import { createClient, getSessionUser } from '@/lib/supabase/server';
import { canAccessCohortAsStaff } from '@/lib/api/cohort-access';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cohortId = searchParams.get('cohort_id');
  if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

  const ok = await canAccessCohortAsStaff(supabase, user.id, cohortId);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: userCohorts } = await supabase
    .from('user_cohorts')
    .select('user_id, users(id, name, email)')
    .eq('cohort_id', cohortId)
    .eq('cohort_role', 'participant');

  const participants = [];

  for (const uc of userCohorts ?? []) {
    const userId = uc.user_id;
    const userObj = uc.users as unknown as { id: string; name: string; email: string } | null;

    const { data: plan } = await supabase
      .from('commitment_plans')
      .select('id, main_commitment')
      .eq('user_id', userId)
      .eq('cohort_id', cohortId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let actionsTotal = 0;
    let actionsCompleted = 0;

    if (plan) {
      const { data: acts } = await supabase
        .from('user_actions')
        .select('status')
        .eq('commitment_plan_id', plan.id);
      actionsTotal = acts?.length ?? 0;
      actionsCompleted = acts?.filter(a => a.status === 'completed').length ?? 0;
    }

    const { data: conf } = await supabase
      .from('confidence_checkins')
      .select('confidence_score')
      .eq('user_id', userId)
      .eq('cohort_id', cohortId)
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    participants.push({
      user: userObj,
      commitment: plan?.main_commitment ?? null,
      actions_total: actionsTotal,
      actions_completed: actionsCompleted,
      completion_rate: actionsTotal > 0 ? Math.round((actionsCompleted / actionsTotal) * 100) : 0,
      latest_confidence: conf?.confidence_score ?? null,
    });
  }

  return NextResponse.json({ participants });
}
