import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft:     ['scheduled'],
  scheduled: ['live'],
  live:      ['completed'],
  completed: [],
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: cohort, error } = await supabase
    .from('cohorts')
    .select(`
      *,
      programmes(id, name, description, strategy_pillar_id),
      users!cohorts_trainer_user_id_fkey(id, name, email, avatar_url),
      cohort_phases(id, name, sequence_order),
      user_cohorts(
        id, user_id, cohort_role, status, enrolled_date,
        users(id, name, email, avatar_url, phone)
      ),
      resources(id, title, type, file_url, duration_minutes, sort_order)
    `)
    .eq('id', id)
    .single();

  if (error || !cohort) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
  }

  return NextResponse.json({ cohort });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const body = await request.json();
  const { status, name, trainer_user_id, training_date, training_time, location, max_participants } = body;

  if (status) {
    const { data: current } = await supabase
      .from('cohorts')
      .select('status')
      .eq('id', id)
      .single();

    if (!current) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });

    const allowed = VALID_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json({
        error: `Cannot transition from ${current.status} to ${status}`,
      }, { status: 400 });
    }
  }

  const updateFields: Record<string, unknown> = {};
  if (status !== undefined) updateFields.status = status;
  if (name !== undefined) updateFields.name = name;
  if (trainer_user_id !== undefined) updateFields.trainer_user_id = trainer_user_id;
  if (training_date !== undefined) updateFields.training_date = training_date;
  if (training_time !== undefined) updateFields.training_time = training_time;
  if (location !== undefined) updateFields.location = location;
  if (max_participants !== undefined) updateFields.max_participants = max_participants;

  const { data: cohort, error } = await supabase
    .from('cohorts')
    .update(updateFields)
    .eq('id', id)
    .eq('company_id', callerUC.company_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ cohort });
}
