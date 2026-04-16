import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const commitmentPlanId = searchParams.get('commitment_plan_id');
  if (!commitmentPlanId) {
    return NextResponse.json({ error: 'commitment_plan_id required' }, { status: 400 });
  }

  const { data: plan } = await supabase
    .from('commitment_plans')
    .select('user_id')
    .eq('id', commitmentPlanId)
    .single();

  if (!plan || plan.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: actions, error } = await supabase
    .from('user_actions')
    .select('*')
    .eq('commitment_plan_id', commitmentPlanId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ actions: actions ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const {
    commitment_plan_id,
    template_id,
    skill_id,
    custom_title,
    builds_capability,
    nudge_scheduled_date,
  } = body;

  if (!commitment_plan_id) {
    return NextResponse.json({ error: 'commitment_plan_id required' }, { status: 400 });
  }

  if (!template_id && !custom_title?.trim()) {
    return NextResponse.json({ error: 'template_id or custom_title required' }, { status: 400 });
  }

  const { data: plan } = await supabase
    .from('commitment_plans')
    .select('user_id')
    .eq('id', commitment_plan_id)
    .single();

  if (!plan || plan.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: action, error } = await supabase
    .from('user_actions')
    .insert({
      user_id: user.id,
      commitment_plan_id,
      template_id: template_id ?? null,
      skill_id: skill_id ?? null,
      custom_title: custom_title?.trim() ?? null,
      builds_capability: builds_capability ?? null,
      nudge_scheduled_date: nudge_scheduled_date ?? null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ action }, { status: 201 });
}
