'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import ActionProgressCard from '@/components/participant/ActionProgressCard';

type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'skipped';

interface Skill {
  id: string;
  name: string;
}

interface Action {
  id: string;
  custom_title: string | null;
  status: ActionStatus;
  nudge_scheduled_date: string | null;
  completed_at: string | null;
  skills: Skill | null;
  action_template_id: string | null;
}

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Pending' },
  { key: 'delayed', label: 'Delayed' },
];

export default function MyActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    const cRes = await fetch('/api/participant/cohort');
    if (!cRes.ok) { setLoading(false); return; }
    const cData = await cRes.json();
    if (!cData.cohort) { setLoading(false); return; }

    const pRes = await fetch(`/api/progress/summary?cohort_id=${cData.cohort.id}`);
    if (pRes.ok) {
      const pd = await pRes.json();
      setActions(pd.actions ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(actionId: string, status: ActionStatus) {
    const res = await fetch(`/api/actions/${actionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setActions(prev => prev.map(a => a.id === actionId ? { ...a, status } : a));
    }
  }

  async function handleComplete(actionId: string) {
    const res = await fetch('/api/actions/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_id: actionId }),
    });
    if (res.ok) {
      setActions(prev => prev.map(a =>
        a.id === actionId ? { ...a, status: 'completed', completed_at: new Date().toISOString() } : a
      ));
    }
  }

  async function handleMarkAllInProgressComplete() {
    setMarkingAll(true);
    const inProgress = actions.filter(a => a.status === 'in_progress');
    for (const a of inProgress) {
      await handleComplete(a.id);
    }
    setMarkingAll(false);
  }

  const filtered = filter === 'all' ? actions : actions.filter(a => a.status === filter);

  // Group by skill
  const grouped: Record<string, Action[]> = {};
  for (const a of filtered) {
    const key = a.skills?.name ?? 'Other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  }

  const inProgressCount = actions.filter(a => a.status === 'in_progress').length;

  return (
    <>
      <Topbar title="My Actions" />
      <main className="flex-1 overflow-y-auto px-5 py-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Link href="/participant/progress" className="text-xs font-semibold no-underline" style={{ color: 'var(--text-muted)' }}>
            ← Progress
          </Link>
          {inProgressCount > 0 && (
            <button
              onClick={handleMarkAllInProgressComplete}
              disabled={markingAll}
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(35,206,104,0.12)', color: 'var(--green)' }}
            >
              {markingAll ? '…' : `Mark ${inProgressCount} in-progress done`}
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 no-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={{
                background: filter === f.key ? 'var(--dark)' : 'rgba(34,29,35,0.06)',
                color: filter === f.key ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No actions in this category.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([skillName, acts]) => (
            <div key={skillName} className="mb-5">
              <h3 className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                {skillName}
              </h3>
              {acts.map(a => (
                <ActionProgressCard
                  key={a.id}
                  action={a}
                  onStatusChange={handleStatusChange}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          ))
        )}
      </main>
    </>
  );
}
