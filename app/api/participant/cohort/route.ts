import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: userCohort } = await supabase
    .from('user_cohorts')
    .select(`
      id, user_id, cohort_id, cohort_role, status, buddy_user_id, enrolled_date,
      cohorts(
        id, name, training_date, training_time, location, status, max_participants,
        programmes(id, name, description),
        users!cohorts_trainer_user_id_fkey(id, name, avatar_url),
        cohort_phases(id, name, sequence_order)
      )
    `)
    .eq('user_id', user.id)
    .in('status', ['nominated', 'confirmed'])
    .order('enrolled_date', { ascending: false })
    .limit(1)
    .single();

  if (!userCohort) {
    return NextResponse.json({ cohort: null, user_cohort: null });
  }

  const cohort = userCohort.cohorts as unknown as Record<string, unknown>;
  const cohortId = cohort.id as string;

  const { data: completions } = await supabase
    .from('task_completions')
    .select('task_type')
    .eq('user_id', user.id)
    .eq('cohort_id', cohortId);

  const completedTasks = (completions ?? []).map((c: { task_type: string }) => c.task_type);
  const readinessScore = 20 + completedTasks.length * 20;

  const trainingDate = new Date(cohort.training_date as string);
  const today = new Date();
  const daysToTraining = Math.max(0, Math.ceil((trainingDate.getTime() - today.getTime()) / (86400000)));

  return NextResponse.json({
    cohort,
    user_cohort: { ...userCohort, cohorts: undefined },
    completed_tasks: completedTasks,
    readiness_score: readinessScore,
    days_to_training: daysToTraining,
    trainer: cohort.users ?? null,
    phases: (cohort.cohort_phases as unknown[]) ?? [],
  });
}
