'use client';

import { useState } from 'react';

interface Nudge {
  id: string;
  what: string;
  how: string | null;
  why: string | null;
  time_minutes: number;
  scheduled_date: string | null;
  skills: { id: string; name: string } | null;
  created_at: string;
}

interface NudgeCardProps {
  nudge: Nudge;
  onDeleted?: (id: string) => void;
}

export default function NudgeCard({ nudge, onDeleted }: NudgeCardProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete nudge "${nudge.what}"?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/nudges/${nudge.id}`, { method: 'DELETE' });
    if (res.ok) onDeleted?.(nudge.id);
    else setDeleting(false);
  }

  return (
    <div className="card mb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {nudge.scheduled_date && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(255,206,0,0.15)', color: '#A07A00' }}
              >
                📅 {new Date(nudge.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
            {nudge.skills && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(98,60,234,0.1)', color: 'var(--purple)' }}
              >
                {nudge.skills.name}
              </span>
            )}
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(34,29,35,0.06)', color: 'var(--text-muted)' }}
            >
              ⏱ {nudge.time_minutes} min
            </span>
          </div>

          <h3 className="font-bold text-brand-dark text-sm mb-1">{nudge.what}</h3>

          {nudge.how && (
            <div className="mb-1">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>HOW</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{nudge.how}</p>
            </div>
          )}
          {nudge.why && (
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>WHY</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{nudge.why}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs px-3 py-1.5 rounded-full font-medium flex-shrink-0"
          style={{ background: 'rgba(237,69,81,0.1)', color: 'var(--red)' }}
        >
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
