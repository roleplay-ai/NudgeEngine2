import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { task_type, cohort_id } = body;

  if (!task_type || !cohort_id) {
    return NextResponse.json({ error: 'task_type and cohort_id required' }, { status: 400 });
  }

  const validTypes = ['compare', 'shape', 'meet', 'prereads'];
  if (!validTypes.includes(task_type)) {
    return NextResponse.json({ error: 'Invalid task_type' }, { status: 400 });
  }

  const { data: uc } = await supabase
    .from('user_cohorts')
    .select('id')
    .eq('user_id', user.id)
    .eq('cohort_id', cohort_id)
    .single();

  if (!uc) return NextResponse.json({ error: 'Not enrolled in this cohort' }, { status: 403 });

  await supabase
    .from('task_completions')
    .upsert(
      { user_id: user.id, cohort_id, task_type, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,cohort_id,task_type' }
    );

  const { data: allTasks } = await supabase
    .from('task_completions')
    .select('task_type')
    .eq('user_id', user.id)
    .eq('cohort_id', cohort_id);

  const readinessScore = 20 + (allTasks?.length ?? 0) * 20;

  return NextResponse.json({ task_type, readiness_score: readinessScore });
}
