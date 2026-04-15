import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { resource_id, status = 'read' } = body;

  if (!resource_id) return NextResponse.json({ error: 'resource_id required' }, { status: 400 });

  const { data: resource } = await supabase
    .from('resources')
    .select('id, cohort_id')
    .eq('id', resource_id)
    .single();

  if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 });

  const { data: existing } = await supabase
    .from('resource_tracking')
    .select('id')
    .eq('user_id', user.id)
    .eq('resource_id', resource_id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('resource_tracking')
      .update({ status, read_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('resource_tracking')
      .insert({ user_id: user.id, resource_id, status, read_at: new Date().toISOString() });
  }

  const { data: allResources } = await supabase
    .from('resources')
    .select('id')
    .eq('cohort_id', resource.cohort_id);

  const { data: readResources } = await supabase
    .from('resource_tracking')
    .select('resource_id')
    .eq('user_id', user.id)
    .eq('status', 'read')
    .in('resource_id', (allResources ?? []).map(r => r.id));

  const allDone = (allResources?.length ?? 0) > 0 && (readResources?.length ?? 0) >= (allResources?.length ?? 0);

  if (allDone) {
    await supabase
      .from('task_completions')
      .upsert(
        { user_id: user.id, cohort_id: resource.cohort_id, task_type: 'prereads', completed_at: new Date().toISOString() },
        { onConflict: 'user_id,cohort_id,task_type' }
      );
  }

  const { data: allTasks } = await supabase
    .from('task_completions')
    .select('task_type')
    .eq('user_id', user.id)
    .eq('cohort_id', resource.cohort_id);

  const readinessScore = 20 + (allTasks?.length ?? 0) * 20;

  return NextResponse.json({ all_done: allDone, readiness_score: readinessScore });
}
