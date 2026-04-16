'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import IntroCard from '@/components/participant/IntroCard';

interface IntroEntry {
  user: { id: string; name: string; avatar_url: string | null };
  onboarding: { intro_message: string; intro_role: string; intro_team: string };
}

export default function Task3IntroPage() {
  const router = useRouter();
  const [cohortId, setCohortId] = useState('');
  const [userId, setUserId] = useState('');
  const [introMessage, setIntroMessage] = useState('');
  const [introRole, setIntroRole] = useState('');
  const [introTeam, setIntroTeam] = useState('');
  const [batchIntros, setBatchIntros] = useState<IntroEntry[]>([]);
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

      const ucRes = await fetch('/api/participant/cohort');
      if (ucRes.ok) {
        const ucData = await ucRes.json();
        setUserId(ucData.user_cohort?.user_id ?? '');
      }

      const obRes = await fetch(`/api/onboarding?cohort_id=${data.cohort.id}`);
      if (obRes.ok) {
        const obData = await obRes.json();
        if (obData.onboarding) {
          setIntroMessage(obData.onboarding.intro_message ?? '');
          setIntroRole(obData.onboarding.intro_role ?? '');
          setIntroTeam(obData.onboarding.intro_team ?? '');
          if (obData.onboarding.intro_message) setSubmitted(true);
        }
      }

      const bRes = await fetch(`/api/onboarding/batch?cohort_id=${data.cohort.id}`);
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

      setSubmitted(true);

      const bRes = await fetch(`/api/onboarding/batch?cohort_id=${cohortId}`);
      if (bRes.ok) {
        const bData = await bRes.json();
        setBatchIntros(bData.intros ?? []);
      }
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

  const canSubmit = introMessage.trim().length >= 5;
  const otherIntros = batchIntros.filter(i => i.user.id !== userId);

  return (
    <main className="flex-1 overflow-y-auto px-7 py-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['Programme', 'Expectations', 'Introductions', 'Pre-reads'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold"
              style={{
                background: i <= 2 ? (i === 2 ? '#23CE68' : '#23CE68') : 'rgba(34,29,35,0.08)',
                color: i <= 2 ? '#fff' : '#8A8090',
              }}
            >
              {i < 2 ? '✓' : i + 1}
            </div>
            <span className="text-xs font-semibold" style={{ color: i === 2 ? '#221D23' : '#8A8090' }}>
              {label}
            </span>
            {i < 3 && <div className="w-8 h-px" style={{ background: 'rgba(34,29,35,0.12)' }} />}
          </div>
        ))}
      </div>

      <div className="max-w-2xl">
        <div className="section-label" style={{ color: '#23CE68' }}>TASK 03</div>
        <h1 className="section-title text-xl mb-1">Meet Your Batch</h1>
        <p className="text-sm text-text-muted mb-6">
          Say hello to the people you&apos;ll be training with! Share a little about yourself.
        </p>

        {/* My intro form */}
        <div className="card mb-6" style={{ background: submitted ? '#FAFFF7' : '#fff', borderColor: submitted ? 'rgba(35,206,104,0.2)' : undefined }}>
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
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
            >
              {saving ? 'Posting...' : 'Share Introduction 👋'}
            </button>
          )}

          {submitted && (
            <div className="flex items-center gap-2 mt-2 text-xs text-brand-green font-semibold">
              <span>✓ Published to your batch</span>
            </div>
          )}
        </div>

        {/* Batch intros */}
        {otherIntros.length >= 2 && (
          <>
            <div className="section-label mb-3">YOUR BATCH ({otherIntros.length} others)</div>
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
          </>
        )}

        {otherIntros.length < 2 && submitted && (
          <div className="card py-8 text-center" style={{ background: '#FAFBFF' }}>
            <p className="text-2xl mb-2">👥</p>
            <p className="text-sm text-text-muted">
              Waiting for more batch members to introduce themselves...
            </p>
          </div>
        )}

        {submitted && (
          <button
            className="btn-primary w-full mt-6"
            onClick={() => router.push('/participant/pre-training')}
            style={{ height: 48, fontSize: 14 }}
          >
            Continue →
          </button>
        )}
      </div>
    </main>
  );
}
