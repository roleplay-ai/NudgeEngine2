import { NextResponse, type NextRequest } from 'next/server';
import { createClient, getSessionUser } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cohortId = searchParams.get('cohort_id');
  if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('programmes(skills(id, name, description, sort_order))')
    .eq('id', cohortId)
    .single();

  const programme = cohort?.programmes as unknown as { skills: { id: string; name: string; description: string | null; sort_order: number }[] } | null;
  const skills = programme?.skills ?? [];

  return NextResponse.json({ skills });
}
