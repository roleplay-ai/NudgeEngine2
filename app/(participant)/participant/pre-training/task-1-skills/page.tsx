'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SkillRatingGrid from '@/components/participant/SkillRatingGrid';
import BatchAverageReveal from '@/components/participant/BatchAverageReveal';

interface Skill {
  id: string;
  name: string;
  description?: string;
}

interface Rating {
  skill_id: string;
  rating_score: number;
  reflection_notes: string;
}

export default function Task1SkillsPage() {
  const router = useRouter();
  const [cohortId, setCohortId] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [existingRatings, setExistingRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAverage, setShowAverage] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/participant/cohort');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.cohort) return;

      setCohortId(data.cohort.id);
      const programmeSkills = data.cohort.programmes?.skills ?? [];
      setSkills(programmeSkills);

      const aRes = await fetch(`/api/assessments?cohort_id=${data.cohort.id}&phase=pre`);
      if (aRes.ok) {
        const aData = await aRes.json();
        const mapped = (aData.assessments ?? []).map((a: { skill_id: string; rating_score: number; reflection_notes: string }) => ({
          skill_id: a.skill_id,
          rating_score: a.rating_score,
          reflection_notes: a.reflection_notes ?? '',
        }));
        setExistingRatings(mapped);
        setRatings(mapped);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleRatingsChange = useCallback((updated: Rating[]) => {
    setRatings(updated);
  }, []);

  const allRated = skills.length > 0 && skills.every(s => ratings.find(r => r.skill_id === s.id)?.rating_score);

  const userRatingsMap: Record<string, number> = {};
  for (const r of ratings) {
    if (r.rating_score) userRatingsMap[r.skill_id] = r.rating_score;
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      for (const r of ratings) {
        if (!r.rating_score) continue;
        await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cohort_id: cohortId,
            skill_id: r.skill_id,
            rating_score: r.rating_score,
            reflection_notes: r.reflection_notes || null,
            phase: 'pre',
          }),
        });
      }

      await fetch('/api/participant/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_type: 'compare', cohort_id: cohortId }),
      });

      router.push('/participant/pre-training');
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto px-7 py-6">
        <div className="card py-12 text-center"><p className="text-text-muted">Loading skills...</p></div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-7 py-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['Skills', 'Expectations', 'Introductions', 'Pre-reads'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold"
              style={{
                background: i === 0 ? '#FFCE00' : 'rgba(34,29,35,0.08)',
                color: i === 0 ? '#221D23' : '#8A8090',
              }}
            >
              {i + 1}
            </div>
            <span className="text-xs font-semibold" style={{ color: i === 0 ? '#221D23' : '#8A8090' }}>
              {label}
            </span>
            {i < 3 && <div className="w-8 h-px" style={{ background: 'rgba(34,29,35,0.12)' }} />}
          </div>
        ))}
      </div>

      <div className="max-w-2xl">
        <div className="section-label" style={{ color: '#FFCE00' }}>TASK 01</div>
        <h1 className="section-title text-xl mb-1">Compare Your Skills</h1>
        <p className="text-sm text-text-muted mb-6">
          Rate yourself on each skill below. Be honest — this helps us tailor the training to your needs.
        </p>

        {skills.length === 0 ? (
          <div className="card py-8 text-center">
            <p className="text-text-muted">No skills defined for this programme yet.</p>
          </div>
        ) : (
          <>
            <SkillRatingGrid
              skills={skills}
              existingRatings={existingRatings}
              onRatingsChange={handleRatingsChange}
            />

            {allRated && !showAverage && (
              <button
                className="btn-secondary w-full mt-6"
                onClick={() => setShowAverage(true)}
                style={{ borderColor: '#623CEA', color: '#623CEA' }}
              >
                📊 See How Your Batch Rated
              </button>
            )}

            {showAverage && (
              <div className="mt-6">
                <BatchAverageReveal
                  cohortId={cohortId}
                  skills={skills}
                  userRatings={userRatingsMap}
                />
              </div>
            )}

            <button
              className="btn-primary w-full mt-6"
              onClick={handleSubmit}
              disabled={!allRated || saving}
              style={{ height: 48, fontSize: 14 }}
            >
              {saving ? 'Saving...' : 'Save & Continue →'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
