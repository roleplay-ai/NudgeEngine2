'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import ParticipantReadinessTable from '@/components/trainer/ParticipantReadinessTable';

interface Participant {
  user: { id: string; name: string; email: string; avatar_url: string | null };
  completed_tasks: string[];
  readiness_score: number;
  last_active: string | null;
}

interface Summary {
  total: number;
  avg_readiness: number;
  fully_ready: number;
  not_started: number;
}

export default function HRPreTrainingMonitorPage() {
  const params = useParams();
  const cohortId = params.id as string;

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, avg_readiness: 0, fully_ready: 0, not_started: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/trainer/cohort-readiness?cohort_id=${cohortId}`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants ?? []);
        setSummary(data.summary ?? { total: 0, avg_readiness: 0, fully_ready: 0, not_started: 0 });
      }
      setLoading(false);
    }
    load();
  }, [cohortId]);

  const signupRate = summary.total > 0 ? Math.round(((summary.total - summary.not_started) / summary.total) * 100) : 0;

  return (
    <>
      <Topbar title="Pre-Training Monitor" />

      <main className="flex-1 overflow-y-auto px-7 py-6">
        <Link href={`/hr/cohorts/${cohortId}`} className="text-xs text-text-muted hover:text-brand-dark transition-colors mb-3 inline-block">
          ← Back to Cohort
        </Link>

        <div className="section-label">PRE-TRAINING</div>
        <h1 className="section-title mb-5">Readiness Dashboard</h1>

        {loading ? (
          <div className="card py-12 text-center"><p className="text-text-muted">Loading readiness data...</p></div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Sign-up Rate', value: `${signupRate}%`, color: '#221D23', icon: '📈' },
                { label: 'Avg Readiness', value: `${summary.avg_readiness}%`, color: '#623CEA', icon: '📊' },
                { label: 'Fully Ready', value: `${summary.fully_ready}/${summary.total}`, color: '#23CE68', icon: '✅' },
                { label: 'Not Started', value: summary.not_started, color: summary.not_started > 0 ? '#EF4444' : '#23CE68', icon: '⏳' },
              ].map(card => (
                <div key={card.label} className="card" style={{ marginBottom: 0 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{card.icon}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">{card.label}</span>
                  </div>
                  <div className="text-2xl font-black" style={{ color: card.color }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Readiness distribution bar */}
            <div className="card mb-6" style={{ marginBottom: 16 }}>
              <div className="section-label mb-3">READINESS DISTRIBUTION</div>
              <div className="flex items-center gap-1 h-6 rounded-full overflow-hidden" style={{ background: 'rgba(34,29,35,0.06)' }}>
                {summary.total > 0 && (
                  <>
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(summary.fully_ready / summary.total) * 100}%`,
                        background: '#23CE68',
                        borderRadius: '9999px 0 0 9999px',
                      }}
                    />
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${((summary.total - summary.fully_ready - summary.not_started) / summary.total) * 100}%`,
                        background: '#FFCE00',
                      }}
                    />
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(summary.not_started / summary.total) * 100}%`,
                        background: '#EF4444',
                        borderRadius: '0 9999px 9999px 0',
                      }}
                    />
                  </>
                )}
              </div>
              <div className="flex items-center gap-5 mt-2 text-xs text-text-muted">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#23CE68' }} /> Fully Ready ({summary.fully_ready})</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FFCE00' }} /> In Progress ({summary.total - summary.fully_ready - summary.not_started})</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444' }} /> Not Started ({summary.not_started})</span>
              </div>
            </div>

            {/* Table */}
            <ParticipantReadinessTable participants={participants} />
          </>
        )}
      </main>
    </>
  );
}
