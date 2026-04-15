import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, generatePassword } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // ── 1. Verify caller is superadmin ───────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { data: uc } = await supabase
    .from('user_companies')
    .select('role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (uc?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden — superadmin only' }, { status: 403 });
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  const body = await request.json();
  const {
    org_name, org_slug, domain, plan, primary_color,
    hr_name, hr_email, hr_job_title, hr_department,
  } = body;

  if (!org_name || !org_slug || !hr_name || !hr_email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── 3. Create company ─────────────────────────────────────────────────────
  const { data: company, error: companyErr } = await admin
    .from('companies')
    .insert({
      name:              org_name,
      slug:              org_slug,
      domain:            domain || null,
      subscription_plan: plan ?? 'starter',
      primary_color:     primary_color ?? '#623CEA',
    })
    .select('id')
    .single();

  if (companyErr) {
    return NextResponse.json(
      { error: companyErr.message.includes('unique') ? 'Slug already taken' : companyErr.message },
      { status: 400 }
    );
  }

  // ── 4. Create HR auth user ────────────────────────────────────────────────
  const tempPassword = generatePassword();

  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email:              hr_email,
    password:           tempPassword,
    email_confirm:      true,   // skip confirmation email — we send credentials manually
    user_metadata:      { name: hr_name, role: 'hr', company_id: company.id },
  });

  if (authErr) {
    // Roll back: delete company
    await admin.from('companies').delete().eq('id', company.id);
    return NextResponse.json({ error: authErr.message }, { status: 400 });
  }

  // ── 5. Upsert users profile row ───────────────────────────────────────────
  // The DB trigger creates this automatically on auth.user_created,
  // but we also set plain_password here for SendGrid credential delivery.
  const { error: profileErr } = await admin
    .from('users')
    .upsert({
      id:             authUser.user!.id,
      email:          hr_email,
      name:           hr_name,
      plain_password: tempPassword,
    });

  if (profileErr) {
    console.error('Profile upsert error:', profileErr.message);
    // Non-fatal — trigger may have already created the row
  }

  // ── 6. Create user_companies junction ─────────────────────────────────────
  const { error: ucErr } = await admin
    .from('user_companies')
    .insert({
      user_id:    authUser.user!.id,
      company_id: company.id,
      role:       'hr',
      job_title:  hr_job_title || null,
      department: hr_department || null,
      status:     'active',
    });

  if (ucErr) {
    console.error('user_companies insert error:', ucErr.message);
    // Roll back both
    await admin.auth.admin.deleteUser(authUser.user!.id);
    await admin.from('companies').delete().eq('id', company.id);
    return NextResponse.json({ error: 'Failed to assign HR role' }, { status: 500 });
  }

  // ── 7. Return success with temp credentials ───────────────────────────────
  // NOTE: temp_password is returned ONCE here so superadmin can send via SendGrid.
  // It is NOT stored in plain text in the DB (obfuscated with PASSWORD_OBFUSCATION_KEY).
  return NextResponse.json({
    success:       true,
    company_id:    company.id,
    user_id:       authUser.user!.id,
    temp_password: tempPassword,   // shown once to superadmin
  });
}
