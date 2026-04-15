'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PrereadItem from '@/components/participant/PrereadItem';

interface Resource {
  id: string;
  title: string;
  resource_type: string;
  url?: string | null;
  file_path?: string | null;
  estimated_duration?: string | null;
}

export default function Task4PrereadsPage() {
  const router = useRouter();
  const [cohortId, setCohortId] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/participant/cohort');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.cohort) return;
      setCohortId(data.cohort.id);

      const rRes = await fetch(`/api/cohorts/${data.cohort.id}/resources`);
      if (rRes.ok) {
        const rData = await rRes.json();
        setResources(rData.resources ?? []);
      }

      const tRes = await fetch(`/api/resource-tracking/status?cohort_id=${data.cohort.id}`);
      if (tRes.ok) {
        const tData = await tRes.json();
        setReadIds(new Set(tData.read_ids ?? []));
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleMarkRead(resourceId: string) {
    setMarkingId(resourceId);
    try {
      const res = await fetch('/api/resource-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resourceId, status: 'read' }),
      });

      if (res.ok) {
        const data = await res.json();
        setReadIds(prev => new Set([...prev, resourceId]));
        if (data.all_done) {
          setAllDone(true);
          setTimeout(() => router.push('/participant/pre-training'), 3000);
        }
      }
    } finally {
      setMarkingId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto px-7 py-6">
        <div className="card py-12 text-center"><p className="text-text-muted">Loading resources...</p></div>
      </main>
    );
  }

  const readCount = resources.filter(r => readIds.has(r.id)).length;
  const total = resources.length;

  return (
    <main className="flex-1 overflow-y-auto px-7 py-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['Skills', 'Expectations', 'Introductions', 'Pre-reads'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold"
              style={{
                background: i <= 3 ? (i === 3 ? '#3699FC' : '#23CE68') : 'rgba(34,29,35,0.08)',
                color: i <= 3 ? '#fff' : '#8A8090',
              }}
            >
              {i < 3 ? '✓' : i + 1}
            </div>
            <span className="text-xs font-semibold" style={{ color: i === 3 ? '#221D23' : '#8A8090' }}>
              {label}
            </span>
            {i < 3 && <div className="w-8 h-px" style={{ background: 'rgba(34,29,35,0.12)' }} />}
          </div>
        ))}
      </div>

      {allDone && (
        <div className="card py-12 text-center mb-6" style={{ background: '#F0FFF7', border: '2px solid rgba(35,206,104,0.3)' }}>
          <p className="text-4xl mb-3">🎉</p>
          <h2 className="font-bold text-brand-dark text-xl mb-2">All Pre-reads Complete!</h2>
          <p className="text-sm text-text-muted">
            You&apos;re all set for training day. Redirecting you back...
          </p>
        </div>
      )}

      <div className="max-w-2xl">
        <div className="section-label" style={{ color: '#3699FC' }}>TASK 04</div>
        <h1 className="section-title text-xl mb-1">Pre-reads</h1>
        <p className="text-sm text-text-muted mb-2">
          Review these materials before your session to get the most out of training day.
        </p>

        {total > 0 && (
          <div className="flex items-center gap-2 mb-5">
            <div className="flex-1 progress-wrap" style={{ height: 4 }}>
              <div className="progress-fill" style={{ width: `${total > 0 ? (readCount / total) * 100 : 0}%`, background: '#3699FC', transition: 'width 0.5s ease' }} />
            </div>
            <span className="text-xs font-bold text-brand-dark">{readCount}/{total}</span>
          </div>
        )}

        {resources.length === 0 ? (
          <div className="card py-8 text-center">
            <p className="text-2xl mb-2">📚</p>
            <p className="text-sm text-text-muted">No pre-read materials have been uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resources.map(resource => (
              <PrereadItem
                key={resource.id}
                resource={resource}
                isRead={readIds.has(resource.id)}
                onMarkRead={handleMarkRead}
                loading={markingId === resource.id}
              />
            ))}
          </div>
        )}

        <button
          className="btn-secondary w-full mt-6"
          onClick={() => router.push('/participant/pre-training')}
          style={{ height: 44, fontSize: 14 }}
        >
          ← Back to Hub
        </button>
      </div>
    </main>
  );
}
