'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';

export default function TrainingDayActionsPage() {
  const router = useRouter();
  const [planId, setPlanId] = useState<string | null>(null);
  const [existingActions, setExistingActions] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Inline action picker state
  const [pickerCount, setPickerCount] = useState<number | null>(null);
  const [actionTitles, setActionTitles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const cRes = await fetch('/api/participant/cohort');
      if (!cRes.ok) return;
      const cData = await cRes.json();
      if (!cData.cohort) {
        setLoading(false);
        return;
      }

      const cmRes = await fetch(`/api/commitments?cohort_id=${cData.cohort.id}`);
      if (cmRes.ok) {
        const cmData = await cmRes.json();
        if (cmData.commitment_plan?.id) {
          setPlanId(cmData.commitment_plan.id);
        }
        setExistingActions((cmData.actions ?? []).length);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    const filled = actionTitles.filter(t => t.trim());
    if (!filled.length || !planId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/actions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actions: filled.map(title => ({
            commitment_plan_id: planId,
            custom_title: title.trim(),
          })),
        }),
      });
      if (res.ok) {
        router.push('/participant/training-day');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="Actions" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-2xl" />)}</div>
        </main>
      </>
    );
  }

  if (!planId) {
    return (
      <>
        <Topbar title="Actions" />
        <main className="flex-1 overflow-y-auto px-7 py-6 max-w-2xl">
          <div className="card py-8 text-center">
            <p className="text-sm text-text-muted mb-4">Save your commitment first.</p>
            <Link href="/participant/training-day/commitment" className="btn-primary inline-flex justify-center">
              Go to commitment
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (existingActions > 0) {
    return (
      <>
        <Topbar title="Actions" />
        <main className="flex-1 overflow-y-auto px-7 py-6 max-w-2xl text-center">
          <div className="card py-10">
            <p className="text-2xl mb-3">✅</p>
            <h1 className="font-bold text-brand-dark text-lg mb-2">You already have actions</h1>
            <p className="text-sm text-text-muted mb-6">
              {existingActions} action{existingActions !== 1 ? 's' : ''} on your plan. You can track progress from Training Day or My Progress.
            </p>
            <Link href="/participant/training-day" className="btn-primary inline-flex justify-center">
              Back to Training Day
            </Link>
          </div>
        </main>
      </>
    );
  }

  const filledCount = actionTitles.filter(t => t.trim()).length;

  return (
    <>
      <Topbar title="Your actions" />
      <main className="task-page flex-1 overflow-y-auto px-7 py-6 max-w-2xl">
        <Link href="/participant/training-day" className="text-xs text-text-muted hover:text-brand-dark mb-4 inline-block">
          ← Training day
        </Link>

        <div
          className="rounded-[20px] overflow-hidden"
          style={{ border: '1.5px solid rgba(255,206,0,0.3)' }}
        >
          {/* Header */}
          <div className="px-6 py-4 flex items-center gap-3" style={{ background: '#221D23' }}>
            <span className="text-xl">🎯</span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-brand-yellow mb-0.5">Training Day</div>
              <div className="text-base font-black text-white">Choose Your Actions</div>
            </div>
          </div>

          <div className="bg-white px-6 py-5">
            {pickerCount === null ? (
              /* Step 1 — pick a count */
              <>
                <p className="text-sm font-semibold text-brand-dark mb-1">
                  How many actions will you commit to?
                </p>
                <p className="text-xs text-text-muted mb-5">
                  Choose a number you can realistically act on.
                </p>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setPickerCount(n);
                        setActionTitles(Array(n).fill(''));
                      }}
                      className="w-10 h-10 rounded-xl font-bold text-sm transition-all hover:scale-105 bg-[rgba(34,29,35,0.06)] text-[#221D23] border-[1.5px] border-[rgba(34,29,35,0.12)] hover:bg-[#FFCE00] hover:border-[#FFCE00] hover:shadow-[0_2px_8px_rgba(255,206,0,0.4)]"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* Step 2 — fill in the action fields */
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-brand-dark">
                    Describe your {pickerCount} action{pickerCount > 1 ? 's' : ''}
                  </p>
                  <button
                    type="button"
                    className="text-xs text-text-muted hover:text-brand-dark"
                    onClick={() => { setPickerCount(null); setActionTitles([]); }}
                  >
                    ← Change number
                  </button>
                </div>

                <p className="text-xs text-text-muted mb-4">
                  Be specific — what exactly will you do? e.g. &ldquo;Ask my manager for feedback after our next 1:1&rdquo;
                </p>

                <div className="space-y-3 mb-5">
                  {actionTitles.map((title, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 mt-1"
                        style={{
                          background: title.trim() ? '#FFCE00' : 'rgba(255,206,0,0.15)',
                          color: '#221D23',
                          border: '1.5px solid #FFCE00',
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <input
                          type="text"
                          className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/40"
                          style={{ borderColor: title.trim() ? 'rgba(255,206,0,0.5)' : 'rgba(34,29,35,0.12)' }}
                          placeholder={`Action ${i + 1} — what will you do?`}
                          value={title}
                          onChange={e => {
                            const next = [...actionTitles];
                            next[i] = e.target.value;
                            setActionTitles(next);
                          }}
                        />
                        {title.trim() && (
                          <p className="text-[10px] text-brand-green mt-1 ml-1 font-semibold">✓ Good to go</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn-primary w-full"
                  style={{ height: 52, fontSize: 15 }}
                  disabled={filledCount === 0 || saving}
                  onClick={handleSave}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      Saving…
                    </span>
                  ) : `Save ${filledCount} Action${filledCount !== 1 ? 's' : ''} →`}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
