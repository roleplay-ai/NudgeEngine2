'use client';

import { useState } from 'react';

interface Props {
  cohortId: string;
  initial?: {
    main_commitment: string;
    why_text: string | null;
    blockers: string | null;
  } | null;
  onSaved: () => void;
}

export default function CommitmentForm({ cohortId, initial, onSaved }: Props) {
  const [main, setMain] = useState(initial?.main_commitment ?? '');
  const [why, setWhy] = useState(initial?.why_text ?? '');
  const [blockers, setBlockers] = useState(initial?.blockers ?? '');
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohort_id: cohortId,
          main_commitment: main.trim(),
          why_text: why.trim() || null,
          blockers: blockers.trim() || null,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    <>
      <label className="text-sm font-bold text-brand-dark block mb-2">Your commitment</label>
      <p className="text-xs text-text-muted mb-3">What is your main commitment coming out of today?</p>
      <textarea
        className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-yellow/40"
        style={{ borderColor: 'rgba(34,29,35,0.12)', minHeight: 120 }}
        value={main}
        onChange={e => { if (e.target.value.length <= 500) setMain(e.target.value); }}
        placeholder="I commit to having weekly 1:1s with each of my team members…"
        maxLength={500}
      />
      <div className="text-right text-[10px] text-text-muted mt-1">{main.length}/500</div>
    </>,
    <>
      <label className="text-sm font-bold text-brand-dark block mb-2">Your why</label>
      <p className="text-xs text-text-muted mb-3">Why does this matter to you? (optional but encouraged)</p>
      <textarea
        className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
        style={{ borderColor: 'rgba(34,29,35,0.12)', minHeight: 100 }}
        value={why}
        onChange={e => setWhy(e.target.value)}
        placeholder="Because my team deserves clarity and support…"
      />
    </>,
    <>
      <label className="text-sm font-bold text-brand-dark block mb-2">Potential blockers</label>
      <p className="text-xs text-text-muted mb-3">What might get in the way? (optional)</p>
      <textarea
        className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        style={{ borderColor: 'rgba(34,29,35,0.12)', minHeight: 100 }}
        value={blockers}
        onChange={e => setBlockers(e.target.value)}
        placeholder="Back-to-back meetings, travel, etc."
      />
    </>,
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        {[0, 1, 2].map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold"
              style={{
                background: step >= s ? '#FFCE00' : 'rgba(34,29,35,0.08)',
                color: step >= s ? '#221D23' : '#8A8090',
              }}
            >
              {s + 1}
            </div>
            {s < 2 && <div className="flex-1 h-px" style={{ background: step > s ? '#FFCE00' : 'rgba(34,29,35,0.1)' }} />}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 0 }}>
        {steps[step]}
        <div className="flex justify-between mt-6 gap-3">
          {step > 0 ? (
            <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button
              type="button"
              className="btn-primary ml-auto"
              disabled={step === 0 && main.trim().length < 5}
              onClick={() => setStep(step + 1)}
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary ml-auto"
              disabled={main.trim().length < 5 || saving}
              onClick={submit}
            >
              {saving ? 'Saving…' : 'Save commitment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
