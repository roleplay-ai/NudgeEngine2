'use client';

interface Action {
  id: string;
  custom_title: string | null;
  builds_capability: string | null;
  status: string;
  nudge_scheduled_date: string | null;
}

interface Props {
  action: Action;
  onChangeDate: (id: string, iso: string | null) => void;
  onRemove?: (id: string) => void;
}

export default function ActionCard({ action, onChangeDate, onRemove }: Props) {
  const title = action.custom_title ?? 'Action';

  return (
    <div className="card flex items-start justify-between gap-3" style={{ marginBottom: 0 }}>
      <div className="min-w-0">
        <div className="font-semibold text-brand-dark text-sm">{title}</div>
        {action.builds_capability && (
          <span className="tag tag-purple text-[10px] mt-1 inline-block">Builds: {action.builds_capability}</span>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <input
          type="date"
          className="text-xs rounded-lg border px-2 py-1"
          style={{ borderColor: 'rgba(34,29,35,0.12)' }}
          value={action.nudge_scheduled_date ?? ''}
          onChange={e => onChangeDate(action.id, e.target.value || null)}
        />
        {onRemove && (
          <button type="button" className="text-[10px] text-text-muted hover:text-red-600" onClick={() => onRemove(action.id)}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
