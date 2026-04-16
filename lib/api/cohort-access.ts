import type { SupabaseClient } from '@supabase/supabase-js';

export async function isParticipantInCohort(
  supabase: SupabaseClient,
  userId: string,
  cohortId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('user_cohorts')
    .select('id')
    .eq('user_id', userId)
    .eq('cohort_id', cohortId)
    .in('status', ['nominated', 'confirmed'])
    .maybeSingle();
  return !!data;
}

export async function canAccessCohortAsStaff(
  supabase: SupabaseClient,
  userId: string,
  cohortId: string
): Promise<boolean> {
  const { data: uc } = await supabase
    .from('user_companies')
    .select('role, company_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!uc) return false;

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('trainer_user_id, company_id')
    .eq('id', cohortId)
    .single();

  if (!cohort) return false;

  if (uc.role === 'trainer' && cohort.trainer_user_id === userId) return true;
  if (['hr', 'superadmin'].includes(uc.role) && cohort.company_id === uc.company_id) return true;

  return false;
}
