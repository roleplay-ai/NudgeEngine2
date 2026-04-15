'use client';

const TYPE_ICONS: Record<string, string> = {
  pdf: '📄',
  video: '🎬',
  link: '🔗',
  article: '📰',
};

interface Props {
  resource: {
    id: string;
    title: string;
    resource_type: string;
    url?: string | null;
    file_path?: string | null;
    estimated_duration?: string | null;
  };
  isRead: boolean;
  onMarkRead: (resourceId: string) => void;
  loading?: boolean;
}

export default function PrereadItem({ resource, isRead, onMarkRead, loading }: Props) {
  const icon = TYPE_ICONS[resource.resource_type] ?? '📎';

  return (
    <div
      className="card flex items-center gap-4 transition-all"
      style={{
        marginBottom: 0,
        border: isRead ? '1.5px solid rgba(35,206,104,0.3)' : '1px solid rgba(34,29,35,0.08)',
        background: isRead ? '#FAFFF7' : '#fff',
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: isRead ? 'rgba(35,206,104,0.1)' : 'rgba(34,29,35,0.04)' }}
      >
        {isRead ? '✅' : icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-bold text-brand-dark text-sm">{resource.title}</div>
        <div className="text-xs text-text-muted mt-0.5">
          {resource.resource_type.charAt(0).toUpperCase() + resource.resource_type.slice(1)}
          {resource.estimated_duration && ` · ${resource.estimated_duration}`}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Open
          </a>
        )}
        {!isRead ? (
          <button
            className="btn-primary text-xs px-3 py-1.5"
            onClick={() => onMarkRead(resource.id)}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Mark as Read'}
          </button>
        ) : (
          <span className="text-xs font-semibold text-brand-green">Read ✓</span>
        )}
      </div>
    </div>
  );
}
