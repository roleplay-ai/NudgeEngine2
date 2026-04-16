'use client';

interface Props {
  committed: number;
  total: number;
}

export default function CommitmentsSummary({ committed, total }: Props) {
  const pct = total > 0 ? Math.round((committed / total) * 100) : 0;

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="section-label mb-2">COMMITMENT PLANS</div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-brand-dark">
          {committed} of {total} submitted
        </span>
        <span className="text-xs font-bold text-brand-purple">{pct}%</span>
      </div>
      <div className="progress-wrap" style={{ height: 8 }}>
        <div
          className="progress-fill rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: '#623CEA' }}
        />
      </div>
    </div>
  );
}
