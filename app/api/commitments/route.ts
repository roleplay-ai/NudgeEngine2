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
  if (!ok) return NextResponse.json({ error: 'Not enrolled in this cohort' }, { status: 403 });

  const { data: plan } = await supabase
    .from('commitment_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('cohort_id', cohortId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ commitment_plan: null, actions: [] });
  }

  const { data: actions, error } = await supabase
    .from('user_actions')
    .select('*')
    .eq('commitment_plan_id', plan.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ commitment_plan: plan, actions: actions ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { cohort_id, main_commitment, why_text, blockers, phase_id } = body;

  if (!cohort_id || !main_commitment?.trim()) {
    return NextResponse.json({ error: 'cohort_id and main_commitment are required' }, { status: 400 });
  }

  if (main_commitment.length > 500) {
    return NextResponse.json({ error: 'main_commitment max 500 characters' }, { status: 400 });
  }

  const ok = await isParticipantInCohort(supabase, user.id, cohort_id);
  if (!ok) return NextResponse.json({ error: 'Not enrolled in this cohort' }, { status: 403 });

  const { data: existing } = await supabase
    .from('commitment_plans')
    .select('id')
    .eq('user_id', user.id)
    .eq('cohort_id', cohort_id)
    .maybeSingle();

  let plan;
  if (existing) {
    const { data, error } = await supabase
      .from('commitment_plans')
      .update({
        main_commitment: main_commitment.trim(),
        why_text: why_text ?? null,
        blockers: blockers ?? null,
        phase_id: phase_id ?? null,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    plan = data;
  } else {
    const { data, error } = await supabase
      .from('commitment_plans')
      .insert({
        user_id: user.id,
        cohort_id: cohort_id,
        main_commitment: main_commitment.trim(),
        why_text: why_text ?? null,
        blockers: blockers ?? null,
        phase_id: phase_id ?? null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    plan = data;
  }

  return NextResponse.json({ commitment_plan: plan });
}
