'use client';

import { useState } from 'react';

interface ConfidenceCheckinProps {
  cohortId: string;
  weekNumber: number;
  existingScore?: number | null;
  existingReflection?: string | null;
  onSaved?: (score: number, reflection: string) => void;
}

function getScoreColor(score: number): string {
  if (score <= 3) return 'var(--red)';
  if (score <= 6) return 'var(--orange)';
  if (score <= 8) return 'var(--yellow)';
  return 'var(--green)';
}

function getScoreLabel(score: number): string {
  if (score <= 2) return 'Not confident at all';
  if (score <= 4) return 'A little uncertain';
  if (score <= 6) return 'Getting there';
  if (score <= 8) return 'Fairly confident';
  return 'Very confident!';
}

export default function ConfidenceCheckin({
  cohortId,
  weekNumber,
  existingScore,
  existingReflection,
  onSaved,
}: ConfidenceCheckinProps) {
  const [score, setScore] = useState<number>(existingScore ?? 5);
  const [reflection, setReflection] = useState(existingReflection ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(existingScore != null);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/confidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohort_id: cohortId, confidence_score: score, reflection, week_number: weekNumber }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed');
      }
      setSaved(true);
      onSaved?.(score, reflection);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2 className="font-bold text-brand-dark mb-1">Week {weekNumber} Confidence</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>How confident are you applying your training right now?</p>

      {/* Slider */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
          <span>1 — Low</span>
          <span>10 — High</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={score}
          onChange={e => { setScore(Number(e.target.value)); setSaved(false); }}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: getScoreColor(score) }}
        />
        <div className="flex justify-center mt-3">
          <div
            className="text-5xl font-black rounded-2xl w-24 h-24 flex flex-col items-center justify-center"
            style={{ background: `${getScoreColor(score)}22`, color: getScoreColor(score) }}
          >
            {score}
            <span className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
              {getScoreLabel(score)}
            </span>
          </div>
        </div>
      </div>

      {/* Reflection */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-brand-dark mb-2">
          What changed this week? What did you apply?
        </label>
        <textarea
          rows={3}
          value={reflection}
          onChange={e => { setReflection(e.target.value); setSaved(false); }}
          placeholder="Write a short reflection…"
          className="w-full rounded-xl px-4 py-3 text-sm resize-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', outline: 'none' }}
        />
      </div>

      {error && <p className="text-sm mb-2" style={{ color: 'var(--red)' }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving || saved}
        className="btn-primary w-full"
        style={{ opacity: saving ? 0.6 : 1 }}
      >
        {saved ? '✓ Saved — Update' : saving ? 'Saving…' : 'Submit check-in'}
      </button>
    </div>
  );
}
