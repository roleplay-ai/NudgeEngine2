'use client';

interface ActionStats {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  completion_rate: number;
}

interface ProgressHeroProps {
  name: string;
  growthScore: number;
  actionStats: ActionStats;
  daysSinceTraining: number;
  latestConfidence: number | null;
  skillsImproved: number;
}

export default function ProgressHero({
  name,
  growthScore,
  actionStats,
  daysSinceTraining,
  latestConfidence,
  skillsImproved,
}: ProgressHeroProps) {
  const { total, completed, completion_rate: completionRate } = actionStats;
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (completionRate / 100) * circumference;

  return (
    <div className="rounded-2xl p-6 mb-5" style={{ background: 'var(--dark)', color: '#fff' }}>
      <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>
        YOUR GROWTH JOURNEY
      </p>
      <h1 className="text-lg font-extrabold mb-4">{name}&apos;s Progress</h1>

      <div className="flex items-center gap-6">
        {/* Completion ring */}
        <div className="relative flex-shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="var(--yellow)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold" style={{ color: 'var(--yellow)' }}>{completionRate}%</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>done</span>
          </div>
        </div>

        {/* Score */}
        <div>
          <div className="text-4xl font-black mb-1" style={{ color: 'var(--yellow)' }}>{growthScore}</div>
          <div className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Growth Score</div>
          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {daysSinceTraining === 0 ? 'Training day!' : `${daysSinceTraining} day${daysSinceTraining !== 1 ? 's' : ''} since training`}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="text-xl font-extrabold" style={{ color: 'var(--green)' }}>{completed}</div>
          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>of {total} Actions</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="text-xl font-extrabold" style={{ color: 'var(--yellow)' }}>
            {latestConfidence !== null ? `${latestConfidence}/10` : '—'}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Confidence</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="text-xl font-extrabold" style={{ color: 'var(--blue)' }}>{skillsImproved}</div>
          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Skills Up</div>
        </div>
      </div>
    </div>
  );
}
