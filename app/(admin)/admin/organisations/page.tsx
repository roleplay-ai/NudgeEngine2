import { createClient } from '@/lib/supabase/server';
import Topbar from '@/components/layout/Topbar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getOrganisations() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('companies')
    .select(`
      id, name, slug, domain, subscription_plan, primary_color, created_at,
      user_companies(count)
    `)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}

export default async function OrganisationsPage() {
  const orgs = await getOrganisations();

  return (
    <>
      <Topbar title="Organisations">
        <Link href="/admin/organisations/new" className="btn-primary">
          + New Organisation
        </Link>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        <div className="mb-6">
          <div className="section-label">PLATFORM MANAGEMENT</div>
          <div className="section-title">{orgs.length} Organisation{orgs.length !== 1 ? 's' : ''}</div>
        </div>

        <div className="data-table">
          <div
            className="grid px-5"
            style={{
              gridTemplateColumns: '2.5fr 1fr 1fr 1fr 80px',
              borderBottom: '1px solid rgba(34,29,35,0.08)',
              background: '#FAFAF7',
            }}
          >
            {['Organisation', 'Domain', 'Plan', 'Users', ''].map(h => (
              <div key={h} className="th">{h}</div>
            ))}
          </div>

          {orgs.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-text-muted text-sm mb-3">No organisations yet.</p>
              <Link href="/admin/organisations/new" className="btn-primary inline-flex">
                Create First Organisation
              </Link>
            </div>
          ) : (
            orgs.map((org) => (
              <div
                key={org.id}
                className="grid px-5 items-center hover:bg-[#FFFBEE] transition-colors"
                style={{
                  gridTemplateColumns: '2.5fr 1fr 1fr 1fr 80px',
                  borderBottom: '0.5px solid rgba(34,29,35,0.06)',
                }}
              >
                <div className="td">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
                      style={{ background: org.primary_color ?? '#623CEA' }}
                    >
                      {org.name[0]}
                    </span>
                    <div>
                      <div className="font-bold text-brand-dark">{org.name}</div>
                      <div className="td-muted">{org.slug}</div>
                    </div>
                  </div>
                </div>
                <div className="td text-text-muted text-xs">{org.domain ?? '—'}</div>
                <div className="td">
                  <span className={`tag ${
                    org.subscription_plan === 'enterprise' ? 'tag-purple' :
                    org.subscription_plan === 'growth'     ? 'tag-green'  :
                    org.subscription_plan === 'starter'    ? 'tag-blue'   : 'tag-grey'
                  }`}>
                    {org.subscription_plan}
                  </span>
                </div>
                <div className="td text-text-muted">
                  {(org.user_companies as { count: number }[])?.[0]?.count ?? 0}
                </div>
                <div className="td">
                  <Link
                    href={`/admin/organisations/${org.id}`}
                    className="text-xs font-bold text-brand-purple hover:opacity-70 transition-opacity"
                  >
                    Manage →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
