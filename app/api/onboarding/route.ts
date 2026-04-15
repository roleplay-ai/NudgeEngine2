import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cohortId = searchParams.get('cohort_id');
  if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

  const { data } = await supabase
    .from('cohort_onboarding')
    .select('*')
    .eq('user_id', user.id)
    .eq('cohort_id', cohortId)
    .maybeSingle();

  return NextResponse.json({ onboarding: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { cohort_id, expectations, intro_message, intro_role, intro_team, session_goals } = body;

  if (!cohort_id) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

  const { data: uc } = await supabase
    .from('user_cohorts')
    .select('id')
    .eq('user_id', user.id)
    .eq('cohort_id', cohort_id)
    .single();

  if (!uc) return NextResponse.json({ error: 'Not enrolled in this cohort' }, { status: 403 });

  const { data: existing } = await supabase
    .from('cohort_onboarding')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('cohort_id', cohort_id)
    .maybeSingle();

  const fields: Record<string, unknown> = {};
  if (expectations !== undefined) fields.expectations = expectations;
  if (intro_message !== undefined) fields.intro_message = intro_message;
  if (intro_role !== undefined) fields.intro_role = intro_role;
  if (intro_team !== undefined) fields.intro_team = intro_team;
  if (session_goals !== undefined) fields.session_goals = session_goals;

  let onboarding;
  if (existing) {
    const { data, error } = await supabase
      .from('cohort_onboarding')
      .update(fields)
      .eq('user_id', user.id)
      .eq('cohort_id', cohort_id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    onboarding = data;
  } else {
    const { data, error } = await supabase
      .from('cohort_onboarding')
      .insert({ user_id: user.id, cohort_id, ...fields })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    onboarding = data;
  }

  return NextResponse.json({ onboarding });
}
