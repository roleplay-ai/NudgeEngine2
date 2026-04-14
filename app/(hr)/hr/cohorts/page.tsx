import { createClient, getSessionUser } from '@/lib/supabase/server';
import Topbar from '@/components/layout/Topbar';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getCohortData(companyId: string) {
  const supabase = await createClient();

  const { data: cohorts } = await supabase
    .from('cohorts')
    .select(`
      *,
      programmes(id, name),
      users!cohorts_trainer_user_id_fkey(id, name, avatar_url),
      user_cohorts(count)
    `)
    .eq('company_id', companyId)
    .order('training_date', { ascending: false });

  const all = cohorts ?? [];
  const statuses = all.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return { cohorts: all, statuses, total: all.length };
}

export default async function CohortsPage() {
  const user = await getSessionUser();
  const { cohorts, statuses, total } = await getCohortData(user!.company_id);

  const statCards = [
    { num: total,                    label: 'Total Cohorts',  color: '#623CEA' },
    { num: statuses.live ?? 0,       label: 'Live Now',       color: '#23CE68' },
    { num: statuses.scheduled ?? 0,  label: 'Scheduled',      color: '#3699FC' },
    { num: statuses.draft ?? 0,      label: 'Drafts',         color: '#F68A29' },
  ];

  return (
    <>
      <Topbar title="All Cohorts">
        <Link href="/hr/cohorts/new" className="btn-primary">+ New Cohort</Link>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3.5 mb-6">
          {statCards.map((s, i) => (
            <div key={i} className="stat-card" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Cohort grid */}
        <div className="mb-3">
          <div className="section-label">TRAINING COHORTS</div>
        </div>

        {cohorts.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-sm text-text-muted mb-3">No cohorts yet.</p>
            <Link href="/hr/cohorts/new" className="btn-primary">Create your first cohort →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {cohorts.map((cohort) => {
              const participantCount = cohort.user_cohorts?.[0]?.count ?? 0;
              const isLive = cohort.status === 'live';

              return (
                <Link
                  key={cohort.id}
                  href={`/hr/cohorts/${cohort.id}`}
                  className="card no-underline transition-all hover:-translate-y-0.5"
                  style={{
                    borderColor: isLive ? '#3699FC' : undefined,
                    background: isLive ? 'linear-gradient(135deg,#fff 0%,#F0F7FF 100%)' : undefined,
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-xs text-text-muted mb-1">{cohort.programmes?.name}</div>
                      <div className="text-sm font-bold text-brand-dark">{cohort.name}</div>
                    </div>
                    <StatusBadge status={cohort.status} />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>
                      📅 {new Date(cohort.training_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span>👥 {participantCount} participants</span>
                  </div>

                  {cohort.users && (
                    <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '0.5px solid rgba(34,29,35,0.06)' }}>
                      <span className="avatar avatar-sm" style={{ background: '#3699FC' }}>
                        {cohort.users.name?.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-xs font-medium text-brand-dark">{cohort.users.name}</span>
                      <span className="text-xs text-text-muted">Trainer</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
