'use client';

import { useState } from 'react';

type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'skipped';

interface Skill {
  id: string;
  name: string;
}

interface UserAction {
  id: string;
  custom_title: string | null;
  action_template_id: string | null;
  status: ActionStatus;
  nudge_scheduled_date: string | null;
  completed_at: string | null;
  skills: Skill | null;
}

interface ActionTemplate {
  title: string;
  capability: string | null;
}

interface ActionProgressCardProps {
  action: UserAction;
  template?: ActionTemplate | null;
  onStatusChange?: (actionId: string, status: ActionStatus) => void;
  onComplete?: (actionId: string) => void;
}

const STATUS_CONFIG: Record<ActionStatus, { label: string; dot: string; next: ActionStatus }> = {
  pending:     { label: 'Pending',     dot: '#8A8090',         next: 'in_progress' },
  in_progress: { label: 'In Progress', dot: 'var(--yellow)',   next: 'completed'   },
  completed:   { label: 'Completed',   dot: 'var(--green)',    next: 'completed'   },
  delayed:     { label: 'Delayed',     dot: 'var(--orange)',   next: 'in_progress' },
  skipped:     { label: 'Skipped',     dot: 'var(--red)',      next: 'pending'     },
};

const STATUS_ORDER: ActionStatus[] = ['pending', 'in_progress', 'completed', 'delayed', 'skipped'];

export default function ActionProgressCard({ action, template, onStatusChange, onComplete }: ActionProgressCardProps) {
  const [status, setStatus] = useState<ActionStatus>(action.status);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const cfg = STATUS_CONFIG[status];
  const title = action.custom_title ?? template?.title ?? 'Unnamed action';

  async function handleStatusCycle() {
    if (status === 'completed' || loading) return;
    const currentIdx = STATUS_ORDER.indexOf(status);
    const nextStatus = status === 'in_progress' ? 'completed' : STATUS_ORDER[Math.min(currentIdx + 1, STATUS_ORDER.length - 1)];

    setLoading(true);
    try {
      if (nextStatus === 'completed' && onComplete) {
        await onComplete(action.id);
        setStatus('completed');
      } else if (onStatusChange) {
        await onStatusChange(action.id, nextStatus);
        setStatus(nextStatus);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card mb-2 cursor-pointer" onClick={() => setExpanded(e => !e)}>
      <div className="flex items-start gap-3">
        <span
          className="mt-1 flex-shrink-0 w-2.5 h-2.5 rounded-full"
          style={{ background: cfg.dot }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-brand-dark text-sm leading-snug">{title}</p>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {action.skills && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(98,60,234,0.1)', color: 'var(--purple)' }}
              >
                {action.skills.name}
              </span>
            )}
            {template?.capability && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(34,29,35,0.06)', color: 'var(--text-muted)' }}
              >
                Builds: {template.capability}
              </span>
            )}
            {action.nudge_scheduled_date && status !== 'completed' && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(246,138,41,0.12)', color: 'var(--orange)' }}
              >
                📅 {new Date(action.nudge_scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {status === 'completed' && action.completed_at && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                ✓ {new Date(action.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={e => { e.stopPropagation(); handleStatusCycle(); }}
          disabled={loading || status === 'completed'}
          className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
          style={{
            background: status === 'completed' ? 'rgba(35,206,104,0.12)' : 'var(--yellow)',
            color: status === 'completed' ? 'var(--green)' : 'var(--dark)',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '...' : status === 'completed' ? '✓ Done' : cfg.next === 'completed' ? 'Complete!' : `→ ${STATUS_CONFIG[cfg.next].label}`}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(34,29,35,0.08)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Status: <span className="font-semibold" style={{ color: cfg.dot }}>{cfg.label}</span>
          </p>
        </div>
      )}
    </div>
  );
}
