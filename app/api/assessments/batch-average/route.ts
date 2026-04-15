import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cohortId = searchParams.get('cohort_id');
  const skillId = searchParams.get('skill_id');
  const phase = searchParams.get('phase') ?? 'pre';

  if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

  let query = supabase
    .from('self_assessments')
    .select('rating_score')
    .eq('cohort_id', cohortId)
    .eq('phase', phase);

  if (skillId) {
    query = query.eq('skill_id', skillId);
  } else {
    query = query.is('skill_id', null);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ratings = data ?? [];

  if (ratings.length < 3) {
    return NextResponse.json({
      average: null,
      count: ratings.length,
      distribution: null,
      message: 'Need at least 3 responses to show averages',
    });
  }

  const sum = ratings.reduce((acc, r) => acc + r.rating_score, 0);
  const average = Math.round((sum / ratings.length) * 10) / 10;

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) {
    distribution[r.rating_score] = (distribution[r.rating_score] ?? 0) + 1;
  }

  return NextResponse.json({ average, count: ratings.length, distribution });
}
