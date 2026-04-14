import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types';

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
  const includeCohorts = searchParams.get('include_cohorts') === 'true';

  let query = supabase
    .from('programmes')
    .select(`
      *,
      skills(id, name, description, sort_order),
      strategy_pillars(id, name, color)
      ${includeCohorts ? ', cohorts(id, name, status, training_date, trainer_user_id, max_participants)' : ''}
    `)
    .eq('company_id', callerUC.company_id)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ programmes: data ?? [] });
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
  const { name, description, strategy_pillar_id, settings, skills } = body;

  if (!name) {
    return NextResponse.json({ error: 'Programme name is required' }, { status: 400 });
  }

  if (strategy_pillar_id) {
    const { data: pillar } = await supabase
      .from('strategy_pillars')
      .select('id')
      .eq('id', strategy_pillar_id)
      .eq('company_id', callerUC.company_id)
      .single();

    if (!pillar) {
      return NextResponse.json({ error: 'Strategy pillar not found in your company' }, { status: 400 });
    }
  }

  const { data: programme, error: progErr } = await supabase
    .from('programmes')
    .insert({
      company_id: callerUC.company_id,
      name,
      description: description ?? null,
      strategy_pillar_id: strategy_pillar_id ?? null,
      settings: settings ?? {},
      created_by: user.id,
      status: 'active',
    })
    .select()
    .single();

  if (progErr) return NextResponse.json({ error: progErr.message }, { status: 500 });

  let createdSkills: unknown[] = [];
  if (skills?.length) {
    const skillRows = skills.map((s: { name: string; description?: string; sort_order: number }, i: number) => ({
      programme_id: programme.id,
      name: s.name,
      description: s.description ?? null,
      sort_order: s.sort_order ?? i,
    }));

    const { data: skillData, error: skillErr } = await supabase
      .from('skills')
      .insert(skillRows)
      .select();

    if (skillErr) return NextResponse.json({ error: skillErr.message }, { status: 500 });
    createdSkills = skillData ?? [];
  }

  return NextResponse.json({ programme, skills: createdSkills }, { status: 201 });
}
