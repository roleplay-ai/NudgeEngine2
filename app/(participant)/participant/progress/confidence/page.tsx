'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import ConfidenceCheckin from '@/components/participant/ConfidenceCheckin';

interface CheckinRow {
  id: string;
  confidence_score: number;
  week_number: number;
  reflection: string | null;
  created_at: string;
}

export default function ConfidencePage() {
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const cRes = await fetch('/api/participant/cohort');
    if (!cRes.ok) { setLoading(false); return; }
    const cData = await cRes.json();
    if (!cData.cohort) { setLoading(false); return; }

    const cid = cData.cohort.id as string;
    setCohortId(cid);

    const trainingDate = cData.cohort.training_date
      ? new Date(cData.cohort.training_date)
      : new Date();
    const daysSince = Math.max(0, Math.floor((Date.now() - trainingDate.getTime()) / 86400000));
    setWeekNumber(Math.max(1, Math.ceil(daysSince / 7)));

    const chRes = await fetch(`/api/confidence?cohort_id=${cid}`);
    if (chRes.ok) {
      const chData = await chRes.json();
      setCheckins(chData.checkins ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(score: number, reflection: string) {
    setCheckins(prev => {
      const existing = prev.find(c => c.week_number === weekNumber);
      if (existing) {
        return prev.map(c => c.week_number === weekNumber ? { ...c, confidence_score: score, reflection } : c);
      }
      return [...prev, { id: Date.now().toString(), confidence_score: score, week_number: weekNumber, reflection, created_at: new Date().toISOString() }];
    });
  }

  const latest = checkins.find(c => c.week_number === weekNumber) ?? null;

  // Build sparkline data
  const maxWeek = Math.max(...checkins.map(c => c.week_number), weekNumber);
  const sparklineData = Array.from({ length: maxWeek }, (_, i) => {
    const wk = i + 1;
    const row = checkins.find(c => c.week_number === wk);
    return { week: wk, score: row?.confidence_score ?? null };
  });

  return (
    <>
      <Topbar title="Confidence Check-in" />
      <main className="flex-1 overflow-y-auto px-5 py-6 max-w-lg mx-auto">
        <Link href="/participant/progress" className="text-xs font-semibold no-underline mb-4 inline-block" style={{ color: 'var(--text-muted)' }}>
          ← Back to Progress
        </Link>

        <div
          className="rounded-2xl p-5 mb-5"
          style={{ background: 'var(--dark)', color: '#fff' }}
        >
          <p className="text-xs font-bold mb-1" style={{ color: 'var(--yellow)', letterSpacing: '0.08em' }}>WEEKLY CHECK-IN</p>
          <h1 className="font-extrabold text-lg">Week {weekNumber}</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
            How confident are you applying your training right now?
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : !cohortId ? (
          <div className="card text-center py-8">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No cohort found.</p>
          </div>
        ) : (
          <>
            <ConfidenceCheckin
              cohortId={cohortId}
              weekNumber={weekNumber}
              existingScore={latest?.confidence_score ?? null}
              existingReflection={latest?.reflection ?? null}
              onSaved={handleSaved}
            />

            {/* History */}
            {checkins.length > 0 && (
              <div className="mt-6">
                <h2 className="font-bold text-brand-dark mb-4">Confidence Over Time</h2>

                {/* Mini chart */}
                <div className="card">
                  <div className="flex items-end gap-1 h-24">
                    {sparklineData.map(d => (
                      <div key={d.week} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-md transition-all duration-500"
                          style={{
                            height: d.score != null ? `${(d.score / 10) * 80}px` : '4px',
                            background: d.score != null
                              ? d.score <= 3 ? 'var(--red)'
                                : d.score <= 6 ? 'var(--orange)'
                                : d.score <= 8 ? 'var(--yellow)'
                                : 'var(--green)'
                              : 'rgba(34,29,35,0.08)',
                            minHeight: '4px',
                          }}
                        />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>W{d.week}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* List */}
                <div className="mt-4 space-y-2">
                  {[...checkins].reverse().map(c => (
                    <div key={c.id} className="card flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-extrabold flex-shrink-0"
                        style={{
                          background: c.confidence_score <= 3 ? 'rgba(237,69,81,0.12)'
                            : c.confidence_score <= 6 ? 'rgba(246,138,41,0.12)'
                            : c.confidence_score <= 8 ? 'rgba(255,206,0,0.12)'
                            : 'rgba(35,206,104,0.12)',
                          color: c.confidence_score <= 3 ? 'var(--red)'
                            : c.confidence_score <= 6 ? 'var(--orange)'
                            : c.confidence_score <= 8 ? 'var(--yellow)'
                            : 'var(--green)',
                        }}
                      >
                        {c.confidence_score}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-brand-dark">Week {c.week_number}</p>
                        {c.reflection && (
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{c.reflection}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
