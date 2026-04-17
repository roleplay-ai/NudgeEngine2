'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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

export default function TrainerPreTrainingPage() {
  const params = useParams();
  const cohortId = params.cohortId as string;

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

  const notStartedList = participants.filter(p => p.readiness_score === 0);

  return (
    <main className="flex-1 overflow-y-auto px-7 py-6">
      <Link href={`/trainer/cohorts/${cohortId}`} className="text-xs text-text-muted hover:text-brand-dark transition-colors mb-3 inline-block">
        ← Back to Cohort
      </Link>

      <div className="section-label">PRE-TRAINING</div>
      <h1 className="section-title mb-5">Readiness Monitor</h1>

      {loading ? (
        <div className="card py-12 text-center"><p className="text-text-muted">Loading readiness data...</p></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Enrolled', value: summary.total, color: '#221D23', icon: '👥' },
              { label: 'Avg Readiness', value: `${summary.avg_readiness}%`, color: '#623CEA', icon: '📊' },
              { label: 'Fully Ready', value: summary.fully_ready, color: '#23CE68', icon: '✅' },
              { label: 'Not Started', value: summary.not_started, color: '#EF4444', icon: '⏳' },
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

          {/* Alert for not-started participants */}
          {notStartedList.length > 0 && (
            <div className="card mb-6" style={{ background: '#FFF5F5', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 16 }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">⚠️</span>
                <span className="text-sm font-bold text-brand-dark">
                  {notStartedList.length} participant{notStartedList.length !== 1 ? 's' : ''} haven&apos;t started yet
                </span>
              </div>
              <div className="space-y-2">
                {notStartedList.slice(0, 5).map(p => (
                  <div key={p.user.id} className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">{p.user.name}</span>
                    <span className="text-xs text-text-muted">{p.user.email}</span>
                  </div>
                ))}
                {notStartedList.length > 5 && (
                  <p className="text-xs text-text-muted">...and {notStartedList.length - 5} more</p>
                )}
              </div>
            </div>
          )}

          {/* Table */}
          <ParticipantReadinessTable participants={participants} />
        </>
      )}
    </main>
  );
}
