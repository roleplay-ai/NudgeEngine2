'use client';

import { useEffect, useState } from 'react';

interface Props {
  cohortId: string;
  skills: { id: string; name: string }[];
  userRatings: Record<string, number>;
}

interface BatchData {
  average: number | null;
  count: number;
  distribution: Record<number, number> | null;
}

export default function BatchAverageReveal({ cohortId, skills, userRatings }: Props) {
  const [data, setData] = useState<Record<string, BatchData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const results: Record<string, BatchData> = {};
      await Promise.all(
        skills.map(async (skill) => {
          const res = await fetch(`/api/assessments/batch-average?cohort_id=${cohortId}&skill_id=${skill.id}&phase=pre`);
          if (res.ok) results[skill.id] = await res.json();
        })
      );
      setData(results);
      setLoading(false);
    }
    load();
  }, [cohortId, skills]);

  if (loading) {
    return (
      <div className="card py-8 text-center">
        <div className="text-lg animate-pulse mb-2">📊</div>
        <p className="text-sm text-text-muted">Loading batch averages...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 0, background: '#FAFBFF' }}>
      <div className="section-label mb-1">BATCH COMPARISON</div>
      <h3 className="font-bold text-brand-dark text-base mb-4">How you compare with your peers</h3>

      <div className="space-y-4">
        {skills.map(skill => {
          const batch = data[skill.id];
          const myRating = userRatings[skill.id] ?? 0;
          const avg = batch?.average;

          return (
            <div key={skill.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-brand-dark">{skill.name}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FFCE00' }} />
                    You: {myRating}
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
                  style={{ width: `${(myRating / 5) * 100}%`, background: '#FFCE00' }}
                />
              </div>
              {(!batch || batch.count < 3) && (
                <p className="text-[10px] text-text-muted mt-1 italic">
                  Waiting for more responses to show batch average
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
