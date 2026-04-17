'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';

interface Stat {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

interface ParticipantRow {
  user: { id: string; name: string; email: string };
  commitment: string | null;
  actions_total: number;
  actions_completed: number;
  completion_rate: number;
  latest_confidence: number | null;
}

interface SummaryData {
  stats: Stat[];
  participants: ParticipantRow[];
}

export default function TrainerPostTrainingPage() {
  const params = useParams();
  const cohortId = params.cohortId as string;
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [livRes, partRes] = await Promise.all([
        fetch(`/api/trainer/live-attendance?cohort_id=${cohortId}`),
        fetch(`/api/trainer/post-summary?cohort_id=${cohortId}`),
      ]);

      let participants: ParticipantRow[] = [];
      if (partRes.ok) {
        const d = await partRes.json();
        participants = d.participants ?? [];
      }

      let stats: Stat[] = [];
      if (livRes.ok) {
        const ld = await livRes.json();
        const s = ld.cohort_stats ?? {};
        stats = [
          { label: 'Enrolled', value: s.total_enrolled ?? 0 },
          { label: 'Attended', value: s.live_checkin ?? 0, color: 'var(--green)' },
          { label: 'Committed', value: s.committed ?? 0, color: 'var(--yellow)' },
        ];
      }

      setData({ stats, participants });
      setLoading(false);
    }
    load();
  }, [cohortId]);

  return (
    <>
      <Topbar title="Post-Training" />
      <main className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl mx-auto">
        <Link href={`/trainer/cohorts/${cohortId}`} className="text-xs font-semibold no-underline mb-4 inline-block" style={{ color: 'var(--text-muted)' }}>
          ← Back to Cohort
        </Link>

        {/* Quick nav */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            href={`/trainer/cohorts/${cohortId}/nudges`}
            className="card no-underline hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-2">💡</div>
            <div className="font-bold text-brand-dark text-sm mb-1">Send Nudges</div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Create and schedule micro-actions for participants</p>
          </Link>
          <Link
            href={`/trainer/cohorts/${cohortId}/messages`}
            className="card no-underline hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-2">💬</div>
            <div className="font-bold text-brand-dark text-sm mb-1">Message Cohort</div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Send batch announcements or direct messages</p>
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : !data ? (
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>No data available.</p>
        ) : (
          <>
            {/* Stats */}
            {data.stats.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {data.stats.map(s => (
                  <div key={s.label} className="card text-center">
                    <div className="text-2xl font-extrabold mb-1" style={{ color: s.color ?? 'var(--text-primary)' }}>
                      {s.value}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Participant table */}
            <h2 className="font-bold text-brand-dark mb-3">Participant Progress</h2>

            {data.participants.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-2xl mb-2">📊</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Post-training data will appear here as participants complete actions and check-ins.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.participants.map(p => (
                  <div key={p.user.id} className="card">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ background: 'var(--purple)' }}
                      >
                        {p.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-brand-dark text-sm">{p.user.name}</p>
                        {p.commitment && (
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{p.commitment}</p>
                        )}
                      </div>
                      <div className="flex gap-3 items-center flex-shrink-0">
                        <div className="text-center">
                          <div className="text-sm font-bold text-brand-dark">{p.completion_rate}%</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {p.actions_completed}/{p.actions_total} actions
                          </div>
                        </div>
                        {p.latest_confidence != null && (
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{
                              background: p.latest_confidence <= 4 ? 'rgba(237,69,81,0.12)' : p.latest_confidence <= 7 ? 'rgba(255,206,0,0.15)' : 'rgba(35,206,104,0.12)',
                              color: p.latest_confidence <= 4 ? 'var(--red)' : p.latest_confidence <= 7 ? '#A07A00' : 'var(--green)',
                            }}
                          >
                            {p.latest_confidence}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
