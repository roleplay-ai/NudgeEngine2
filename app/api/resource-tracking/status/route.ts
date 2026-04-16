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

  const { data: resources } = await supabase
    .from('resources')
    .select('id')
    .eq('cohort_id', cohortId);

  const ids = (resources ?? []).map(r => r.id);
  if (ids.length === 0) {
    return NextResponse.json({ read_ids: [] });
  }

  const { data: tracking } = await supabase
    .from('resource_tracking')
    .select('resource_id')
    .eq('user_id', user.id)
    .eq('status', 'read')
    .in('resource_id', ids);

  const read_ids = (tracking ?? []).map(t => t.resource_id);

  return NextResponse.json({ read_ids });
}
