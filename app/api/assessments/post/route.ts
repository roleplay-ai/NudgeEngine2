import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isParticipantInCohort } from '@/lib/api/cohort-access';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { cohort_id, skill_id, rating_score, reflection } = body;

  if (!cohort_id || !skill_id || rating_score == null) {
    return NextResponse.json({ error: 'cohort_id, skill_id, rating_score required' }, { status: 400 });
  }
  if (rating_score < 1 || rating_score > 5) {
    return NextResponse.json({ error: 'rating_score must be 1–5' }, { status: 400 });
  }

  const ok = await isParticipantInCohort(supabase, user.id, cohort_id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: existing } = await supabase
    .from('self_assessments')
    .select('id, rating_score')
    .eq('user_id', user.id)
    .eq('cohort_id', cohort_id)
    .eq('skill_id', skill_id)
    .eq('phase', 'post')
    .maybeSingle();

  let assessment;
  if (existing) {
    const { data, error } = await supabase
      .from('self_assessments')
      .update({ rating_score, reflection: reflection ?? null })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    assessment = data;
  } else {
    const { data, error } = await supabase
      .from('self_assessments')
      .insert({ user_id: user.id, cohort_id, skill_id, phase: 'post', rating_score, reflection: reflection ?? null })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    assessment = data;
  }

  const preRow = await supabase
    .from('self_assessments')
    .select('rating_score')
    .eq('user_id', user.id)
    .eq('cohort_id', cohort_id)
    .eq('skill_id', skill_id)
    .eq('phase', 'pre')
    .maybeSingle();

  const preRating = preRow.data?.rating_score ?? null;
  const growth = preRating != null ? rating_score - preRating : null;

  return NextResponse.json({ assessment, growth });
}
