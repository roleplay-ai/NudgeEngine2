import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const programmeId = searchParams.get('programme_id');

  let query = supabase
    .from('cohorts')
    .select(`
      *,
      programmes(id, name),
      users!cohorts_trainer_user_id_fkey(id, name, avatar_url),
      user_cohorts(count)
    `)
    .eq('company_id', callerUC.company_id)
    .order('training_date', { ascending: false });

  if (status) query = query.eq('status', status);
  if (programmeId) query = query.eq('programme_id', programmeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ cohorts: data ?? [] });
}

export async function POST(request: NextRequest) {
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
  const { programme_id, name, trainer_user_id, training_date, training_time, location, max_participants } = body;

  if (!programme_id || !name || !trainer_user_id || !training_date) {
    return NextResponse.json({ error: 'programme_id, name, trainer_user_id, and training_date are required' }, { status: 400 });
  }

  const { data: programme } = await supabase
    .from('programmes')
    .select('id, company_id')
    .eq('id', programme_id)
    .single();

  if (!programme || programme.company_id !== callerUC.company_id) {
    return NextResponse.json({ error: 'Programme not found in your company' }, { status: 400 });
  }

  const { data: trainer } = await supabase
    .from('user_companies')
    .select('user_id')
    .eq('user_id', trainer_user_id)
    .eq('company_id', callerUC.company_id)
    .eq('role', 'trainer')
    .single();

  if (!trainer) {
    return NextResponse.json({ error: 'Trainer not found in your company' }, { status: 400 });
  }

  const { data: cohort, error: cohortErr } = await supabase
    .from('cohorts')
    .insert({
      programme_id,
      company_id: callerUC.company_id,
      name,
      trainer_user_id,
      training_date,
      training_time: training_time ?? null,
      location: location ?? null,
      status: 'draft',
      max_participants: max_participants ?? 30,
      created_by: user.id,
    })
    .select()
    .single();

  if (cohortErr) return NextResponse.json({ error: cohortErr.message }, { status: 500 });

  const phaseRows = [
    { cohort_id: cohort.id, name: 'Pre-Training', sequence_order: 1 },
    { cohort_id: cohort.id, name: 'Training Day', sequence_order: 2 },
    { cohort_id: cohort.id, name: 'Post-Training', sequence_order: 3 },
  ];

  // `cohort_phases` has RLS enabled with read-only policies; use service-role for server-side writes.
  const admin = createAdminClient();
  const { data: phases, error: phaseErr } = await admin
    .from('cohort_phases')
    .insert(phaseRows)
    .select();

  if (phaseErr) return NextResponse.json({ error: phaseErr.message }, { status: 500 });

  return NextResponse.json({ cohort, phases: phases ?? [] }, { status: 201 });
}
