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

  const { data: plan, error } = await supabase
    .from('commitment_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (plan.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: actions } = await supabase
    .from('user_actions')
    .select('*')
    .eq('commitment_plan_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ commitment_plan: plan, actions: actions ?? [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: plan } = await supabase
    .from('commitment_plans')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!plan || plan.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { main_commitment, why_text, blockers, phase_id } = body;

  const updates: Record<string, unknown> = {};
  if (main_commitment !== undefined) {
    if (String(main_commitment).length > 500) {
      return NextResponse.json({ error: 'main_commitment max 500 characters' }, { status: 400 });
    }
    updates.main_commitment = main_commitment;
  }
  if (why_text !== undefined) updates.why_text = why_text;
  if (blockers !== undefined) updates.blockers = blockers;
  if (phase_id !== undefined) updates.phase_id = phase_id;

  const { data: updated, error } = await supabase
    .from('commitment_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ commitment_plan: updated });
}
