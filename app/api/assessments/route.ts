import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cohortId = searchParams.get('cohort_id');
  const phase = searchParams.get('phase');

  if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

  let query = supabase
    .from('self_assessments')
    .select('*')
    .eq('cohort_id', cohortId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (phase) query = query.eq('phase', phase);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ assessments: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { cohort_id, skill_id, rating_score, reflection_notes, phase } = body;

  if (!cohort_id || rating_score === undefined || !phase) {
    return NextResponse.json({ error: 'cohort_id, rating_score, and phase are required' }, { status: 400 });
  }

  if (rating_score < 1 || rating_score > 5) {
    return NextResponse.json({ error: 'rating_score must be 1–5' }, { status: 400 });
  }

  const { data: uc } = await supabase
    .from('user_cohorts')
    .select('id')
    .eq('user_id', user.id)
    .eq('cohort_id', cohort_id)
    .single();

  if (!uc) return NextResponse.json({ error: 'Not enrolled in this cohort' }, { status: 403 });

  const { data: existing } = await supabase
    .from('self_assessments')
    .select('id')
    .eq('user_id', user.id)
    .eq('cohort_id', cohort_id)
    .eq('phase', phase)
    .is('skill_id', skill_id ?? null)
    .maybeSingle();

  let assessment;
  if (existing) {
    const { data, error } = await supabase
      .from('self_assessments')
      .update({ rating_score, reflection_notes: reflection_notes ?? null })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    assessment = data;
  } else {
    const { data, error } = await supabase
      .from('self_assessments')
      .insert({
        user_id: user.id,
        cohort_id,
        skill_id: skill_id ?? null,
        rating_score,
        reflection_notes: reflection_notes ?? null,
        phase,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    assessment = data;
  }

  return NextResponse.json({ assessment });
}
