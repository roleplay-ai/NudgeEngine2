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

  const enrolled = await isParticipantInCohort(supabase, user.id, cohortId);
  if (!enrolled) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [
    { data: participant },
    { data: plan },
    { data: cohortRow },
    { data: confidenceRows },
    { data: userCohortRow },
  ] = await Promise.all([
    supabase.from('users').select('id, name, email, avatar_url').eq('id', user.id).single(),
    supabase.from('commitment_plans').select('*').eq('user_id', user.id).eq('cohort_id', cohortId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('cohorts').select('training_date, programmes(id, name, skills(id, name, description, sort_order))').eq('id', cohortId).single(),
    supabase.from('confidence_checkins').select('*').eq('user_id', user.id).eq('cohort_id', cohortId).order('week_number', { ascending: true }),
    supabase.from('user_cohorts').select('buddy_user_id').eq('user_id', user.id).eq('cohort_id', cohortId).single(),
  ]);

  let actions: Record<string, unknown>[] = [];
  if (plan) {
    const { data: acts } = await supabase
      .from('user_actions')
      .select('*, skills(id, name)')
      .eq('commitment_plan_id', plan.id)
      .order('created_at', { ascending: true });
    actions = acts ?? [];
  }

  const total = actions.length;
  const completed = actions.filter(a => a.status === 'completed').length;
  const inProgress = actions.filter(a => a.status === 'in_progress').length;
  const pending = actions.filter(a => a.status === 'pending').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const cohortData = cohortRow as unknown as { training_date: string; programmes: { skills: { id: string; name: string; description: string | null; sort_order: number }[] } | null } | null;
  const skills = cohortData?.programmes?.skills ?? [];

  const preAssessments: Record<string, number> = {};
  const postAssessments: Record<string, number> = {};

  if (skills.length > 0) {
    const { data: allAssessments } = await supabase
      .from('self_assessments')
      .select('skill_id, rating_score, phase')
      .eq('user_id', user.id)
      .eq('cohort_id', cohortId)
      .in('skill_id', skills.map(s => s.id));

    for (const a of allAssessments ?? []) {
      if (a.phase === 'pre') preAssessments[a.skill_id] = a.rating_score;
      else if (a.phase === 'post') postAssessments[a.skill_id] = a.rating_score;
    }
  }

  const skillJourney = skills.map(s => ({
    skill: s,
    pre_rating: preAssessments[s.id] ?? null,
    post_rating: postAssessments[s.id] ?? null,
    growth: preAssessments[s.id] != null && postAssessments[s.id] != null
      ? postAssessments[s.id] - preAssessments[s.id]
      : null,
  }));

  const trainingDate = cohortData?.training_date ? new Date(cohortData.training_date) : null;
  const daysSince = trainingDate
    ? Math.max(0, Math.floor((Date.now() - trainingDate.getTime()) / 86400000))
    : 0;

  const checkins = confidenceRows ?? [];
  const latestConfidence = checkins.length > 0 ? checkins[checkins.length - 1] : null;

  const avgGrowth = skillJourney.filter(s => s.growth !== null).reduce((sum, s) => sum + (s.growth ?? 0), 0) / Math.max(1, skillJourney.filter(s => s.growth !== null).length);
  const growthScore = Math.round(completionRate * 0.5 + (latestConfidence?.confidence_score ?? 5) * 5 + Math.max(0, avgGrowth) * 5);

  let buddy = null;
  if (userCohortRow?.buddy_user_id) {
    const { data: buddyUser } = await supabase.from('users').select('id, name, email, avatar_url').eq('id', userCohortRow.buddy_user_id).single();
    const { data: buddyCohort } = await supabase.from('user_cohorts').select('*').eq('user_id', userCohortRow.buddy_user_id).eq('cohort_id', cohortId).single();
    if (buddyUser) buddy = { user: buddyUser, cohort_data: buddyCohort };
  }

  return NextResponse.json({
    participant,
    commitment_plan: plan,
    actions,
    action_stats: { total, completed, in_progress: inProgress, pending, completion_rate: completionRate },
    skill_journey: skillJourney,
    confidence_checkins: checkins,
    latest_confidence: latestConfidence,
    buddy,
    days_since_training: daysSince,
    growth_score: Math.min(100, growthScore),
  });
}
