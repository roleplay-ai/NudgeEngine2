import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, generatePassword, obfuscatePassword } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types';

// HR can create: participant, trainer
// Superadmin can create: hr, trainer, participant (any)
const ALLOWED_ROLES: Record<UserRole, UserRole[]> = {
  superadmin: ['hr', 'trainer', 'participant'],
  hr:         ['trainer', 'participant'],
  trainer:    [],
  participant: [],
};

export async function POST(request: NextRequest) {
  // ── 1. Authenticate caller ────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { data: callerUC } = await supabase
    .from('user_companies')
    .select('role, company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!callerUC) {
    return NextResponse.json({ error: 'No active company role' }, { status: 403 });
  }

  const callerRole  = callerUC.role as UserRole;
  const companyId   = callerUC.company_id;

  // ── 2. Parse & validate body ──────────────────────────────────────────────
  const body = await request.json();
  const {
    email,
    name,
    role,
    job_title,
    department,
    phone,
    // Optionally override company_id (superadmin only)
    target_company_id,
  } = body;

  if (!email || !name || !role) {
    return NextResponse.json({ error: 'email, name and role are required' }, { status: 400 });
  }

  const allowed = ALLOWED_ROLES[callerRole] ?? [];
  if (!allowed.includes(role as UserRole)) {
    return NextResponse.json(
      { error: `${callerRole} cannot create users with role: ${role}` },
      { status: 403 }
    );
  }

  // Superadmin can target a different company; HR can only target their own
  const targetCompanyId = (callerRole === 'superadmin' && target_company_id)
    ? target_company_id
    : companyId;

  // ── 3. Generate credentials ───────────────────────────────────────────────
  const tempPassword = generatePassword();
  const admin = createAdminClient();

  // ── 4. Create auth user ───────────────────────────────────────────────────
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password:      tempPassword,
    email_confirm: true,
    user_metadata: { name, role, company_id: targetCompanyId },
  });

  if (authErr) {
    const msg = authErr.message.includes('already been registered')
      ? 'A user with this email already exists'
      : authErr.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const newUserId = authUser.user!.id;

  // ── 5. Upsert users profile ───────────────────────────────────────────────
  await admin.from('users').upsert({
    id:             newUserId,
    email,
    name,
    phone:          phone || null,
    plain_password: obfuscatePassword(tempPassword),
  });

  // ── 6. Create user_companies row ──────────────────────────────────────────
  const { error: ucErr } = await admin.from('user_companies').insert({
    user_id:    newUserId,
    company_id: targetCompanyId,
    role,
    job_title:  job_title || null,
    department: department || null,
    status:     'active',
  });

  if (ucErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
  }

  return NextResponse.json({
    success:       true,
    user_id:       newUserId,
    email,
    name,
    role,
    temp_password: tempPassword,  // return once for credential email
  });
}

// ── GET: list users for caller's company ──────────────────────────────────────
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
  const roleFilter = searchParams.get('role');

  let query = supabase
    .from('user_companies')
    .select(`
      user_id, role, job_title, department, status, created_at,
      users(id, email, name, avatar_url, phone, is_active, created_at)
    `)
    .eq('company_id', callerUC.company_id)
    .neq('role', 'superadmin')
    .order('created_at', { ascending: false });

  if (roleFilter) {
    query = query.eq('role', roleFilter);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: data ?? [] });
}
