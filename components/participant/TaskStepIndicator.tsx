/**
 * Shared step indicator for participant pre-training tasks.
 * currentStep: 0-indexed (0 = Task 1, 1 = Task 2, etc.)
 * isCurrentDone: whether the current step has been completed/saved
 */

const STEPS = [
  { label: 'Programme',    activeColor: '#FFCE00' },
  { label: 'Expectations', activeColor: '#623CEA' },
  { label: 'Pre-reads',    activeColor: '#3699FC' },
  { label: 'Meet Batch',   activeColor: '#23CE68' },
] as const;

const DONE_COLOR   = '#23CE68';
const ACTIVE_TEXT  = '#221D23';
const PENDING_BG   = 'rgba(34,29,35,0.08)';
const PENDING_TEXT = '#8A8090';

interface Props {
  currentStep: 0 | 1 | 2 | 3;
  isCurrentDone?: boolean;
}

export default function TaskStepIndicator({ currentStep, isCurrentDone = false }: Props) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map(({ label, activeColor }, i) => {
        const isDone    = i < currentStep || (i === currentStep && isCurrentDone);
        const isActive  = i === currentStep;
        const isPending = i > currentStep;

        const bg    = isDone ? DONE_COLOR : isActive ? activeColor : PENDING_BG;
        const color = isPending ? PENDING_TEXT : '#fff';

        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold transition-all duration-300"
              style={{ background: bg, color }}
            >
              {isDone ? '✓' : i + 1}
            </div>
            <span
              className="text-xs font-semibold transition-colors duration-300"
              style={{ color: isActive ? ACTIVE_TEXT : PENDING_TEXT }}
            >
              {label}
            </span>
            {i < 3 && (
              <div
                className="w-8 h-px transition-all duration-500"
                style={{ background: isDone ? DONE_COLOR : 'rgba(34,29,35,0.12)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
