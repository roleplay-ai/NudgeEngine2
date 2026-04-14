import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/types';

// ─── Route map per role ────────────────────────────────────────────────────────
const ROLE_HOME: Record<UserRole, string> = {
  superadmin: '/admin/dashboard',
  hr:          '/hr/dashboard',
  trainer:     '/trainer/overview',
  participant: '/participant/pre-training',
};

const ROLE_PREFIXES: Record<UserRole, string> = {
  superadmin: '/admin',
  hr:          '/hr',
  trainer:     '/trainer',
  participant: '/participant',
};

// Public paths that don't require auth
const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth/error'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // ── 1. Refresh session (MUST run before any redirects) ────────────────────
  const { data: { user } } = await supabase.auth.getUser();

  // ── 2. Allow public paths ─────────────────────────────────────────────────
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  if (!user) {
    if (isPublic) return supabaseResponse;
    // Not authenticated → redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 3. User is authenticated ──────────────────────────────────────────────
  if (isPublic && pathname === '/login') {
    // Already logged in → redirect to their home
    const role = await getUserRole(supabase, user.id);
    if (role) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
  }

  // ── 4. Role-based access guard ────────────────────────────────────────────
  const isProtectedRoute = Object.values(ROLE_PREFIXES).some(prefix =>
    pathname.startsWith(prefix)
  );

  if (isProtectedRoute) {
    const role = await getUserRole(supabase, user.id);

    if (!role) {
      // No role found — sign out and redirect
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/login?error=no_role', request.url));
    }

    const allowedPrefix = ROLE_PREFIXES[role];

    // Wrong section for this role → redirect to correct home
    if (!pathname.startsWith(allowedPrefix)) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
  }

  // ── 5. Root redirect ──────────────────────────────────────────────────────
  if (pathname === '/') {
    const role = await getUserRole(supabase, user.id);
    if (role) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
  }

  return supabaseResponse;
}

// ─── Helper: fetch user role (single query) ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserRole(supabase: any, userId: string): Promise<UserRole | null> {
  const { data } = await supabase
    .from('user_companies')
    .select('role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single();

  return (data?.role as UserRole) ?? null;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, site icons
     * - API routes that handle their own auth (/api/auth/*)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
