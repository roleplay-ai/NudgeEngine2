'use client';

import { useState } from 'react';

interface Skill {
  id: string;
  name: string;
}

interface NudgeBuilderProps {
  cohortId: string;
  skills: Skill[];
  onCreated?: (nudge: Record<string, unknown>) => void;
}

const TIME_OPTIONS = [5, 10, 15, 20, 30];

export default function NudgeBuilder({ cohortId, skills, onCreated }: NudgeBuilderProps) {
  const [what, setWhat] = useState('');
  const [how, setHow] = useState('');
  const [why, setWhy] = useState('');
  const [timeMinutes, setTimeMinutes] = useState(5);
  const [skillId, setSkillId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!what.trim()) { setError('The "What" field is required.'); return; }
    setSaving(true);
    setError('');

    const res = await fetch('/api/nudges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cohort_id: cohortId,
        what: what.trim(),
        how: how.trim() || null,
        why: why.trim() || null,
        time_minutes: timeMinutes,
        skill_id: skillId || null,
        scheduled_date: scheduledDate || null,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error ?? 'Failed to create nudge'); return; }

    onCreated?.(data.nudge);
    setWhat(''); setHow(''); setWhy(''); setTimeMinutes(5); setSkillId(''); setScheduledDate('');
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="font-bold text-brand-dark text-base mb-4">Create Nudge</h2>

      {/* WHAT */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-brand-dark mb-1">
          What <span style={{ color: 'var(--red)' }}>*</span>
        </label>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          The micro-action — short and specific
        </p>
        <input
          type="text"
          value={what}
          onChange={e => setWhat(e.target.value)}
          placeholder="e.g. Have a 5-min feedback conversation with a team member"
          maxLength={200}
          className="w-full rounded-xl px-4 py-3 text-sm"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', outline: 'none' }}
        />
      </div>

      {/* HOW */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-brand-dark mb-1">How</label>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Step-by-step instructions</p>
        <textarea
          rows={3}
          value={how}
          onChange={e => setHow(e.target.value)}
          placeholder={`1. Pick one team member.\n2. Find a quiet moment.\n3. Share one observation...`}
          className="w-full rounded-xl px-4 py-3 text-sm resize-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', outline: 'none' }}
        />
      </div>

      {/* WHY */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-brand-dark mb-1">Why</label>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Motivation — why this matters</p>
        <textarea
          rows={2}
          value={why}
          onChange={e => setWhy(e.target.value)}
          placeholder="Regular feedback builds psychological safety and trust…"
          className="w-full rounded-xl px-4 py-3 text-sm resize-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', outline: 'none' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* TIME */}
        <div>
          <label className="block text-sm font-semibold text-brand-dark mb-2">Time</label>
          <div className="flex gap-2 flex-wrap">
            {TIME_OPTIONS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeMinutes(t)}
                className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                style={{
                  background: timeMinutes === t ? 'var(--yellow)' : 'rgba(34,29,35,0.06)',
                  color: timeMinutes === t ? 'var(--dark)' : 'var(--text-secondary)',
                }}
              >
                {t}m
              </button>
            ))}
          </div>
        </div>

        {/* SKILL */}
        <div>
          <label className="block text-sm font-semibold text-brand-dark mb-2">Skill (optional)</label>
          <select
            value={skillId}
            onChange={e => setSkillId(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', outline: 'none' }}
          >
            <option value="">— None —</option>
            {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* SCHEDULE */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-brand-dark mb-1">Schedule Date (optional)</label>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          Participants will receive an email on this date at 9am
        </p>
        <input
          type="date"
          value={scheduledDate}
          onChange={e => setScheduledDate(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', outline: 'none' }}
        />
      </div>

      {/* Preview */}
      {what.trim() && (
        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: 'var(--dark)', color: '#fff' }}
        >
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--yellow)', letterSpacing: '0.08em' }}>
            TODAY&apos;S NUDGE — PREVIEW
          </p>
          <p className="font-bold text-sm mb-1">{what}</p>
          {how && <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}><strong>How:</strong> {how}</p>}
          {why && <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}><strong>Why:</strong> {why}</p>}
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>⏱ {timeMinutes} min</p>
        </div>
      )}

      {error && <p className="text-sm mb-3" style={{ color: 'var(--red)' }}>{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="btn-primary w-full"
        style={{ opacity: saving ? 0.6 : 1 }}
      >
        {saving ? 'Creating…' : scheduledDate ? '📅 Schedule Nudge' : 'Create Nudge'}
      </button>
    </form>
  );
}
