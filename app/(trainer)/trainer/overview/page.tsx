import { createClient, getSessionUser } from '@/lib/supabase/server';
import Topbar from '@/components/layout/Topbar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getTrainerCohorts(userId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('cohorts')
    .select(`
      id, name, status, training_date, training_time, location,
      programmes(name),
      user_cohorts(count)
    `)
    .eq('trainer_user_id', userId)
    .order('training_date', { ascending: true });

  return data ?? [];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',     color: '#8A8090', bg: 'rgba(34,29,35,0.08)' },
  scheduled: { label: 'Scheduled', color: '#185FA5', bg: '#E6F1FB' },
  live:      { label: 'Live',      color: '#fff',    bg: '#23CE68' },
  completed: { label: 'Completed', color: '#fff',    bg: '#623CEA' },
};

export default async function TrainerOverview() {
  const user    = await getSessionUser();
  const cohorts = await getTrainerCohorts(user!.id);

  const upcoming  = cohorts.filter(c => ['scheduled', 'draft'].includes(c.status));
  const live      = cohorts.filter(c => c.status === 'live');
  const past      = cohorts.filter(c => c.status === 'completed');

  const firstName = user!.name.split(' ')[0];

  return (
    <>
      <Topbar title="My Cohorts" />

      <main className="flex-1 overflow-y-auto px-7 py-6">

        <div className="mb-6">
          <div className="section-label">TRAINER VIEW</div>
          <div className="section-title">Hello, {firstName} 👋</div>
          <p className="text-text-muted text-sm mt-0.5">
            {cohorts.length} cohort{cohorts.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>

        {/* Live cohorts — highlighted */}
        {live.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              <span className="text-sm font-bold text-brand-dark">Live Now</span>
            </div>
            {live.map(c => (
              <CohortCard key={c.id} cohort={c} highlight />
            ))}
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Upcoming</p>
            {upcoming.map(c => <CohortCard key={c.id} cohort={c} />)}
          </div>
        )}

        {/* Completed */}
        {past.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Completed</p>
            {past.map(c => <CohortCard key={c.id} cohort={c} />)}
          </div>
        )}

        {cohorts.length === 0 && (
          <div className="card py-16 text-center">
            <p className="text-2xl mb-3">📅</p>
            <p className="font-bold text-brand-dark mb-1">No cohorts yet</p>
            <p className="text-sm text-text-muted">
              HR will assign cohorts to you. Check back soon.
            </p>
          </div>
        )}

      </main>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CohortCard({ cohort, highlight }: { cohort: any; highlight?: boolean }) {
  const st = STATUS_CONFIG[cohort.status] ?? STATUS_CONFIG.draft;
  // @ts-expect-error: supabase count shape
  const participantCount = cohort.user_cohorts?.[0]?.count ?? 0;

  return (
    <Link
      href={`/trainer/cohorts/${cohort.id}`}
      className="card no-underline flex items-center justify-between"
      style={{
        border: highlight ? '1.5px solid #23CE68' : '1px solid rgba(34,29,35,0.08)',
        background: highlight ? '#F0FFF7' : '#fff',
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: highlight ? 'rgba(35,206,104,0.15)' : 'rgba(34,29,35,0.04)' }}
        >
          {highlight ? '🔴' : '📚'}
        </div>
        <div>
          <div className="font-bold text-brand-dark">{cohort.name}</div>
          <div className="text-xs text-text-muted mt-0.5">
            {/* @ts-expect-error supabase join */}
            {cohort.programmes?.name ?? 'Programme'} · {participantCount} participants
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            📅 {new Date(cohort.training_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            {cohort.location && ` · ${cohort.location}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="tag"
          style={{ background: st.bg, color: st.color }}
        >
          {st.label}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8090" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </Link>
  );
}
