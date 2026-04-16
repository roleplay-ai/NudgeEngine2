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

  const staff = await canAccessCohortAsStaff(supabase, user.id, cohortId);
  if (!staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: enrolled, error: enrErr } = await supabase
    .from('user_cohorts')
    .select('user_id, users(id, name, email, avatar_url)')
    .eq('cohort_id', cohortId)
    .eq('cohort_role', 'participant');

  if (enrErr) return NextResponse.json({ error: enrErr.message }, { status: 500 });

  const userIds = (enrolled ?? []).map((e: { user_id: string }) => e.user_id);

  if (userIds.length === 0) {
    return NextResponse.json({
      participants: [],
      stats: { total_enrolled: 0, pre_confirmed: 0, checked_in: 0, committed: 0 },
    });
  }

  const { data: attendanceRows } = await supabase
    .from('attendance')
    .select('*')
    .eq('cohort_id', cohortId)
    .in('user_id', userIds);

  const attMap = new Map((attendanceRows ?? []).map(a => [a.user_id, a]));

  const { data: plans } = await supabase
    .from('commitment_plans')
    .select('id, user_id')
    .eq('cohort_id', cohortId)
    .in('user_id', userIds);

  const planByUser = new Map((plans ?? []).map(p => [p.user_id, p.id]));
  const planIds = (plans ?? []).map(p => p.id);

  let actionCounts = new Map<string, number>();
  if (planIds.length > 0) {
    const { data: actions } = await supabase
      .from('user_actions')
      .select('commitment_plan_id')
      .in('commitment_plan_id', planIds);

    const countByPlan = new Map<string, number>();
    for (const a of actions ?? []) {
      countByPlan.set(a.commitment_plan_id, (countByPlan.get(a.commitment_plan_id) ?? 0) + 1);
    }
    for (const [uid, pid] of planByUser) {
      actionCounts.set(uid, countByPlan.get(pid) ?? 0);
    }
  }

  const participants = (enrolled ?? []).map((uc: { user_id: string; users: unknown }) => {
    const att = attMap.get(uc.user_id);
    const pid = planByUser.get(uc.user_id);
    return {
      user: uc.users,
      attendance: att ?? {
        user_id: uc.user_id,
        cohort_id: cohortId,
        pre_confirmed: false,
        live_checkin: false,
        checkin_time: null,
      },
      has_commitment: !!pid,
      action_count: actionCounts.get(uc.user_id) ?? 0,
    };
  });

  const totalEnrolled = participants.length;
  const preConfirmed = participants.filter(p => p.attendance.pre_confirmed).length;
  const checkedIn = participants.filter(p => p.attendance.live_checkin).length;
  const committed = participants.filter(p => p.has_commitment).length;

  return NextResponse.json({
    participants,
    stats: {
      total_enrolled: totalEnrolled,
      pre_confirmed: preConfirmed,
      checked_in: checkedIn,
      committed,
    },
  });
}
