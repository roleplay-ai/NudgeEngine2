'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';

interface ParticipantRow {
  user: { id: string; name: string; email: string };
  commitment: string | null;
  actions_total: number;
  actions_completed: number;
  completion_rate: number;
  latest_confidence: number | null;
}

export default function HRPostTrainingPage() {
  const params = useParams();
  const cohortId = params.id as string;
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cohortName, setCohortName] = useState('Cohort');

  useEffect(() => {
    async function load() {
      const [partRes, cohortRes] = await Promise.all([
        fetch(`/api/trainer/post-summary?cohort_id=${cohortId}`),
        fetch(`/api/participant/cohort`),
      ]);

      if (partRes.ok) {
        const d = await partRes.json();
        setParticipants(d.participants ?? []);
      }
      if (cohortRes.ok) {
        const cd = await cohortRes.json();
        if (cd.cohort?.name) setCohortName(cd.cohort.name);
      }
      setLoading(false);
    }
    load();
  }, [cohortId]);

  const avgCompletion = participants.length > 0
    ? Math.round(participants.reduce((s, p) => s + p.completion_rate, 0) / participants.length)
    : 0;
  const avgConfidence = participants.filter(p => p.latest_confidence != null).length > 0
    ? (participants.filter(p => p.latest_confidence != null).reduce((s, p) => s + (p.latest_confidence ?? 0), 0) / participants.filter(p => p.latest_confidence != null).length).toFixed(1)
    : '—';
  const committed = participants.filter(p => p.commitment != null).length;

  return (
    <>
      <Topbar title="Post-Training Analytics" />
      <main className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <Link href={`/hr/cohorts/${cohortId}`} className="text-xs font-semibold no-underline mb-1 inline-block" style={{ color: 'var(--text-muted)' }}>
              ← {cohortName}
            </Link>
            <h1 className="text-xl font-extrabold text-brand-dark">Post-Training Analytics</h1>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Enrolled', value: participants.length, color: 'var(--text-primary)' },
            { label: 'Committed', value: committed, color: 'var(--yellow)' },
            { label: 'Avg Completion', value: `${avgCompletion}%`, color: 'var(--green)' },
            { label: 'Avg Confidence', value: avgConfidence, color: 'var(--blue)' },
          ].map(s => (
            <div key={s.label} className="card text-center">
              <div className="text-2xl font-extrabold mb-1" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : participants.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-3xl mb-3">📊</p>
            <p className="font-bold text-brand-dark mb-1">No post-training data yet</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Data will appear here as participants complete actions and confidence check-ins.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="font-bold text-brand-dark mb-3">Participant Breakdown</h2>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--muted)' }}>
                    <th className="text-left text-xs font-bold px-4 py-3" style={{ color: 'var(--text-muted)' }}>Participant</th>
                    <th className="text-left text-xs font-bold px-4 py-3" style={{ color: 'var(--text-muted)' }}>Commitment</th>
                    <th className="text-center text-xs font-bold px-4 py-3" style={{ color: 'var(--text-muted)' }}>Actions</th>
                    <th className="text-center text-xs font-bold px-4 py-3" style={{ color: 'var(--text-muted)' }}>Completion</th>
                    <th className="text-center text-xs font-bold px-4 py-3" style={{ color: 'var(--text-muted)' }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, idx) => (
                    <tr
                      key={p.user.id}
                      style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none', background: 'var(--card)' }}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-brand-dark">{p.user.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs max-w-xs" style={{ color: p.commitment ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                          {p.commitment ? p.commitment.slice(0, 80) + (p.commitment.length > 80 ? '…' : '') : '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold text-brand-dark">{p.actions_completed}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/{p.actions_total}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(34,29,35,0.08)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${p.completion_rate}%`,
                                background: p.completion_rate >= 80 ? 'var(--green)' : p.completion_rate >= 50 ? 'var(--yellow)' : 'var(--orange)',
                              }}
                            />
                          </div>
                          <span className="text-sm font-bold text-brand-dark">{p.completion_rate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.latest_confidence != null ? (
                          <span
                            className="inline-block w-9 h-9 rounded-xl text-sm font-bold flex items-center justify-center"
                            style={{
                              background: p.latest_confidence <= 4 ? 'rgba(237,69,81,0.12)' : p.latest_confidence <= 7 ? 'rgba(255,206,0,0.15)' : 'rgba(35,206,104,0.12)',
                              color: p.latest_confidence <= 4 ? 'var(--red)' : p.latest_confidence <= 7 ? '#A07A00' : 'var(--green)',
                            }}
                          >
                            {p.latest_confidence}
                          </span>
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
