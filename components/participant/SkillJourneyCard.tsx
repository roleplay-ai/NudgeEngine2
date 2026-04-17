'use client';

interface Skill {
  id: string;
  name: string;
}

interface SkillJourneyCardProps {
  skill: Skill;
  preRating: number | null;
  postRating: number | null;
  growth: number | null;
  onRateNow?: () => void;
  compact?: boolean;
}

const MAX = 5;

function RatingBar({ value, color, label }: { value: number | null; color: string; label: string }) {
  const pct = value != null ? (value / MAX) * 100 : 0;
  return (
    <div className="flex-1">
      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(34,29,35,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, opacity: value != null ? 1 : 0.3 }}
        />
      </div>
      <div className="text-xs font-bold mt-1" style={{ color: value != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {value != null ? `${value}/5` : '—'}
      </div>
    </div>
  );
}

export default function SkillJourneyCard({
  skill, preRating, postRating, growth, onRateNow, compact = false,
}: SkillJourneyCardProps) {
  return (
    <div className="card mb-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-brand-dark text-sm">{skill.name}</h3>
          {!compact && growth !== null && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1"
              style={{
                background: growth >= 0 ? 'rgba(35,206,104,0.12)' : 'rgba(237,69,81,0.12)',
                color: growth >= 0 ? 'var(--green)' : 'var(--red)',
              }}
            >
              {growth >= 0 ? '+' : ''}{growth.toFixed(1)} ↑
            </span>
          )}
        </div>
        {postRating == null && onRateNow && (
          <button
            onClick={onRateNow}
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: 'var(--yellow)', color: 'var(--dark)' }}
          >
            Rate now →
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <RatingBar value={preRating} color="#8A8090" label="Before" />
        <RatingBar value={postRating} color="var(--yellow)" label="Now" />
        <RatingBar value={MAX} color="transparent" label="Target" />
      </div>
    </div>
  );
}
