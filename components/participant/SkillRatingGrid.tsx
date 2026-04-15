'use client';

import { useState } from 'react';

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

interface Props {
  skills: Skill[];
  existingRatings?: Rating[];
  onRatingsChange: (ratings: Rating[]) => void;
}

export default function SkillRatingGrid({ skills, existingRatings = [], onRatingsChange }: Props) {
  const [ratings, setRatings] = useState<Rating[]>(() =>
    skills.map(s => {
      const existing = existingRatings.find(r => r.skill_id === s.id);
      return {
        skill_id: s.id,
        rating_score: existing?.rating_score ?? 0,
        reflection_notes: existing?.reflection_notes ?? '',
      };
    })
  );

  function setRating(skillId: string, score: number) {
    const updated = ratings.map(r => (r.skill_id === skillId ? { ...r, rating_score: score } : r));
    setRatings(updated);
    onRatingsChange(updated);
  }

  function setNotes(skillId: string, notes: string) {
    if (notes.length > 300) return;
    const updated = ratings.map(r => (r.skill_id === skillId ? { ...r, reflection_notes: notes } : r));
    setRatings(updated);
    onRatingsChange(updated);
  }

  return (
    <div className="space-y-6">
      {skills.map(skill => {
        const rating = ratings.find(r => r.skill_id === skill.id);
        const selected = rating?.rating_score ?? 0;

        return (
          <div key={skill.id} className="card" style={{ marginBottom: 0 }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: '#F58220' }}>
                Skill
              </span>
            </div>
            <h3 className="font-bold text-brand-dark text-base mb-1">{skill.name}</h3>
            {skill.description && (
              <p className="text-xs text-text-muted mb-4 leading-relaxed">{skill.description}</p>
            )}

            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(score => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setRating(skill.id, score)}
                  className="transition-all duration-150"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 18,
                    border: selected === score ? '2px solid #FFCE00' : '1.5px solid rgba(34,29,35,0.12)',
                    background: selected === score ? '#FFCE00' : '#fff',
                    color: selected === score ? '#221D23' : '#8A8090',
                    boxShadow: selected === score ? '0 4px 14px rgba(255,206,0,0.35)' : 'none',
                    transform: selected === score ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  {score}
                </button>
              ))}
              <span className="text-[10px] text-text-muted ml-2">
                1 = Novice · 5 = Expert
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                What makes you give this rating? <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <textarea
                className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-yellow/40"
                style={{ borderColor: 'rgba(34,29,35,0.12)', minHeight: 72 }}
                value={rating?.reflection_notes ?? ''}
                onChange={e => setNotes(skill.id, e.target.value)}
                placeholder="What do you need to improve? What are you strong at?"
                maxLength={300}
              />
              <div className="text-right text-[10px] text-text-muted mt-1">
                {rating?.reflection_notes?.length ?? 0}/300
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
