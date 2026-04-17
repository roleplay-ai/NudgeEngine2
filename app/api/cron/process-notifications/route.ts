import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@nudgeable.ai';
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('x-cron-secret') ?? request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: pending, error } = await supabase
    .from('notification_queue')
    .select('*, users(email, name)')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date().toISOString();
  let sent = 0;
  let failed = 0;

  for (const notification of pending ?? []) {
    try {
      const recipient = notification.users as unknown as { email: string; name: string } | null;
      if (!recipient?.email) throw new Error('No email found for user');

      if (notification.channel === 'email' || notification.channel === 'both') {
        if (!process.env.SENDGRID_API_KEY) {
          console.log(`[CRON] Skipping email (no SENDGRID_API_KEY) to ${recipient.email}`);
        } else {
          await sgMail.send({
            to: recipient.email,
            from: FROM_EMAIL,
            subject: notification.email_subject ?? 'Nudge from Nudgeable',
            html: notification.email_body ?? `<p>You have a new notification.</p>`,
          });
        }
      }

      await supabase
        .from('notification_queue')
        .update({ status: 'sent', sent_at: now })
        .eq('id', notification.id);

      sent++;
    } catch (err) {
      console.error(`[CRON] Failed to send notification ${notification.id}:`, err);
      await supabase
        .from('notification_queue')
        .update({ status: 'failed' })
        .eq('id', notification.id);
      failed++;
    }
  }

  return NextResponse.json({ processed: (pending ?? []).length, sent, failed });
}
