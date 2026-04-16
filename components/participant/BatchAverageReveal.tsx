'use client';

import { useEffect, useState } from 'react';

interface Props {
  cohortId: string;
  programmeName: string;
  userRating: number;
}

interface BatchData {
  average: number | null;
  count: number;
  distribution: Record<number, number> | null;
  message?: string;
}

export default function BatchAverageReveal({ cohortId, programmeName, userRating }: Props) {
  const [batch, setBatch] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/assessments/batch-average?cohort_id=${cohortId}&phase=pre`);
      if (res.ok) setBatch(await res.json());
      setLoading(false);
    }
    load();
  }, [cohortId]);

  if (loading) {
    return (
      <div className="card py-8 text-center">
        <div className="text-lg animate-pulse mb-2">📊</div>
        <p className="text-sm text-text-muted">Loading batch averages...</p>
      </div>
    );
  }

  const avg = batch?.average;

  return (
    <div className="card" style={{ marginBottom: 0, background: '#FAFBFF' }}>
      <div className="section-label mb-1">BATCH COMPARISON</div>
      <h3 className="font-bold text-brand-dark text-base mb-4">How you compare with your peers</h3>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-brand-dark">{programmeName}</span>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FFCE00' }} />
              You: {userRating}
            </span>
            {avg !== null && avg !== undefined && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#623CEA' }} />
                Avg: {avg}
              </span>
            )}
          </div>
        </div>
        <div className="relative h-3 rounded-full" style={{ background: 'rgba(34,29,35,0.06)' }}>
          {avg !== null && avg !== undefined && (
            <div
              className="absolute top-0 h-3 rounded-full transition-all duration-700"
              style={{ width: `${(avg / 5) * 100}%`, background: '#623CEA', opacity: 0.3 }}
            />
          )}
          <div
            className="absolute top-0 h-3 rounded-full transition-all duration-700"
            style={{ width: `${(userRating / 5) * 100}%`, background: '#FFCE00' }}
          />
        </div>
        {(!batch || (batch.count ?? 0) < 3) && (
          <p className="text-[10px] text-text-muted mt-1 italic">
            Waiting for more responses to show batch average
          </p>
        )}
      </div>
    </div>
  );
}
