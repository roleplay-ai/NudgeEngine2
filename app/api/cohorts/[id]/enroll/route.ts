import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: cohortId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: callerUC } = await supabase
    .from('user_companies')
    .select('role, company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!callerUC || !['superadmin', 'hr'].includes(callerUC.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('id, company_id, max_participants')
    .eq('id', cohortId)
    .eq('company_id', callerUC.company_id)
    .single();

  if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });

  const body = await request.json();
  const { user_ids, cohort_role = 'participant' } = body;

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return NextResponse.json({ error: 'user_ids array is required' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('user_cohorts')
    .select('user_id')
    .eq('cohort_id', cohortId);

  const existingIds = new Set((existing ?? []).map(e => e.user_id));
  const newUserIds = user_ids.filter((uid: string) => !existingIds.has(uid));

  if (newUserIds.length === 0) {
    return NextResponse.json({
      enrolled: 0,
      already_enrolled: user_ids.length,
      errors: [],
    });
  }

  const rows = newUserIds.map((uid: string) => ({
    user_id: uid,
    cohort_id: cohortId,
    cohort_role,
    status: 'nominated',
    enrolled_date: new Date().toISOString().split('T')[0],
  }));

  const { error: insertErr } = await supabase.from('user_cohorts').insert(rows);

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({
    enrolled: newUserIds.length,
    already_enrolled: user_ids.length - newUserIds.length,
    errors: [],
  });
}
