import { createClient, getSessionUser } from '@/lib/supabase/server';
import Topbar from '@/components/layout/Topbar';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getOrgDetail(orgId: string) {
  const supabase = await createClient();

  const [orgResult, usersResult, programmesResult, cohortsResult] = await Promise.all([
    supabase.from('companies').select('*').eq('id', orgId).single(),
    supabase.from('user_companies').select('user_id, role, job_title, department, status, users!inner(id, name, email, is_active)').eq('company_id', orgId).order('created_at', { ascending: false }),
    supabase.from('programmes').select('id, name, status, created_at, skills(id)').eq('company_id', orgId).order('created_at', { ascending: false }),
    supabase.from('cohorts').select('id, name, status, training_date, users!cohorts_trainer_user_id_fkey(name), user_cohorts(count)').eq('company_id', orgId).order('training_date', { ascending: false }),
  ]);

  return {
    org: orgResult.data,
    users: usersResult.data ?? [],
    programmes: programmesResult.data ?? [],
    cohorts: cohortsResult.data ?? [],
  };
}

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== 'superadmin') notFound();

  const { org, users, programmes, cohorts } = await getOrgDetail(id);
  if (!org) notFound();

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  const statCards = [
    { num: users.length,              label: 'Total Users',    color: '#623CEA' },
    { num: roleCounts.hr ?? 0,        label: 'HR Admins',      color: '#F68A29' },
    { num: roleCounts.trainer ?? 0,   label: 'Trainers',       color: '#3699FC' },
    { num: roleCounts.participant ?? 0, label: 'Participants', color: '#23CE68' },
    { num: programmes.length,         label: 'Programmes',     color: '#623CEA' },
    { num: cohorts.length,            label: 'Cohorts',        color: '#F68A29' },
  ];

  return (
    <>
      <Topbar title={org.name}>
        <Link href="/admin/organisations" className="btn-outline">← All Organisations</Link>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        {/* Org header */}
        <div className="card mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold text-white"
              style={{ background: org.primary_color ?? '#623CEA' }}
            >
              {org.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-brand-dark">{org.name}</h2>
              <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                <span>Slug: {org.slug}</span>
                {org.domain && <span>Domain: {org.domain}</span>}
                <span className="tag tag-blue">{org.subscription_plan}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-3 mb-6">
          {statCards.map((s, i) => (
            <div key={i} className="stat-card" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="stat-num" style={{ color: s.color, fontSize: '28px' }}>{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Users */}
          <div>
            <div className="section-label mb-3">USERS</div>
            <div className="data-table">
              <div className="grid px-5" style={{ gridTemplateColumns: '2fr 1.5fr 1fr', borderBottom: '1px solid rgba(34,29,35,0.08)', background: '#FAFAF7' }}>
                {['Name', 'Email', 'Role'].map(h => <div key={h} className="th">{h}</div>)}
              </div>
              {users.slice(0, 10).map((u) => {
                const usr = u.users as unknown as { id: string; name: string; email: string; is_active: boolean } | null;
                return (
                  <div key={u.user_id} className="grid px-5 items-center" style={{ gridTemplateColumns: '2fr 1.5fr 1fr', borderBottom: '0.5px solid rgba(34,29,35,0.06)' }}>
                    <div className="td">
                      <div className="flex items-center gap-2">
                        <span className="avatar avatar-sm">{usr?.name?.slice(0, 2).toUpperCase()}</span>
                        <span className="text-sm font-semibold text-brand-dark">{usr?.name}</span>
                      </div>
                    </div>
                    <div className="td text-text-muted text-xs">{usr?.email}</div>
                    <div className="td"><StatusBadge status={u.role} /></div>
                  </div>
                );
              })}
              {users.length > 10 && (
                <div className="py-3 text-center text-xs text-text-muted">
                  +{users.length - 10} more users
                </div>
              )}
            </div>
          </div>

          {/* Programmes & Cohorts */}
          <div>
            <div className="section-label mb-3">PROGRAMMES</div>
            <div className="space-y-2 mb-6">
              {programmes.length === 0 ? (
                <p className="text-sm text-text-muted">No programmes yet.</p>
              ) : (
                programmes.map((p) => (
                  <div key={p.id} className="card" style={{ padding: '12px 16px', marginBottom: '6px' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-brand-dark">{p.name}</div>
                        <div className="text-xs text-text-muted">{p.skills?.length ?? 0} skills</div>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="section-label mb-3">COHORTS</div>
            <div className="space-y-2">
              {cohorts.length === 0 ? (
                <p className="text-sm text-text-muted">No cohorts yet.</p>
              ) : (
                cohorts.slice(0, 5).map((c) => {
                  const trainer = c.users as unknown as { name: string } | null;
                  return (
                    <div key={c.id} className="card" style={{ padding: '12px 16px', marginBottom: '6px' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-brand-dark">{c.name}</div>
                          <div className="text-xs text-text-muted">
                            {new Date(c.training_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' · '}
                            {trainer?.name ?? 'No trainer'}
                          </div>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
