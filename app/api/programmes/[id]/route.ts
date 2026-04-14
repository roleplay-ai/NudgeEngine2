import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: programme, error } = await supabase
    .from('programmes')
    .select(`
      *,
      skills(id, name, description, sort_order),
      strategy_pillars(id, name, color),
      cohorts(
        id, name, status, training_date, training_time, location, max_participants, trainer_user_id,
        user_cohorts(count)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !programme) {
    return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
  }

  return NextResponse.json({ programme });
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
  const { name, description, strategy_pillar_id, status, settings, skills } = body;

  const updateFields: Record<string, unknown> = {};
  if (name !== undefined) updateFields.name = name;
  if (description !== undefined) updateFields.description = description;
  if (strategy_pillar_id !== undefined) updateFields.strategy_pillar_id = strategy_pillar_id;
  if (status !== undefined) updateFields.status = status;
  if (settings !== undefined) updateFields.settings = settings;

  const { data: programme, error: progErr } = await supabase
    .from('programmes')
    .update(updateFields)
    .eq('id', id)
    .eq('company_id', callerUC.company_id)
    .select()
    .single();

  if (progErr) return NextResponse.json({ error: progErr.message }, { status: 500 });

  if (skills !== undefined) {
    await supabase.from('skills').delete().eq('programme_id', id);

    if (skills.length > 0) {
      const skillRows = skills.map((s: { name: string; description?: string; sort_order?: number }, i: number) => ({
        programme_id: id,
        name: s.name,
        description: s.description ?? null,
        sort_order: s.sort_order ?? i,
      }));

      await supabase.from('skills').insert(skillRows);
    }
  }

  const { data: updated } = await supabase
    .from('programmes')
    .select('*, skills(id, name, description, sort_order), strategy_pillars(id, name, color)')
    .eq('id', id)
    .single();

  return NextResponse.json({ programme: updated ?? programme });
}

export async function DELETE(
  _request: NextRequest,
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

  const { error } = await supabase
    .from('programmes')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('company_id', callerUC.company_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
