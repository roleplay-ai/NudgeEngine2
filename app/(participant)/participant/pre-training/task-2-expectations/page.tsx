'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TaskStepIndicator from '@/components/participant/TaskStepIndicator';

export default function Task2ExpectationsPage() {
  const router = useRouter();
  const [cohortId, setCohortId] = useState('');
  const [expectations, setExpectations] = useState('');
  const [sessionGoals, setSessionGoals] = useState('');
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saved, setSaved] = useState(false);

  const cohortIdRef    = useRef('');
  const expectationsRef = useRef('');
  const goalsRef       = useRef('');
  const debounceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/participant/cohort');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.cohort) return;
      setCohortId(data.cohort.id);
      cohortIdRef.current = data.cohort.id;

      const obRes = await fetch(`/api/onboarding?cohort_id=${data.cohort.id}`);
      if (obRes.ok) {
        const obData = await obRes.json();
        if (obData.onboarding) {
          const exp = obData.onboarding.expectations ?? '';
          const goals = obData.onboarding.session_goals ?? '';
          setExpectations(exp);
          setSessionGoals(goals);
          expectationsRef.current = exp;
          goalsRef.current = goals;
          if (exp.trim()) {
            setSaved(true);
            setAutoSaveStatus('saved');
            // Ensure task_completions has the 'shape' row even if it was missed on a prior session
            fetch('/api/participant/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ task_type: 'shape', cohort_id: data.cohort.id }),
            }).catch(() => {});
          }
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const persistDraft = useCallback(async (exp: string, goals: string, cId: string) => {
    if (!cId) return;
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohort_id: cId, expectations: exp, session_goals: goals }),
    });
  }, []);

  const scheduleDraftSave = useCallback((exp: string, goals: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setAutoSaveStatus('saving');
    debounceTimer.current = setTimeout(async () => {
      await persistDraft(exp, goals, cohortIdRef.current);
      setAutoSaveStatus('saved');
    }, 1500);
  }, [persistDraft]);

  const handleExpectationsChange = (val: string) => {
    setExpectations(val);
    expectationsRef.current = val;
    scheduleDraftSave(val, goalsRef.current);
  };

  const handleGoalsChange = (val: string) => {
    setSessionGoals(val);
    goalsRef.current = val;
    scheduleDraftSave(expectationsRef.current, val);
  };

  async function handleContinue() {
    if (navigating) return;
    setNavigating(true);
    try {
      // Cancel any pending debounce and flush save immediately
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      await persistDraft(expectationsRef.current, goalsRef.current, cohortIdRef.current);

      await fetch('/api/participant/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_type: 'shape', cohort_id: cohortIdRef.current }),
      });

      setSaved(true);
      router.push('/participant/pre-training/task-3-prereads');
    } catch {
      alert('Failed to save. Please try again.');
      setNavigating(false);
    }
  }

  if (loading) {
    return (
      <main className="task-page flex-1 overflow-y-auto px-7 py-6">
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
      </main>
    );
  }

  const canContinue = expectations.trim().length > 5;

  return (
    <main className="task-page flex-1 overflow-y-auto px-7 py-6">
      <TaskStepIndicator currentStep={1} isCurrentDone={saved} />

      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-1">
          <div className="section-label" style={{ color: '#623CEA' }}>TASK 02</div>
          {/* Auto-save indicator */}
          {autoSaveStatus === 'saving' && (
            <span className="text-[11px] text-text-muted flex items-center gap-1">
              <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              Saving…
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-[11px] text-brand-green flex items-center gap-1 font-semibold">
              ✓ Draft saved
            </span>
          )}
        </div>

        <h1 className="section-title text-xl mb-1">Shape the Session</h1>
        <p className="text-sm text-text-muted mb-6">
          Help your trainer design the session around what matters to you and your peers.
        </p>

        <div className="space-y-5">
          <div className="card" style={{ marginBottom: 0 }}>
            <label className="text-sm font-bold text-brand-dark block mb-2">Your Expectations *</label>
            <p className="text-xs text-text-muted mb-3">What do you want to get from this training?</p>
            <textarea
              className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
              style={{ borderColor: 'rgba(34,29,35,0.12)', minHeight: 100 }}
              value={expectations}
              onChange={e => handleExpectationsChange(e.target.value)}
              placeholder="I'm hoping to improve my confidence when giving feedback to senior team members..."
            />
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <label className="text-sm font-bold text-brand-dark block mb-2">Session Goals</label>
            <p className="text-xs text-text-muted mb-3">What specific outcomes would make this a success for you?</p>
            <textarea
              className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
              style={{ borderColor: 'rgba(34,29,35,0.12)', minHeight: 80 }}
              value={sessionGoals}
              onChange={e => handleGoalsChange(e.target.value)}
              placeholder="I want to leave with 2-3 practical techniques I can use immediately..."
            />
          </div>
        </div>

        <button
          className="btn-primary w-full mt-6"
          type="button"
          onClick={handleContinue}
          disabled={!canContinue || navigating}
          style={{ height: 48, fontSize: 14 }}
        >
          {navigating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              Saving…
            </span>
          ) : 'Continue to Pre-reads →'}
        </button>

        <button
          type="button"
          className="btn-outline w-full mt-3"
          onClick={() => router.push('/participant/pre-training')}
          style={{ height: 40, fontSize: 13 }}
        >
          ← Back to Hub
        </button>
      </div>
    </main>
  );
}
