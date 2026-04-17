'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import AttendanceConfirm from '@/components/participant/AttendanceConfirm';
import {
  isBeforeTrainingDay,
  isTrainingDayToday,
  isAfterTrainingDay,
} from '@/lib/date-training';

interface Cohort {
  id: string;
  name: string;
  training_date: string;
  training_time: string | null;
  location: string | null;
  cohort_phases?: { id: string; name: string; sequence_order: number }[];
  programmes?: { name: string } | null;
}

interface Action {
  id: string;
  custom_title: string | null;
  builds_capability: string | null;
  status: string;
}

interface CommitmentPlan {
  id: string;
  main_commitment: string;
  why_text: string | null;
  blockers: string | null;
}

interface Onboarding {
  expectations: string | null;
  session_goals: string | null;
  intro_message: string | null;
  intro_role: string | null;
  intro_team: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Done',
  delayed:     'Delayed',
  skipped:     'Skipped',
};

const STATUS_COLOR: Record<string, string> = {
  pending:     '#8A8090',
  in_progress: '#3699FC',
  completed:   '#23CE68',
  delayed:     '#F68A29',
  skipped:     '#ED4551',
};

function StarRating({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <svg key={n} width="13" height="13" viewBox="0 0 24 24" fill={n <= score ? '#FFCE00' : 'none'} stroke={n <= score ? '#FFCE00' : '#C0B8C8'} strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className="text-xs font-bold text-brand-dark ml-1">{score}/5</span>
    </span>
  );
}

export default function TrainingDayPage() {
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<{ pre_confirmed: boolean; live_checkin: boolean } | null>(null);
  const [commitment, setCommitment] = useState<CommitmentPlan | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [preRating, setPreRating] = useState<number | null>(null);
  const [preNotes, setPreNotes] = useState<string | null>(null);

  // Inline action picker state
  const [pickerCount, setPickerCount] = useState<number | null>(null);
  const [actionTitles, setActionTitles] = useState<string[]>([]);
  const [savingActions, setSavingActions] = useState(false);

  const load = useCallback(async () => {
    const cRes = await fetch('/api/participant/cohort');
    if (!cRes.ok) return;
    const cData = await cRes.json();
    if (!cData.cohort) {
      setCohort(null);
      setLoading(false);
      return;
    }

    const ch = cData.cohort as Cohort;
    setCohort(ch);

    const [aRes, cmRes, obRes, asRes] = await Promise.all([
      fetch(`/api/attendance?cohort_id=${ch.id}`),
      fetch(`/api/commitments?cohort_id=${ch.id}`),
      fetch(`/api/onboarding?cohort_id=${ch.id}`),
      fetch(`/api/assessments?cohort_id=${ch.id}&phase=pre`),
    ]);

    if (aRes.ok) {
      const d = await aRes.json();
      setAttendance(d.attendance);
    }
    if (cmRes.ok) {
      const d = await cmRes.json();
      setCommitment(d.commitment_plan ?? null);
      setActions(d.actions ?? []);
    }
    if (obRes.ok) {
      const d = await obRes.json();
      setOnboarding(d.onboarding ?? null);
    }
    if (asRes.ok) {
      const d = await asRes.json();
      const row = (d.assessments ?? []).find((a: { skill_id: string | null; rating_score: number; reflection_notes: string | null }) => a.skill_id == null);
      if (row) {
        setPreRating(row.rating_score);
        setPreNotes(row.reflection_notes ?? null);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <>
        <Topbar title="Training Day" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 w-full rounded-2xl" />)}</div>
        </main>
      </>
    );
  }

  if (!cohort) {
    return (
      <>
        <Topbar title="Training Day" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <div className="card py-16 text-center max-w-md mx-auto">
            <p className="text-3xl mb-4">📅</p>
            <p className="font-bold text-brand-dark text-lg mb-2">No active cohort</p>
            <p className="text-text-muted text-sm">Once HR enrols you in a programme, your training day details will appear here.</p>
          </div>
        </main>
      </>
    );
  }

  const td = cohort.training_date;
  const before = isBeforeTrainingDay(td);
  const today = isTrainingDayToday(td);
  const after = isAfterTrainingDay(td);

  const att = attendance ?? { pre_confirmed: false, live_checkin: false };
  const actionCount = actions.length;
  const showDone = !!(commitment && actionCount > 0);
  const needsActions = !!(commitment && actionCount === 0);

  // All steps complete = attended + committed + has actions
  const allComplete = att.live_checkin && showDone;

  return (
    <>
      <Topbar title="Training Day" />
      <main className="flex-1 overflow-y-auto px-7 py-6 max-w-3xl">
        {before && (
          <div
            className="rounded-xl px-4 py-3 mb-6 text-sm font-semibold"
            style={{ background: 'rgba(34,29,35,0.06)', color: '#221D23' }}
          >
            Training coming up — complete your pre-training checklist first for the best experience.
          </div>
        )}

        {today && (
          <div
            className="rounded-[20px] p-6 mb-6 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #221D23 0%, #2E2433 100%)' }}
          >
            <div className="relative z-10">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-yellow mb-1">Today</p>
              <h1 className="text-xl font-black text-white">TODAY IS TRAINING DAY</h1>
              <p className="text-xs text-white/60 mt-2">{cohort.name}</p>
            </div>
          </div>
        )}

        {after && !today && (
          <div className="section-label mb-2">SESSION COMPLETE</div>
        )}

        <h2 className="section-title text-lg mb-1">{cohort.name}</h2>
        <p className="text-sm text-text-muted mb-6">
          {cohort.programmes?.name ?? 'Programme'} ·{' '}
          {new Date(td).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          {cohort.training_time && ` · ${cohort.training_time}`}
          {cohort.location && ` · ${cohort.location}`}
        </p>

        <div className="mb-6">
          <AttendanceConfirm
            cohortId={cohort.id}
            preConfirmed={att.pre_confirmed}
            liveCheckin={att.live_checkin}
            isTrainingDay={today}
            onUpdate={load}
          />
        </div>

        {needsActions && commitment && (
          <div
            className="rounded-[20px] overflow-hidden mb-6"
            style={{ border: '1.5px solid rgba(255,206,0,0.3)', animation: 'fadeUp 0.35s ease both' }}
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center gap-3" style={{ background: '#221D23' }}>
              <span className="text-xl">🎯</span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-brand-yellow mb-0.5">Training Day</div>
                <div className="text-base font-black text-white">Your Actions</div>
              </div>
            </div>

            <div className="bg-white px-6 py-5">
              {pickerCount === null ? (
                /* Step 1 — pick a count */
                <>
                  <p className="text-sm font-semibold text-brand-dark mb-1">
                    How many actions will you commit to?
                  </p>
                  <p className="text-xs text-text-muted mb-4">
                    Choose a number you can realistically act on.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setPickerCount(n);
                          setActionTitles(Array(n).fill(''));
                        }}
                        className="w-10 h-10 rounded-xl font-bold text-sm transition-all hover:scale-105 bg-[rgba(34,29,35,0.06)] text-[#221D23] border-[1.5px] border-[rgba(34,29,35,0.12)] hover:bg-[#FFCE00] hover:border-[#FFCE00] hover:shadow-[0_2px_8px_rgba(255,206,0,0.4)]"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                /* Step 2 — fill in the action fields */
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-brand-dark">
                      Describe your {pickerCount} action{pickerCount > 1 ? 's' : ''}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-text-muted hover:text-brand-dark"
                      onClick={() => { setPickerCount(null); setActionTitles([]); }}
                    >
                      ← Change number
                    </button>
                  </div>

                  <div className="space-y-3 mb-5">
                    {actionTitles.map((title, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                          style={{ background: '#FFCE0020', color: '#221D23', border: '1.5px solid #FFCE00' }}
                        >
                          {i + 1}
                        </span>
                        <input
                          type="text"
                          className="flex-1 rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/40"
                          style={{ borderColor: title.trim() ? 'rgba(255,206,0,0.5)' : 'rgba(34,29,35,0.12)' }}
                          placeholder={`Action ${i + 1} — what will you do?`}
                          value={title}
                          onChange={e => {
                            const next = [...actionTitles];
                            next[i] = e.target.value;
                            setActionTitles(next);
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn-primary w-full"
                    style={{ height: 48, fontSize: 14 }}
                    disabled={actionTitles.every(t => !t.trim()) || savingActions}
                    onClick={async () => {
                      const filled = actionTitles.filter(t => t.trim());
                      if (!filled.length || !commitment?.id) return;
                      setSavingActions(true);
                      try {
                        const res = await fetch('/api/actions/bulk', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            actions: filled.map(title => ({
                              commitment_plan_id: commitment.id,
                              custom_title: title.trim(),
                            })),
                          }),
                        });
                        if (res.ok) {
                          setPickerCount(null);
                          setActionTitles([]);
                          await load();
                        }
                      } finally {
                        setSavingActions(false);
                      }
                    }}
                  >
                    {savingActions ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        Saving…
                      </span>
                    ) : `Save ${actionTitles.filter(t => t.trim()).length} Action${actionTitles.filter(t => t.trim()).length !== 1 ? 's' : ''} →`}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── SESSION AGENDA (hidden — uncomment to restore) ──────────────
        {showAgenda && (
          <div className="card mb-6" style={{ marginBottom: 16 }}>
            <div className="section-label mb-3">SESSION AGENDA</div>
            <div className="space-y-2">
              {phases.map((ph, i) => (
                <div key={ph.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'rgba(34,29,35,0.06)' }}>
                  <span className="text-xs font-bold text-brand-dark w-6">{i + 1}</span>
                  <span className="text-sm font-semibold text-brand-dark">{ph.name}</span>
                </div>
              ))}
            </div>
            {!commitment && (
              <Link href="/participant/training-day/commitment" className="btn-primary w-full justify-center mt-4 inline-flex">
                Go to Commitment →
              </Link>
            )}
          </div>
        )}
        ─────────────────────────────────────────────────────────────── */}

        {today && att.live_checkin && !commitment && (
          <Link href="/participant/training-day/commitment" className="btn-primary w-full justify-center mt-4 inline-flex">
            Share your commitment →
          </Link>
        )}

        {/* ── FULL JOURNEY SUMMARY (shown once all steps are complete) ── */}
        {allComplete && commitment && (
          <div
            className="rounded-[20px] overflow-hidden mb-6"
            style={{ border: '1.5px solid rgba(35,206,104,0.25)', animation: 'fadeUp 0.4s ease both' }}
          >
            {/* Header */}
            <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #221D23 0%, #2E2433 100%)' }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-brand-yellow mb-0.5">Your Journey</div>
                  <div className="text-lg font-black text-white">Session Summary</div>
                </div>
              </div>
            </div>

            <div className="bg-white divide-y" style={{ borderColor: 'rgba(34,29,35,0.07)' }}>

              {/* ── Pre-training: Programme Rating ─────────────────── */}
              {preRating !== null && (
                <div className="px-6 py-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Programme Rating</div>
                  <StarRating score={preRating} />
                  {preNotes && (
                    <p className="text-xs text-text-secondary mt-2 leading-relaxed italic">&ldquo;{preNotes}&rdquo;</p>
                  )}
                </div>
              )}

              {/* ── Pre-training: Expectations ─────────────────────── */}
              {(onboarding?.expectations || onboarding?.session_goals) && (
                <div className="px-6 py-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Your Expectations</div>
                  {onboarding.expectations && (
                    <p className="text-sm text-brand-dark leading-relaxed mb-2">{onboarding.expectations}</p>
                  )}
                  {onboarding.session_goals && (
                    <>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1 mt-3">Session Goals</div>
                      <p className="text-sm text-text-secondary leading-relaxed">{onboarding.session_goals}</p>
                    </>
                  )}
                </div>
              )}

              {/* ── Pre-training: Introduction ─────────────────────── */}
              {onboarding?.intro_message && (
                <div className="px-6 py-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Your Introduction</div>
                  {(onboarding.intro_role || onboarding.intro_team) && (
                    <div className="flex gap-4 mb-2">
                      {onboarding.intro_role && (
                        <span className="text-xs font-semibold text-brand-purple">{onboarding.intro_role}</span>
                      )}
                      {onboarding.intro_team && (
                        <span className="text-xs text-text-muted">{onboarding.intro_team}</span>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-brand-dark leading-relaxed">{onboarding.intro_message}</p>
                </div>
              )}

              {/* ── Training Day: Commitment ───────────────────────── */}
              <div className="px-6 py-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Your Commitment</div>
                <p className="text-sm font-semibold text-brand-dark leading-relaxed mb-2">{commitment.main_commitment}</p>
                {commitment.why_text && (
                  <div className="mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Why: </span>
                    <span className="text-xs text-text-secondary">{commitment.why_text}</span>
                  </div>
                )}
                {commitment.blockers && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Potential blockers: </span>
                    <span className="text-xs text-text-secondary">{commitment.blockers}</span>
                  </div>
                )}
              </div>

              {/* ── Training Day: Actions ──────────────────────────── */}
              {actions.length > 0 && (
                <div className="px-6 py-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">
                    Your Actions ({actionCount})
                  </div>
                  <div className="space-y-2">
                    {actions.map((action, i) => (
                      <div key={action.id} className="flex items-start gap-3">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 mt-0.5"
                          style={{ background: 'rgba(98,60,234,0.1)', color: '#623CEA' }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-brand-dark font-medium leading-snug">
                            {action.custom_title ?? action.builds_capability ?? '—'}
                          </p>
                          {action.builds_capability && action.custom_title && (
                            <p className="text-[11px] text-text-muted mt-0.5">{action.builds_capability}</p>
                          )}
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-pill flex-shrink-0 mt-0.5"
                          style={{ background: `${STATUS_COLOR[action.status] ?? '#8A8090'}18`, color: STATUS_COLOR[action.status] ?? '#8A8090' }}
                        >
                          {STATUS_LABEL[action.status] ?? action.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Footer CTA ─────────────────────────────────────── */}
              <div className="px-6 py-4 flex gap-3" style={{ background: 'rgba(34,29,35,0.02)' }}>
                <Link href="/participant/progress" className="btn-primary flex-1 justify-center inline-flex" style={{ height: 44, fontSize: 13 }}>
                  View My Progress →
                </Link>
                <Link href="/participant/training-day/commitment" className="btn-outline flex-shrink-0 justify-center inline-flex" style={{ height: 44, fontSize: 13 }}>
                  Edit
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Fallback: commitment exists but no actions yet (showDone = false) or checkin not done */}
        {!allComplete && commitment && !needsActions && (
          <div className="card" style={{ background: '#FAFFF7', border: '1px solid rgba(35,206,104,0.2)' }}>
            <div className="section-label mb-2">YOUR COMMITMENT</div>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">{commitment.main_commitment}</p>
            <div className="text-xs text-text-muted mb-4">
              {actionCount} action{actionCount !== 1 ? 's' : ''} set
            </div>
            <Link href="/participant/progress" className="btn-secondary w-full justify-center inline-flex">
              View My Progress
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
