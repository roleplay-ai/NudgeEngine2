'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProgrammeRatingCard from '@/components/participant/ProgrammeRatingCard';
import BatchAverageReveal from '@/components/participant/BatchAverageReveal';
import TaskStepIndicator from '@/components/participant/TaskStepIndicator';

export default function Task1ProgrammeRatingPage() {
  const router = useRouter();
  const [cohortId, setCohortId] = useState('');
  const [programmeName, setProgrammeName] = useState('');
  const [programmeDescription, setProgrammeDescription] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [reflectionNotes, setReflectionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAverage, setShowAverage] = useState(false);

  // Track latest values for the fire-and-forget auto-save
  const latestRating = useRef(0);
  const latestNotes  = useRef('');
  const cohortIdRef  = useRef('');

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/participant/cohort');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.cohort) return;

      setCohortId(data.cohort.id);
      cohortIdRef.current = data.cohort.id;
      const prog = data.cohort.programmes as { name?: string; description?: string | null } | null;
      setProgrammeName(prog?.name?.trim() || 'Your programme');
      setProgrammeDescription(prog?.description ?? null);

      const aRes = await fetch(`/api/assessments?cohort_id=${data.cohort.id}&phase=pre`);
      if (aRes.ok) {
        const aData = await aRes.json();
        const list = (aData.assessments ?? []) as { skill_id: string | null; rating_score: number; reflection_notes: string | null }[];
        const row = list.find(a => a.skill_id == null);
        if (row) {
          setRating(row.rating_score);
          latestRating.current = row.rating_score;
          setReflectionNotes(row.reflection_notes ?? '');
          latestNotes.current = row.reflection_notes ?? '';
          setSaved(true);
          // Ensure task_completions has the 'compare' row even if it was missed on a prior session
          fetch('/api/participant/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_type: 'compare', cohort_id: data.cohort.id }),
          }).catch(() => {});
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  // Auto-save to DB immediately when rating is selected (fire-and-forget)
  const autoSave = useCallback(async (score: number, notes: string, cId: string) => {
    if (!score || !cId) return;
    await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cohort_id: cId,
        skill_id: null,
        rating_score: score,
        reflection_notes: notes.trim() || null,
        phase: 'pre',
      }),
    });
  }, []);

  const onRatingChange = useCallback((score: number) => {
    setRating(score);
    latestRating.current = score;
    setSaved(false);
    // Auto-save immediately on rating click
    autoSave(score, latestNotes.current, cohortIdRef.current);
  }, [autoSave]);

  const onNotesChange = useCallback((notes: string) => {
    setReflectionNotes(notes);
    latestNotes.current = notes;
  }, []);

  async function handleContinue() {
    if (!latestRating.current || navigating) return;
    setNavigating(true);
    try {
      // Ensure latest rating + notes are persisted
      await autoSave(latestRating.current, latestNotes.current, cohortIdRef.current);
      // Mark task complete
      await fetch('/api/participant/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_type: 'compare', cohort_id: cohortIdRef.current }),
      });
      setSaved(true);
      router.push('/participant/pre-training/task-2-expectations');
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

  const canContinue = rating >= 1 && rating <= 5;

  return (
    <main className="task-page flex-1 overflow-y-auto px-7 py-6">
      <TaskStepIndicator currentStep={0} isCurrentDone={saved} />

      <div className="max-w-2xl">
        <div className="section-label" style={{ color: '#FFCE00' }}>TASK 01</div>
        <h1 className="section-title text-xl mb-1">Programme Rating</h1>
        <p className="text-sm text-text-muted mb-6">
          Share how you feel about this programme before the session. Your facilitator uses this to tune the experience.
        </p>

        <ProgrammeRatingCard
          programmeName={programmeName}
          programmeDescription={programmeDescription}
          rating={rating}
          reflectionNotes={reflectionNotes}
          onRatingChange={onRatingChange}
          onNotesChange={onNotesChange}
        />

        {canContinue && !showAverage && (
          <button
            className="btn-secondary w-full mt-4"
            type="button"
            onClick={() => setShowAverage(true)}
            style={{ borderColor: '#623CEA', color: '#623CEA' }}
          >
            📊 See how your batch rated
          </button>
        )}

        {showAverage && cohortId && (
          <div className="mt-4">
            <BatchAverageReveal cohortId={cohortId} programmeName={programmeName} userRating={rating} />
          </div>
        )}

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
          ) : saved ? 'Continue to Task 2 →' : 'Save & Continue →'}
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
