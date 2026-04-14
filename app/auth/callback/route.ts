import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/types';

const ROLE_HOME: Record<UserRole, string> = {
  superadmin: '/admin/dashboard',
  hr:          '/hr/dashboard',
  trainer:     '/trainer/overview',
  participant: '/participant/pre-training',
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const next  = searchParams.get('next') ?? '/';
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${error}`);
  }

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error: exchError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchError && user) {
      // Get role for redirect
      const { data: uc } = await supabase
        .from('user_companies')
        .select('role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      const role = uc?.role as UserRole | undefined;
      const home = role ? ROLE_HOME[role] : next;

      return NextResponse.redirect(`${origin}${home}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
