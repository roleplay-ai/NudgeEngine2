'use client';

import { useEffect, useState, useMemo } from 'react';

interface Template {
  id: string;
  title: string;
  category: string | null;
  builds_capability: string | null;
  skill_id: string | null;
  skills: { id: string; name: string } | null;
}

interface Props {
  commitmentPlanId: string;
  onConfirmed: () => void;
}

export default function ActionSelector({ commitmentPlanId, onConfirmed }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customTitle, setCustomTitle] = useState('');
  const [customCapability, setCustomCapability] = useState('');
  const [nudgeDates, setNudgeDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/action-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Template[]>();
    for (const t of templates) {
      const key = t.skills?.name ?? 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [templates]);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirm() {
    const items: Record<string, unknown>[] = [];

    for (const tid of selected) {
      const t = templates.find(x => x.id === tid);
      if (!t) continue;
      items.push({
        commitment_plan_id: commitmentPlanId,
        template_id: t.id,
        skill_id: t.skill_id,
        builds_capability: t.builds_capability,
        nudge_scheduled_date: nudgeDates[t.id] || null,
      });
    }

    if (customTitle.trim()) {
      items.push({
        commitment_plan_id: commitmentPlanId,
        custom_title: customTitle.trim(),
        builds_capability: customCapability.trim() || null,
      });
    }

    if (items.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch('/api/actions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions: items }),
      });
      if (res.ok) onConfirmed();
    } finally {
      setSaving(false);
    }
  }

  const count = selected.size + (customTitle.trim() ? 1 : 0);

  if (loading) {
    return <p className="text-sm text-text-muted py-8 text-center">Loading templates…</p>;
  }

  return (
    <div className="space-y-6">
      {count > 5 && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          You&apos;ve selected {count} actions — we recommend focusing on 3–5 for the best follow-through.
        </div>
      )}

      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([group, arr]) => (
          <div key={group}>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted mb-2">{group}</div>
            <div className="space-y-2">
              {arr.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className="card w-full text-left transition-all"
                  style={{
                    marginBottom: 0,
                    border: selected.has(t.id) ? '2px solid #623CEA' : '1px solid rgba(34,29,35,0.08)',
                    background: selected.has(t.id) ? 'rgba(98,60,234,0.04)' : '#fff',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        borderColor: selected.has(t.id) ? '#623CEA' : 'rgba(34,29,35,0.2)',
                        background: selected.has(t.id) ? '#623CEA' : 'transparent',
                      }}
                    >
                      {selected.has(t.id) && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-brand-dark text-sm">{t.title}</div>
                      {t.builds_capability && (
                        <span className="text-[10px] text-text-muted">Builds: {t.builds_capability}</span>
                      )}
                    </div>
                  </div>
                  {selected.has(t.id) && (
                    <div className="mt-3 pl-8">
                      <label className="text-[10px] font-semibold text-text-secondary">Nudge reminder (optional)</label>
                      <input
                        type="date"
                        className="mt-1 text-xs rounded-lg border px-2 py-1 w-full max-w-[200px]"
                        style={{ borderColor: 'rgba(34,29,35,0.12)' }}
                        value={nudgeDates[t.id] ?? ''}
                        onChange={e => setNudgeDates(d => ({ ...d, [t.id]: e.target.value }))}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 0, background: 'rgba(34,29,35,0.02)' }}>
        <div className="text-sm font-bold text-brand-dark mb-2">Add a custom action</div>
        <input
          type="text"
          className="w-full rounded-xl border px-4 py-2.5 text-sm mb-2"
          style={{ borderColor: 'rgba(34,29,35,0.12)' }}
          placeholder="What will you do?"
          value={customTitle}
          onChange={e => setCustomTitle(e.target.value)}
        />
        <input
          type="text"
          className="w-full rounded-xl border px-4 py-2 text-xs"
          style={{ borderColor: 'rgba(34,29,35,0.12)' }}
          placeholder="Capability / skill area (optional)"
          value={customCapability}
          onChange={e => setCustomCapability(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="btn-primary w-full justify-center"
        style={{ height: 48 }}
        disabled={count === 0 || saving}
        onClick={confirm}
      >
        {saving ? 'Saving…' : `Confirm ${count} action${count !== 1 ? 's' : ''} →`}
      </button>
    </div>
  );
}
