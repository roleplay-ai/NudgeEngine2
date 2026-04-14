import { createClient } from '@/lib/supabase/server';
import Topbar from '@/components/layout/Topbar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getAdminStats() {
  const supabase = await createClient();

  const [orgs, users] = await Promise.all([
    supabase.from('companies').select('id, name, slug, subscription_plan, created_at', { count: 'exact' }),
    supabase.from('user_companies').select('role', { count: 'exact' }),
  ]);

  const roleBreakdown = (users.data ?? []).reduce<Record<string, number>>((acc, uc) => {
    acc[uc.role] = (acc[uc.role] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalOrgs:    orgs.count ?? 0,
    totalUsers:   users.count ?? 0,
    organisations: orgs.data ?? [],
    roleBreakdown,
  };
}

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  const statCards = [
    { num: stats.totalOrgs,  label: 'Organisations',  color: '#623CEA' },
    { num: stats.totalUsers, label: 'Total Users',     color: '#23CE68' },
    { num: stats.roleBreakdown['hr'] ?? 0, label: 'HR Admins', color: '#F68A29' },
    { num: stats.roleBreakdown['participant'] ?? 0, label: 'Participants', color: '#3699FC' },
  ];

  return (
    <>
      <Topbar title="Platform Overview">
        <Link href="/admin/organisations/new" className="btn-primary text-sm">
          + New Organisation
        </Link>
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

        {/* Organisations table */}
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="section-label">ORGANISATIONS</div>
            <div className="section-title">All Companies</div>
          </div>
          <Link href="/admin/organisations" className="text-xs font-semibold text-brand-purple hover:opacity-70 transition-opacity">
            View all →
          </Link>
        </div>

        <div className="data-table">
          <div
            className="grid px-5"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: '1px solid rgba(34,29,35,0.08)', background: '#FAFAF7' }}
          >
            {['Organisation', 'Plan', 'HR Admin', 'Created'].map(h => (
              <div key={h} className="th">{h}</div>
            ))}
          </div>

          {stats.organisations.length === 0 ? (
            <div className="px-5 py-10 text-center text-text-muted text-sm">
              No organisations yet. <Link href="/admin/organisations/new" className="text-brand-purple font-semibold">Create the first one →</Link>
            </div>
          ) : (
            stats.organisations.slice(0, 8).map((org) => (
              <Link
                key={org.id}
                href={`/admin/organisations/${org.id}`}
                className="grid px-5 hover:bg-[#FFFBEE] transition-colors cursor-pointer no-underline"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: '0.5px solid rgba(34,29,35,0.06)' }}
              >
                <div className="td font-bold">{org.name}</div>
                <div className="td">
                  <span className={`tag ${org.subscription_plan === 'enterprise' ? 'tag-purple' : org.subscription_plan === 'growth' ? 'tag-green' : 'tag-grey'}`}>
                    {org.subscription_plan}
                  </span>
                </div>
                <div className="td text-text-muted">—</div>
                <div className="td text-text-muted text-xs">
                  {new Date(org.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </Link>
            ))
          )}
        </div>

      </main>
    </>
  );
}
