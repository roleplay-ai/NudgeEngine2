'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProgrammeRatingCard from '@/components/participant/ProgrammeRatingCard';
import BatchAverageReveal from '@/components/participant/BatchAverageReveal';

const STEP_LABELS = ['Programme', 'Expectations', 'Introductions', 'Pre-reads'] as const;

export default function Task1ProgrammeRatingPage() {
  const router = useRouter();
  const [cohortId, setCohortId] = useState('');
  const [programmeName, setProgrammeName] = useState('');
  const [programmeDescription, setProgrammeDescription] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [reflectionNotes, setReflectionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAverage, setShowAverage] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/participant/cohort');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.cohort) return;

      setCohortId(data.cohort.id);
      const prog = data.cohort.programmes as { name?: string; description?: string | null } | null;
      setProgrammeName(prog?.name?.trim() || 'Your programme');
      setProgrammeDescription(prog?.description ?? null);

      const aRes = await fetch(`/api/assessments?cohort_id=${data.cohort.id}&phase=pre`);
      if (aRes.ok) {
        const aData = await aRes.json();
        const list = (aData.assessments ?? []) as { skill_id: string | null; rating_score: number; reflection_notes: string | null }[];
        const programmeRow = list.find(a => a.skill_id == null);
        if (programmeRow) {
          setRating(programmeRow.rating_score);
          setReflectionNotes(programmeRow.reflection_notes ?? '');
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const onRatingChange = useCallback((score: number) => {
    setRating(score);
  }, []);

  const onNotesChange = useCallback((notes: string) => {
    setReflectionNotes(notes);
  }, []);

  const canContinue = rating >= 1 && rating <= 5;

  async function handleSubmit() {
    if (!canContinue) return;
    setSaving(true);
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohort_id: cohortId,
          skill_id: null,
          rating_score: rating,
          reflection_notes: reflectionNotes.trim() || null,
          phase: 'pre',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Save failed');
      }

      await fetch('/api/participant/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_type: 'compare', cohort_id: cohortId }),
      });

      router.push('/participant/pre-training');
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto px-7 py-6">
        <div className="card py-12 text-center"><p className="text-text-muted">Loading…</p></div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-7 py-6">
      <div className="flex items-center gap-2 mb-6">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold"
              style={{
                background: i === 0 ? '#FFCE00' : 'rgba(34,29,35,0.08)',
                color: i === 0 ? '#221D23' : '#8A8090',
              }}
            >
              {i + 1}
            </div>
            <span className="text-xs font-semibold" style={{ color: i === 0 ? '#221D23' : '#8A8090' }}>
              {label}
            </span>
            {i < 3 && <div className="w-8 h-px" style={{ background: 'rgba(34,29,35,0.12)' }} />}
          </div>
        ))}
      </div>

      <div className="max-w-2xl">
        <div className="section-label" style={{ color: '#FFCE00' }}>TASK 01</div>
        <h1 className="section-title text-xl mb-1">Programme rating</h1>
        <p className="text-sm text-text-muted mb-6">
          Share how you feel about this programme before the session. Your facilitator uses this to tune the experience — not to judge you.
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
            className="btn-secondary w-full mt-6"
            type="button"
            onClick={() => setShowAverage(true)}
            style={{ borderColor: '#623CEA', color: '#623CEA' }}
          >
            📊 See how your batch rated
          </button>
        )}

        {showAverage && (
          <div className="mt-6">
            <BatchAverageReveal
              cohortId={cohortId}
              programmeName={programmeName}
              userRating={rating}
            />
          </div>
        )}

        <button
          className="btn-primary w-full mt-6"
          type="button"
          onClick={handleSubmit}
          disabled={!canContinue || saving}
          style={{ height: 48, fontSize: 14 }}
        >
          {saving ? 'Saving...' : 'Save & Continue →'}
        </button>
      </div>
    </main>
  );
}
