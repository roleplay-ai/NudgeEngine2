import { createClient, getSessionUser } from '@/lib/supabase/server';
import Topbar from '@/components/layout/Topbar';

export const dynamic = 'force-dynamic';

async function getParticipantData(userId: string) {
  const supabase = await createClient();

  // Get active cohort for this participant
  const { data: userCohort } = await supabase
    .from('user_cohorts')
    .select(`
      id, status,
      cohorts(
        id, name, training_date, training_time, location,
        programmes(name),
        users!cohorts_trainer_user_id_fkey(name, avatar_url)
      )
    `)
    .eq('user_id', userId)
    .in('status', ['nominated', 'confirmed'])
    .order('enrolled_date', { ascending: false })
    .limit(1)
    .single();

  if (!userCohort) return null;

  const cohort = userCohort.cohorts as any;
  if (!cohort) return null;

  // Get task completions
  const { data: completions } = await supabase
    .from('task_completions')
    .select('task_type')
    .eq('user_id', userId)
    .eq('cohort_id', cohort.id);

  const completedTasks = new Set((completions ?? []).map((c: any) => c.task_type));

  // Calculate readiness score: 20% base + 20% per task (4 tasks = 100%)
  const readinessScore = 20 + completedTasks.size * 20;

  // Days to training
  const trainingDate = new Date(cohort.training_date);
  const today        = new Date();
  const daysLeft     = Math.max(0, Math.ceil((trainingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    cohort,
    completedTasks,
    readinessScore,
    daysLeft,
    trainer: cohort.users as { name: string; avatar_url: string | null } | null,
    programme: cohort.programmes as { name: string } | null,
  };
}

const TASKS = [
  {
    id:    'compare',
    step:  '01',
    title: 'Compare Your Skills',
    sub:   'Rate yourself on key skill areas and see how you compare with your peers.',
    icon:  '⭐',
    color: '#FFCE00',
  },
  {
    id:    'shape',
    step:  '02',
    title: 'Shape the Session',
    sub:   'Share your expectations and goals for the training.',
    icon:  '🎯',
    color: '#623CEA',
  },
  {
    id:    'meet',
    step:  '03',
    title: 'Meet Your Batch',
    sub:   'Introduce yourself and learn about your fellow participants.',
    icon:  '👋',
    color: '#23CE68',
  },
  {
    id:    'prereads',
    step:  '04',
    title: 'Pre-reads',
    sub:   'Review the materials shared by your trainer before the session.',
    icon:  '📖',
    color: '#3699FC',
  },
];

export default async function PreTrainingPage() {
  const user = await getSessionUser();
  const data = await getParticipantData(user!.id);

  if (!data) {
    return (
      <>
        <Topbar title="Pre-Training" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <div className="card py-16 text-center max-w-md mx-auto">
            <p className="text-3xl mb-4">⏳</p>
            <p className="font-bold text-brand-dark text-lg mb-2">No active cohort yet</p>
            <p className="text-text-muted text-sm">
              Your HR team will enrol you in an upcoming training programme. You&apos;ll receive an email when it&apos;s time to start.
            </p>
          </div>
        </main>
      </>
    );
  }

  const { cohort, completedTasks, readinessScore, daysLeft, trainer, programme } = data;
  const firstName = user!.name.split(' ')[0];

  return (
    <>
      <Topbar title="Pre-Training" />

      <main className="flex-1 overflow-y-auto px-7 py-6">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div
          className="rounded-[20px] p-6 mb-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #221D23 0%, #2E2433 100%)' }}
        >
          {/* Background decoration */}
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
            style={{ background: '#FFCE00', transform: 'translate(30%, -30%)' }}
          />

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {programme?.name ?? 'Training Programme'}
                </div>
                <h2 className="text-xl font-extrabold text-white">{cohort.name}</h2>
              </div>

              {/* Days counter */}
              <div className="text-right flex-shrink-0">
                <div className="text-3xl font-black text-brand-yellow">{daysLeft}</div>
                <div className="text-[11px] text-white/50">days to go</div>
              </div>
            </div>

            {/* Readiness score */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white/60">Your Readiness</span>
                <span className="text-sm font-extrabold text-brand-yellow">{readinessScore}%</span>
              </div>
              <div className="progress-wrap" style={{ height: '6px' }}>
                <div
                  className="progress-fill"
                  style={{ width: `${readinessScore}%`, background: '#FFCE00' }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-white/50">
              <span>
                📅 {new Date(cohort.training_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              {cohort.location && <span>📍 {cohort.location}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* ── Tasks column ─────────────────────────────────────────────── */}
          <div className="col-span-2">
            <div className="section-label">YOUR CHECKLIST</div>
            <div className="section-title mb-5">Get Ready, {firstName}</div>

            <div className="card">
              {TASKS.map((task, i) => {
                const done = completedTasks.has(task.id);

                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-4 py-4"
                    style={{
                      borderBottom: i < TASKS.length - 1 ? '0.5px solid rgba(34,29,35,0.07)' : 'none',
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 text-lg"
                      style={{
                        background: done ? '#F0FFF7' : `${task.color}15`,
                        border:     done ? '1.5px solid #23CE68' : `1.5px solid ${task.color}30`,
                      }}
                    >
                      {done ? '✅' : task.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-extrabold uppercase tracking-wider"
                          style={{ color: task.color }}
                        >
                          TASK {task.step}
                        </span>
                        {done && (
                          <span className="tag tag-green text-[10px] py-0">Done</span>
                        )}
                      </div>
                      <div className="font-bold text-brand-dark text-sm mt-0.5">{task.title}</div>
                      <div className="text-xs text-text-muted mt-0.5 leading-relaxed">{task.sub}</div>
                    </div>

                    {/* CTA */}
                    {!done && (
                      <button
                        className="btn-primary flex-shrink-0 text-xs px-3 py-2"
                        style={{ fontSize: '12px' }}
                      >
                        Start
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Sidebar column ──────────────────────────────────────────── */}
          <div>
            {/* Trainer card */}
            {trainer && (
              <div className="card mb-0">
                <div className="section-label mb-2">YOUR TRAINER</div>
                <div className="flex items-center gap-3">
                  <div className="avatar avatar-lg" style={{ background: '#3699FC' }}>
                    {trainer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-brand-dark">{trainer.name}</div>
                    <div className="text-xs text-text-muted">Session Facilitator</div>
                  </div>
                </div>
                <button
                  className="btn-dark w-full mt-4 text-xs justify-center"
                  style={{ height: '36px' }}
                >
                  💬 Send a message
                </button>
              </div>
            )}

            {/* Readiness breakdown */}
            <div className="card mt-5">
              <div className="section-label mb-3">READINESS SCORE</div>
              <div className="text-3xl font-black text-brand-purple mb-1">{readinessScore}%</div>
              <div className="text-xs text-text-muted mb-4">
                {completedTasks.size} of 4 tasks completed
              </div>

              <div className="space-y-2">
                {TASKS.map(task => {
                  const done = completedTasks.has(task.id);
                  return (
                    <div key={task.id} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: done ? '#23CE68' : 'rgba(34,29,35,0.1)' }}
                      >
                        {done && (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </div>
                      <span className="text-xs text-text-secondary">{task.title}</span>
                      <span className="text-xs font-bold ml-auto" style={{ color: task.color }}>+20%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
