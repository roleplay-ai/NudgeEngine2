'use client';

interface Props {
  programmeName: string;
  programmeDescription?: string | null;
  rating: number;
  reflectionNotes: string;
  onRatingChange: (score: number) => void;
  onNotesChange: (notes: string) => void;
}

export default function ProgrammeRatingCard({
  programmeName,
  programmeDescription,
  rating,
  reflectionNotes,
  onRatingChange,
  onNotesChange,
}: Props) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: '#623CEA' }}>
          Programme
        </span>
      </div>
      <h3 className="font-bold text-brand-dark text-base mb-1">{programmeName}</h3>
      {programmeDescription && (
        <p className="text-xs text-text-muted mb-4 leading-relaxed">{programmeDescription}</p>
      )}

      <p className="text-sm text-text-secondary mb-4">
        How confident do you feel about this programme before training? (1 = not confident, 5 = very confident)
      </p>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[1, 2, 3, 4, 5].map(score => (
          <button
            key={score}
            type="button"
            onClick={() => onRatingChange(score)}
            className="transition-all duration-150"
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 18,
              border: rating === score ? '2px solid #FFCE00' : '1.5px solid rgba(34,29,35,0.12)',
              background: rating === score ? '#FFCE00' : '#fff',
              color: rating === score ? '#221D23' : '#8A8090',
              boxShadow: rating === score ? '0 4px 14px rgba(255,206,0,0.35)' : 'none',
              transform: rating === score ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            {score}
          </button>
        ))}
        <span className="text-[10px] text-text-muted ml-1">
          1 = Low · 5 = High
        </span>
      </div>

      <div>
        <label className="text-xs font-semibold text-text-secondary block mb-1.5">
          Anything you want the facilitator to know? <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <textarea
          className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-yellow/40"
          style={{ borderColor: 'rgba(34,29,35,0.12)', minHeight: 72 }}
          value={reflectionNotes}
          onChange={e => {
            const v = e.target.value;
            if (v.length <= 300) onNotesChange(v);
          }}
          placeholder="Goals, concerns, or context for the session…"
          maxLength={300}
        />
        <div className="text-right text-[10px] text-text-muted mt-1">
          {reflectionNotes.length}/300
        </div>
      </div>
    </div>
  );
}
