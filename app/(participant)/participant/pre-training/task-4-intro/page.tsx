'use client';

import { useEffect, useState } from 'react';
import IntroCard from '@/components/participant/IntroCard';
import TaskStepIndicator from '@/components/participant/TaskStepIndicator';

interface IntroEntry {
  user: { id: string; name: string; avatar_url: string | null };
  onboarding: { intro_message: string; intro_role: string; intro_team: string };
}

export default function Task4MeetBatchPage() {
  const [cohortId, setCohortId] = useState('');
  const [userId, setUserId] = useState('');
  const [introMessage, setIntroMessage] = useState('');
  const [introRole, setIntroRole] = useState('');
  const [introTeam, setIntroTeam] = useState('');
  const [batchIntros, setBatchIntros] = useState<IntroEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showBatch, setShowBatch] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/participant/cohort');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.cohort) return;
      setCohortId(data.cohort.id);
      setUserId(data.user_cohort?.user_id ?? '');

      const [obRes, bRes] = await Promise.all([
        fetch(`/api/onboarding?cohort_id=${data.cohort.id}`),
        fetch(`/api/onboarding/batch?cohort_id=${data.cohort.id}`),
      ]);

      if (obRes.ok) {
        const obData = await obRes.json();
        if (obData.onboarding) {
          setIntroMessage(obData.onboarding.intro_message ?? '');
          setIntroRole(obData.onboarding.intro_role ?? '');
          setIntroTeam(obData.onboarding.intro_team ?? '');
          if (obData.onboarding.intro_message?.trim()) {
            setSubmitted(true);
            // Ensure task_completions has the 'meet' row even if it was missed on a prior session
            fetch('/api/participant/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ task_type: 'meet', cohort_id: data.cohort.id }),
            }).catch(() => {});
          }
        }
      }
      if (bRes.ok) {
        const bData = await bRes.json();
        setBatchIntros(bData.intros ?? []);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit() {
    setSaving(true);
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohort_id: cohortId,
          intro_message: introMessage,
          intro_role: introRole,
          intro_team: introTeam,
        }),
      });

      await fetch('/api/participant/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_type: 'meet', cohort_id: cohortId }),
      });

      // Refresh batch intros in background
      fetch(`/api/onboarding/batch?cohort_id=${cohortId}`)
        .then(r => r.json())
        .then(d => setBatchIntros(d.intros ?? []))
        .catch(() => {});

      setSubmitted(true);
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="task-page flex-1 overflow-y-auto px-7 py-6">
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
      </main>
    );
  }

  const canSubmit = introMessage.trim().length >= 5;
  const otherIntros = batchIntros.filter(i => i.user.id !== userId);

  return (
    <main className="task-page flex-1 overflow-y-auto px-7 py-6">
      <TaskStepIndicator currentStep={3} isCurrentDone={submitted} />

      <div className="max-w-2xl">
        <div className="section-label" style={{ color: '#23CE68' }}>TASK 04</div>
        <h1 className="section-title text-xl mb-1">Meet Your Batch</h1>
        <p className="text-sm text-text-muted mb-6">
          Say hello to the people you&apos;ll be training with! Share a little about yourself.
        </p>

        {/* Intro form */}
        <div
          className="card mb-6"
          style={{
            background: submitted ? '#FAFFF7' : '#fff',
            borderColor: submitted ? 'rgba(35,206,104,0.2)' : undefined,
          }}
        >
          <div className="section-label mb-3">{submitted ? 'YOUR INTRODUCTION' : 'INTRODUCE YOURSELF'}</div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">Your Role</label>
              <input
                type="text"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                style={{ borderColor: 'rgba(34,29,35,0.12)' }}
                value={introRole}
                onChange={e => setIntroRole(e.target.value)}
                placeholder="e.g. Team Lead"
                disabled={submitted}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">Team / Department</label>
              <input
                type="text"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                style={{ borderColor: 'rgba(34,29,35,0.12)' }}
                value={introTeam}
                onChange={e => setIntroTeam(e.target.value)}
                placeholder="e.g. Engineering"
                disabled={submitted}
              />
            </div>
          </div>

          <label className="text-xs font-semibold text-text-secondary block mb-1.5">
            Your Introduction <span className="text-text-muted font-normal">(max 280 chars)</span>
          </label>
          <textarea
            className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            style={{ borderColor: 'rgba(34,29,35,0.12)', minHeight: 80 }}
            value={introMessage}
            onChange={e => { if (e.target.value.length <= 280) setIntroMessage(e.target.value); }}
            placeholder="I'm Arjun, a Team Lead in Engineering. I'm here to improve how I give feedback to my team."
            maxLength={280}
            disabled={submitted}
          />
          <div className="text-right text-[10px] text-text-muted mt-1">{introMessage.length}/280</div>

          {!submitted && (
            <button
              className="btn-primary w-full mt-3"
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  Posting…
                </span>
              ) : 'Share Introduction 👋'}
            </button>
          )}

          {submitted && (
            <div className="flex items-center gap-2 mt-2 text-xs text-brand-green font-semibold">
              <span>✓ Published to your batch</span>
            </div>
          )}
        </div>

        {/* Optional batch view — collapsed by default */}
        {submitted && (
          <div className="mb-6">
            <button
              type="button"
              className="w-full flex items-center justify-between px-5 py-3 rounded-2xl text-sm font-semibold transition-all"
              style={{
                background: showBatch ? 'rgba(35,206,104,0.08)' : 'rgba(34,29,35,0.04)',
                border: `1.5px solid ${showBatch ? 'rgba(35,206,104,0.25)' : 'rgba(34,29,35,0.1)'}`,
                color: '#221D23',
              }}
              onClick={() => setShowBatch(v => !v)}
            >
              <span>👥 See your batch {otherIntros.length > 0 ? `(${otherIntros.length} ${otherIntros.length === 1 ? 'member' : 'members'})` : ''}</span>
              <span style={{ fontSize: 18, lineHeight: 1, transform: showBatch ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
            </button>

            {showBatch && (
              <div className="mt-3" style={{ animation: 'fadeUp 0.25s ease both' }}>
                {otherIntros.length === 0 ? (
                  <div className="card py-6 text-center mb-0" style={{ background: '#FAFBFF' }}>
                    <p className="text-2xl mb-2">👥</p>
                    <p className="text-sm text-text-muted">Waiting for more batch members to introduce themselves…</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {otherIntros.map(intro => (
                      <IntroCard
                        key={intro.user.id}
                        name={intro.user.name}
                        avatarUrl={intro.user.avatar_url}
                        role={intro.onboarding.intro_role}
                        team={intro.onboarding.intro_team}
                        message={intro.onboarding.intro_message}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {submitted && (
          <>
            <div
              className="rounded-2xl px-5 py-4 mb-4 flex items-center gap-3"
              style={{ background: '#F0FFF7', border: '1.5px solid rgba(35,206,104,0.3)' }}
            >
              <span className="text-2xl">🎉</span>
              <div>
                <div className="text-sm font-bold text-brand-dark">All tasks complete!</div>
                <div className="text-xs text-text-muted">You&apos;re fully prepared for training day. See you there!</div>
              </div>
            </div>
            {/* Hard navigate so the server component re-runs and shows all 4 tasks as done */}
            <a
              href="/participant/pre-training"
              className="btn-primary w-full flex items-center justify-center no-underline"
              style={{ height: 48, fontSize: 14 }}
            >
              View Your Readiness Hub →
            </a>
          </>
        )}

        {!submitted && (
          <a
            href="/participant/pre-training"
            className="btn-outline w-full mt-3 flex items-center justify-center no-underline"
            style={{ height: 40, fontSize: 13 }}
          >
            ← Back to Hub
          </a>
        )}
      </div>
    </main>
  );
}
