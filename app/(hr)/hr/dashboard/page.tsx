import { createClient, getSessionUser } from '@/lib/supabase/server';
import Topbar from '@/components/layout/Topbar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getHRStats(companyId: string) {
  const supabase = await createClient();

  const [programmes, cohorts, participants, trainers] = await Promise.all([
    supabase.from('programmes').select('id', { count: 'exact' }).eq('company_id', companyId).eq('status', 'active'),
    supabase.from('cohorts').select('id, name, status, training_date', { count: 'exact' }).eq('company_id', companyId).order('training_date', { ascending: false }).limit(5),
    supabase.from('user_companies').select('user_id', { count: 'exact' }).eq('company_id', companyId).eq('role', 'participant').eq('status', 'active'),
    supabase.from('user_companies').select('user_id', { count: 'exact' }).eq('company_id', companyId).eq('role', 'trainer').eq('status', 'active'),
  ]);

  const statusCounts = (cohorts.data ?? []).reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalProgrammes:  programmes.count ?? 0,
    totalCohorts:     cohorts.count    ?? 0,
    totalParticipants: participants.count ?? 0,
    totalTrainers:    trainers.count   ?? 0,
    recentCohorts:    cohorts.data     ?? [],
    statusCounts,
  };
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'tag-grey'   },
  scheduled: { label: 'Scheduled', cls: 'tag-blue'   },
  live:      { label: 'Live',      cls: 'tag-green'  },
  completed: { label: 'Completed', cls: 'tag-purple' },
};

export default async function HRDashboard() {
  const user  = await getSessionUser();
  const stats = await getHRStats(user!.company_id);

  const statCards = [
    { num: stats.totalProgrammes,   label: 'Programmes',   color: '#623CEA' },
    { num: stats.totalCohorts,      label: 'Cohorts',      color: '#F68A29' },
    { num: stats.totalParticipants, label: 'Participants', color: '#23CE68' },
    { num: stats.totalTrainers,     label: 'Trainers',     color: '#3699FC' },
  ];

  const firstName = user!.name.split(' ')[0];

  return (
    <>
      <Topbar title="HR Dashboard">
        <Link href="/hr/cohorts/new" className="btn-primary">+ New Cohort</Link>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">

        {/* Greeting */}
        <div className="mb-6">
          <div className="section-label">OVERVIEW</div>
          <div className="section-title">Welcome back, {firstName} 👋</div>
          <p className="text-text-muted text-sm mt-0.5">{user!.company_name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3.5 mb-6">
          {statCards.map((s, i) => (
            <div key={i} className="stat-card" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { href: '/hr/participants/new', label: 'Add Participant',  sub: 'Create login & send credentials', color: '#23CE68',  icon: '👤' },
            { href: '/hr/trainers/new',      label: 'Add Trainer',      sub: 'Onboard a new trainer',            color: '#3699FC',  icon: '⭐' },
            { href: '/hr/programmes/new',    label: 'New Programme',    sub: 'Design a training programme',      color: '#623CEA',  icon: '📚' },
          ].map(a => (
            <Link
              key={a.href}
              href={a.href}
              className="card no-underline flex items-center gap-4 hover:border-brand-yellow transition-all"
              style={{ border: '1.5px solid rgba(34,29,35,0.08)' }}
            >
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: `${a.color}18` }}
              >
                {a.icon}
              </span>
              <div>
                <div className="font-bold text-sm text-brand-dark">{a.label}</div>
                <div className="text-xs text-text-muted mt-0.5">{a.sub}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent cohorts */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="section-label">RECENT COHORTS</div>
            <div className="section-title">Training Activity</div>
          </div>
          <Link href="/hr/cohorts" className="text-xs font-semibold text-brand-purple hover:opacity-70 transition-opacity">
            View all →
          </Link>
        </div>

        <div className="data-table">
          <div
            className="grid px-5"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: '1px solid rgba(34,29,35,0.08)', background: '#FAFAF7' }}
          >
            {['Cohort', 'Training Date', 'Status', ''].map(h => (
              <div key={h} className="th">{h}</div>
            ))}
          </div>

          {stats.recentCohorts.length === 0 ? (
            <div className="px-5 py-10 text-center text-text-muted text-sm">
              No cohorts yet. <Link href="/hr/cohorts/new" className="text-brand-purple font-semibold">Create your first cohort →</Link>
            </div>
          ) : (
            stats.recentCohorts.map((cohort) => {
              const st = STATUS_STYLES[cohort.status] ?? STATUS_STYLES.draft;
              return (
                <div
                  key={cohort.id}
                  className="grid px-5 items-center hover:bg-[#FFFBEE] transition-colors"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: '0.5px solid rgba(34,29,35,0.06)' }}
                >
                  <div className="td font-bold">{cohort.name}</div>
                  <div className="td text-text-muted text-xs">
                    {new Date(cohort.training_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="td">
                    <span className={`tag ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="td">
                    <Link href={`/hr/cohorts/${cohort.id}`} className="text-xs font-bold text-brand-purple hover:opacity-70">
                      View →
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </main>
    </>
  );
}
