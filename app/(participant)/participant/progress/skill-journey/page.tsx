'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import SkillJourneyCard from '@/components/participant/SkillJourneyCard';

interface SkillJourneyItem {
  skill: { id: string; name: string };
  pre_rating: number | null;
  post_rating: number | null;
  growth: number | null;
}

interface RateModalState {
  open: boolean;
  skill: { id: string; name: string } | null;
  preRating: number | null;
}

export default function SkillJourneyPage() {
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [journey, setJourney] = useState<SkillJourneyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<RateModalState>({ open: false, skill: null, preRating: null });
  const [rateScore, setRateScore] = useState(3);
  const [rateReflection, setRateReflection] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const cRes = await fetch('/api/participant/cohort');
    if (!cRes.ok) { setLoading(false); return; }
    const cData = await cRes.json();
    if (!cData.cohort) { setLoading(false); return; }
    const cid = cData.cohort.id as string;
    setCohortId(cid);

    const pRes = await fetch(`/api/progress/summary?cohort_id=${cid}`);
    if (pRes.ok) {
      const pd = await pRes.json();
      setJourney(pd.skill_journey ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openRateModal(item: SkillJourneyItem) {
    setModal({ open: true, skill: item.skill, preRating: item.pre_rating });
    setRateScore(item.post_rating ?? 3);
    setRateReflection('');
  }

  async function handleRateSubmit() {
    if (!modal.skill || !cohortId) return;
    setSaving(true);
    const res = await fetch('/api/assessments/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cohort_id: cohortId,
        skill_id: modal.skill.id,
        rating_score: rateScore,
        reflection: rateReflection,
        phase: 'post',
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setJourney(prev => prev.map(j =>
        j.skill.id === modal.skill?.id
          ? { ...j, post_rating: rateScore, growth: data.growth }
          : j
      ));
      setModal({ open: false, skill: null, preRating: null });
    }
  }

  return (
    <>
      <Topbar title="Skill Journey" />
      <main className="flex-1 overflow-y-auto px-5 py-6 max-w-lg mx-auto">
        <Link href="/participant/progress" className="text-xs font-semibold no-underline mb-4 inline-block" style={{ color: 'var(--text-muted)' }}>
          ← Back to Progress
        </Link>

        <div
          className="rounded-2xl p-5 mb-5"
          style={{ background: 'var(--dark)', color: '#fff' }}
        >
          <p className="text-xs font-bold mb-1" style={{ color: 'var(--yellow)', letterSpacing: '0.08em' }}>SKILL JOURNEY</p>
          <h1 className="font-extrabold text-lg">Before vs. Now</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
            See how your skills have grown since training. Rate yourself for any skills you haven&apos;t assessed yet.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : journey.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-2xl mb-2">📊</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No skills in your programme yet.</p>
          </div>
        ) : (
          journey.map(item => (
            <SkillJourneyCard
              key={item.skill.id}
              skill={item.skill}
              preRating={item.pre_rating}
              postRating={item.post_rating}
              growth={item.growth}
              onRateNow={() => openRateModal(item)}
            />
          ))
        )}

        {/* Rate modal */}
        {modal.open && modal.skill && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setModal({ open: false, skill: null, preRating: null })}
          >
            <div
              className="w-full max-w-md rounded-2xl p-6"
              style={{ background: 'var(--card)' }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="font-bold text-brand-dark text-base mb-1">Rate: {modal.skill.name}</h2>
              {modal.preRating != null && (
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Before training: {modal.preRating}/5</p>
              )}

              <label className="block text-sm font-semibold text-brand-dark mb-2">Your current rating</label>
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setRateScore(n)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: rateScore === n ? 'var(--yellow)' : 'rgba(34,29,35,0.06)',
                      color: rateScore === n ? 'var(--dark)' : 'var(--text-secondary)',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <label className="block text-sm font-semibold text-brand-dark mb-2">Reflection (optional)</label>
              <textarea
                rows={2}
                value={rateReflection}
                onChange={e => setRateReflection(e.target.value)}
                placeholder="What has changed? What can you do now that you couldn't before?"
                className="w-full rounded-xl px-4 py-3 text-sm resize-none mb-4"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', outline: 'none' }}
              />

              <button
                onClick={handleRateSubmit}
                disabled={saving}
                className="btn-primary w-full"
                style={{ opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : 'Save rating'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
