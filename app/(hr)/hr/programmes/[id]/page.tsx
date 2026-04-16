import { createClient, getSessionUser } from '@/lib/supabase/server';
import Topbar from '@/components/layout/Topbar';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getProgramme(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('programmes')
    .select(`
      *,
      strategy_pillars(id, name, color),
      cohorts(
        id, name, status, training_date, training_time, location, max_participants, trainer_user_id,
        users!cohorts_trainer_user_id_fkey(id, name),
        user_cohorts(count)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

export default async function ProgrammeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getSessionUser();
  const programme = await getProgramme(id);

  if (!programme) notFound();

  const cohorts = programme.cohorts ?? [];

  return (
    <>
      <Topbar title={programme.name}>
        <Link href={`/hr/programmes/${id}/edit`} className="btn-outline">Edit Programme</Link>
        <Link href="/hr/cohorts/new" className="btn-primary">+ New Cohort</Link>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        <Link href="/hr/programmes" className="text-brand-purple text-sm font-semibold hover:opacity-70 transition-opacity mb-4 inline-block no-underline">
          ← Back to programmes
        </Link>

        {/* Programme header card */}
        <div className="card mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-extrabold text-brand-dark">{programme.name}</h2>
                <StatusBadge status={programme.status} />
              </div>
              {programme.description && (
                <p className="text-sm text-text-muted mb-3 max-w-xl">{programme.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span>{cohorts.length} cohort{cohorts.length !== 1 ? 's' : ''}</span>
                <span>Created {new Date(programme.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Cohorts */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="section-label">COHORTS</div>
              <Link href="/hr/cohorts/new" className="text-xs font-semibold text-brand-purple hover:opacity-70 transition-opacity no-underline">
                + Create Cohort
              </Link>
            </div>

            {cohorts.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-sm text-text-muted mb-3">No cohorts yet for this programme.</p>
                <Link href="/hr/cohorts/new" className="btn-primary">Create First Cohort</Link>
              </div>
            ) : (
              <div className="data-table">
                <div
                  className="grid px-5"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', borderBottom: '1px solid rgba(34,29,35,0.08)', background: '#FAFAF7' }}
                >
                  {['Name', 'Date', 'Trainer', 'Status', ''].map(h => (
                    <div key={h} className="th">{h}</div>
                  ))}
                </div>
                {cohorts
                  .sort((a: { training_date: string }, b: { training_date: string }) => new Date(b.training_date).getTime() - new Date(a.training_date).getTime())
                  .map((cohort: { id: string; name: string; training_date: string; status: string; users: { name: string } | null; user_cohorts: { count: number }[] }) => (
                  <Link
                    key={cohort.id}
                    href={`/hr/cohorts/${cohort.id}`}
                    className="grid px-5 items-center hover:bg-[#FFFBEE] transition-colors no-underline"
                    style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', borderBottom: '0.5px solid rgba(34,29,35,0.06)' }}
                  >
                    <div className="td font-bold text-sm text-brand-dark">{cohort.name}</div>
                    <div className="td text-text-muted text-xs">
                      {new Date(cohort.training_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="td text-text-muted text-xs">
                      {cohort.users?.name ?? '—'}
                    </div>
                    <div className="td">
                      <StatusBadge status={cohort.status} />
                    </div>
                    <div className="td">
                      <span className="text-xs font-bold text-brand-purple">View →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
