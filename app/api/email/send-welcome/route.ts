import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/sendgrid';

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
  const { user_id, to_email, to_name, cohort_name, training_date, trainer_name } = body;

  if (!to_email || !to_name || !cohort_name) {
    return NextResponse.json({ error: 'to_email, to_name, cohort_name are required' }, { status: 400 });
  }

  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nudgeable.ai'}/login`;

  try {
    await sendWelcomeEmail(to_email, {
      name: to_name,
      cohort_name,
      training_date: training_date ?? '',
      trainer_name: trainer_name ?? '',
      login_url: loginUrl,
    });

    await supabase.from('notification_queue').insert({
      user_id: user_id ?? user.id,
      channel: 'email',
      email_subject: `You've been invited to ${cohort_name}`,
      email_body: `Welcome email sent to ${to_email}`,
      scheduled_for: new Date().toISOString(),
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
