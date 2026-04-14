import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component — cookies can't be set, handled by middleware
          }
        },
      },
    }
  );
}

/**
 * Get the current session user with their role and company.
 * Returns null if not authenticated.
 */
export async function getSessionUser() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Fetch profile + company role
  const { data: profile } = await supabase
    .from('users')
    .select('id, email, name, avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  const { data: userCompany } = await supabase
    .from('user_companies')
    .select('role, company_id, companies(name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!userCompany) return null;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    avatar_url: profile.avatar_url,
    role: userCompany.role as import('@/types').UserRole,
    company_id: userCompany.company_id,
    company_name: (userCompany.companies as { name: string } | null)?.name ?? '',
  };
}
