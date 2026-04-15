import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cohortId = searchParams.get('cohort_id');
  if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

  const { data: enrolled } = await supabase
    .from('user_cohorts')
    .select('user_id, status, users(id, name, email, avatar_url)')
    .eq('cohort_id', cohortId)
    .eq('cohort_role', 'participant');

  const { data: allCompletions } = await supabase
    .from('task_completions')
    .select('user_id, task_type, completed_at')
    .eq('cohort_id', cohortId);

  const completionMap = new Map<string, { tasks: string[]; lastActive: string | null }>();
  for (const tc of (allCompletions ?? [])) {
    const entry = completionMap.get(tc.user_id) ?? { tasks: [], lastActive: null };
    entry.tasks.push(tc.task_type);
    if (!entry.lastActive || tc.completed_at > entry.lastActive) {
      entry.lastActive = tc.completed_at;
    }
    completionMap.set(tc.user_id, entry);
  }

  const participants = (enrolled ?? []).map(uc => {
    const entry = completionMap.get(uc.user_id) ?? { tasks: [], lastActive: null };
    const readiness = 20 + entry.tasks.length * 20;
    return {
      user: uc.users,
      completed_tasks: entry.tasks,
      readiness_score: readiness,
      last_active: entry.lastActive,
    };
  });

  const total = participants.length;
  const avgReadiness = total > 0 ? Math.round(participants.reduce((s, p) => s + p.readiness_score, 0) / total) : 0;
  const fullyReady = participants.filter(p => p.readiness_score >= 100).length;
  const notStarted = participants.filter(p => p.readiness_score <= 20).length;

  return NextResponse.json({
    participants,
    summary: { total, avg_readiness: avgReadiness, fully_ready: fullyReady, not_started: notStarted },
  });
}
