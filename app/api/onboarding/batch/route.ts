import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cohortId = searchParams.get('cohort_id');
  if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('cohort_onboarding')
    .select(`
      intro_message, intro_role, intro_team,
      users(id, name, avatar_url)
    `)
    .eq('cohort_id', cohortId)
    .not('intro_message', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const intros = (data ?? []).map(row => ({
    user: row.users,
    onboarding: {
      intro_message: row.intro_message,
      intro_role: row.intro_role,
      intro_team: row.intro_team,
    },
  }));

  return NextResponse.json({ intros });
}
