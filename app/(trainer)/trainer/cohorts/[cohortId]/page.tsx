import { createClient, getSessionUser } from '@/lib/supabase/server';
import Topbar from '@/components/layout/Topbar';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';

export const dynamic = 'force-dynamic';

async function getCohortDetail(cohortId: string, trainerId: string) {
  const supabase = await createClient();

  const { data: cohort } = await supabase
    .from('cohorts')
    .select(`
      id, name, status, training_date, training_time, location, max_participants,
      programmes(id, name),
      user_cohorts(count)
    `)
    .eq('id', cohortId)
    .eq('trainer_user_id', trainerId)
    .single();

  return cohort;
}

const TABS = [
  { key: 'pre-training', label: 'Pre-Training', href: (id: string) => `/trainer/cohorts/${id}/pre-training` },
  { key: 'live', label: 'Live Session', href: (id: string) => `/trainer/cohorts/${id}/live`, disabled: false },
  { key: 'post', label: 'Post-Training', href: (id: string) => `/trainer/cohorts/${id}/post`, disabled: true },
  { key: 'messages', label: 'Messages', href: (id: string) => `/trainer/cohorts/${id}/messages` },
];

export default async function TrainerCohortDetailPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const user = await getSessionUser();
  const cohort = await getCohortDetail(cohortId, user!.id);

  if (!cohort) {
    return (
      <>
        <Topbar title="Cohort Not Found" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <div className="card py-16 text-center">
            <p className="text-2xl mb-3">🔍</p>
            <p className="font-bold text-brand-dark mb-1">Cohort not found</p>
            <p className="text-sm text-text-muted">This cohort doesn&apos;t exist or isn&apos;t assigned to you.</p>
            <Link href="/trainer/overview" className="btn-primary mt-4 inline-block">← Back to Cohorts</Link>
          </div>
        </main>
      </>
    );
  }

  const programme = cohort.programmes as unknown as { id: string; name: string } | null;
  const participantCount = (cohort.user_cohorts as unknown as { count: number }[])?.[0]?.count ?? 0;

  return (
    <>
      <Topbar title={cohort.name} />

      <main className="flex-1 overflow-y-auto px-7 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <Link href="/trainer/overview" className="text-xs text-text-muted hover:text-brand-dark transition-colors mb-2 inline-block">
              ← Back to Cohorts
            </Link>
            <h1 className="text-xl font-extrabold text-brand-dark">{cohort.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
              <span>{programme?.name ?? 'Programme'}</span>
              <span>·</span>
              <span>{new Date(cohort.training_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>·</span>
              <span>{participantCount} participants</span>
            </div>
          </div>
          <StatusBadge status={cohort.status} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6" style={{ borderBottom: '1px solid rgba(34,29,35,0.08)' }}>
          {TABS.map(tab => (
            <div key={tab.key}>
              {tab.disabled ? (
                <span className="px-4 py-2.5 text-sm font-semibold text-text-muted/40 cursor-not-allowed inline-block">
                  {tab.label}
                </span>
              ) : (
                <Link
                  href={tab.href(cohortId)}
                  className="px-4 py-2.5 text-sm font-semibold text-text-secondary hover:text-brand-dark transition-colors inline-block no-underline"
                >
                  {tab.label}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Default content — quick links */}
        <div className="grid grid-cols-2 gap-4">
          <Link href={`/trainer/cohorts/${cohortId}/pre-training`} className="card no-underline hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-bold text-brand-dark mb-1">Pre-Training Readiness</div>
            <p className="text-xs text-text-muted">Monitor participant progress and send reminders</p>
          </Link>
          <Link href={`/trainer/cohorts/${cohortId}/messages`} className="card no-underline hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">💬</div>
            <div className="font-bold text-brand-dark mb-1">Messages</div>
            <p className="text-xs text-text-muted">Send batch announcements or direct messages</p>
          </Link>
        </div>
      </main>
    </>
  );
}
