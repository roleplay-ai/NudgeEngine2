import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { actions: items } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'actions array required' }, { status: 400 });
  }

  const commitmentPlanId = items[0]?.commitment_plan_id;
  if (!commitmentPlanId) {
    return NextResponse.json({ error: 'each action needs commitment_plan_id' }, { status: 400 });
  }

  const { data: plan } = await supabase
    .from('commitment_plans')
    .select('user_id')
    .eq('id', commitmentPlanId)
    .single();

  if (!plan || plan.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  for (const item of items) {
    if (item.commitment_plan_id !== commitmentPlanId) {
      return NextResponse.json({ error: 'All actions must share the same commitment_plan_id' }, { status: 400 });
    }
    if (!item.template_id && !item.custom_title?.trim()) {
      return NextResponse.json({ error: 'Each action needs template_id or custom_title' }, { status: 400 });
    }
  }

  const rows = items.map((item: {
    commitment_plan_id: string;
    template_id?: string;
    skill_id?: string;
    custom_title?: string;
    builds_capability?: string;
    nudge_scheduled_date?: string;
  }) => ({
    user_id: user.id,
    commitment_plan_id: item.commitment_plan_id,
    template_id: item.template_id ?? null,
    skill_id: item.skill_id ?? null,
    custom_title: item.custom_title?.trim() ?? null,
    builds_capability: item.builds_capability ?? null,
    nudge_scheduled_date: item.nudge_scheduled_date ?? null,
    status: 'pending' as const,
  }));

  const { data: actions, error } = await supabase
    .from('user_actions')
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ actions: actions ?? [] }, { status: 201 });
}
