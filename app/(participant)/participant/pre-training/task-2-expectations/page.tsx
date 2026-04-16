'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Task2ExpectationsPage() {
  const router = useRouter();
  const [cohortId, setCohortId] = useState('');
  const [expectations, setExpectations] = useState('');
  const [sessionGoals, setSessionGoals] = useState('');
  const [introRole, setIntroRole] = useState('');
  const [introTeam, setIntroTeam] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/participant/cohort');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.cohort) return;
      setCohortId(data.cohort.id);

      const obRes = await fetch(`/api/onboarding?cohort_id=${data.cohort.id}`);
      if (obRes.ok) {
        const obData = await obRes.json();
        if (obData.onboarding) {
          setExpectations(obData.onboarding.expectations ?? '');
          setSessionGoals(obData.onboarding.session_goals ?? '');
          setIntroRole(obData.onboarding.intro_role ?? '');
          setIntroTeam(obData.onboarding.intro_team ?? '');
        }
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
          expectations,
          session_goals: sessionGoals,
          intro_role: introRole,
          intro_team: introTeam,
        }),
      });

      await fetch('/api/participant/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_type: 'shape', cohort_id: cohortId }),
      });

      setSubmitted(true);
      setTimeout(() => router.push('/participant/pre-training'), 2000);
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto px-7 py-6">
        <div className="card py-12 text-center"><p className="text-text-muted">Loading...</p></div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex-1 overflow-y-auto px-7 py-6">
        <div className="card py-16 text-center max-w-md mx-auto">
          <p className="text-4xl mb-4">🎯</p>
          <h2 className="font-bold text-brand-dark text-xl mb-2">Expectations Saved!</h2>
          <p className="text-sm text-text-muted">
            Your trainer will use your input to shape the session. Redirecting you back...
          </p>
          <div className="mt-4 w-12 h-1 mx-auto rounded-full" style={{ background: '#623CEA', animation: 'glowPulse 1.5s infinite' }} />
        </div>
      </main>
    );
  }

  const canSubmit = expectations.trim().length > 5;

  return (
    <main className="flex-1 overflow-y-auto px-7 py-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['Programme', 'Expectations', 'Introductions', 'Pre-reads'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold"
              style={{
                background: i <= 1 ? (i === 1 ? '#623CEA' : '#23CE68') : 'rgba(34,29,35,0.08)',
                color: i <= 1 ? '#fff' : '#8A8090',
              }}
            >
              {i < 1 ? '✓' : i + 1}
            </div>
            <span className="text-xs font-semibold" style={{ color: i === 1 ? '#221D23' : '#8A8090' }}>
              {label}
            </span>
            {i < 3 && <div className="w-8 h-px" style={{ background: 'rgba(34,29,35,0.12)' }} />}
          </div>
        ))}
      </div>

      <div className="max-w-2xl">
        <div className="section-label" style={{ color: '#623CEA' }}>TASK 02</div>
        <h1 className="section-title text-xl mb-1">Shape the Session</h1>
        <p className="text-sm text-text-muted mb-6">
          Help your trainer design the session around what matters to you and your peers.
        </p>

        <div className="space-y-5">
          <div className="card" style={{ marginBottom: 0 }}>
            <label className="text-sm font-bold text-brand-dark block mb-2">
              Your Expectations
            </label>
            <p className="text-xs text-text-muted mb-3">What do you want to get from this training?</p>
            <textarea
              className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
              style={{ borderColor: 'rgba(34,29,35,0.12)', minHeight: 100 }}
              value={expectations}
              onChange={e => setExpectations(e.target.value)}
              placeholder="I'm hoping to improve my confidence when giving feedback to senior team members..."
            />
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <label className="text-sm font-bold text-brand-dark block mb-2">
              Session Goals
            </label>
            <p className="text-xs text-text-muted mb-3">What specific outcomes would make this a success for you?</p>
            <textarea
              className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
              style={{ borderColor: 'rgba(34,29,35,0.12)', minHeight: 80 }}
              value={sessionGoals}
              onChange={e => setSessionGoals(e.target.value)}
              placeholder="I want to leave with 2-3 practical techniques I can use immediately..."
            />
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <label className="text-sm font-bold text-brand-dark block mb-3">
              Your Role & Team
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">Your Role</label>
                <input
                  type="text"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                  style={{ borderColor: 'rgba(34,29,35,0.12)' }}
                  value={introRole}
                  onChange={e => setIntroRole(e.target.value)}
                  placeholder="e.g. Team Lead"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">Your Team</label>
                <input
                  type="text"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                  style={{ borderColor: 'rgba(34,29,35,0.12)' }}
                  value={introTeam}
                  onChange={e => setIntroTeam(e.target.value)}
                  placeholder="e.g. Engineering"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          className="btn-primary w-full mt-6"
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          style={{ height: 48, fontSize: 14 }}
        >
          {saving ? 'Saving...' : 'Submit & Continue →'}
        </button>
      </div>
    </main>
  );
}
