'use client';

interface Participant {
  user: { id: string; name: string; email: string; avatar_url: string | null };
  completed_tasks: string[];
  readiness_score: number;
  last_active: string | null;
}

interface Props {
  participants: Participant[];
}

const TASK_ORDER = ['compare', 'shape', 'meet', 'prereads'];
const TASK_LABELS: Record<string, string> = {
  compare: 'Skills',
  shape: 'Expectations',
  meet: 'Intro',
  prereads: 'Pre-reads',
};

function ReadinessBar({ score }: { score: number }) {
  let color = '#EF4444';
  if (score >= 80) color = '#23CE68';
  else if (score >= 60) color = '#FFCE00';
  else if (score >= 40) color = '#F58220';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full" style={{ background: 'rgba(34,29,35,0.08)' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score}%</span>
    </div>
  );
}

export default function ParticipantReadinessTable({ participants }: Props) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="grid items-center px-5 py-3" style={{ gridTemplateColumns: '2fr repeat(4, 0.8fr) 1fr 1fr', borderBottom: '1px solid rgba(34,29,35,0.08)', background: 'rgba(34,29,35,0.02)' }}>
        <div className="th">Participant</div>
        {TASK_ORDER.map(t => (
          <div key={t} className="th text-center">{TASK_LABELS[t]}</div>
        ))}
        <div className="th">Readiness</div>
        <div className="th">Last Active</div>
      </div>

      {participants.length === 0 && (
        <div className="py-8 text-center text-sm text-text-muted">No participants enrolled yet</div>
      )}

      {participants.map(p => {
        const initials = p.user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        return (
          <div key={p.user.id} className="grid items-center px-5 py-3" style={{ gridTemplateColumns: '2fr repeat(4, 0.8fr) 1fr 1fr', borderBottom: '0.5px solid rgba(34,29,35,0.06)' }}>
            <div className="flex items-center gap-2.5">
              <div className="avatar avatar-sm">{initials}</div>
              <div>
                <div className="text-sm font-semibold text-brand-dark">{p.user.name}</div>
                <div className="text-[10px] text-text-muted">{p.user.email}</div>
              </div>
            </div>
            {TASK_ORDER.map(t => (
              <div key={t} className="text-center">
                {p.completed_tasks.includes(t) ? (
                  <span className="inline-flex w-6 h-6 rounded-full items-center justify-center" style={{ background: '#F0FFF7' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#23CE68" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                ) : (
                  <span className="inline-flex w-6 h-6 rounded-full border" style={{ borderColor: 'rgba(34,29,35,0.15)' }} />
                )}
              </div>
            ))}
            <div><ReadinessBar score={p.readiness_score} /></div>
            <div className="text-xs text-text-muted">
              {p.last_active
                ? new Date(p.last_active).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
