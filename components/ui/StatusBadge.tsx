import type { CohortStatus, ActionStatus, UserCohortStatus } from '@/types';

type StatusType = CohortStatus | ActionStatus | UserCohortStatus | string;

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:       { label: 'Draft',       cls: 'tag-grey'   },
  scheduled:   { label: 'Scheduled',   cls: 'tag-blue'   },
  live:        { label: 'Live',        cls: 'tag-green'  },
  completed:   { label: 'Completed',   cls: 'tag-purple' },
  active:      { label: 'Active',      cls: 'tag-green'  },
  archived:    { label: 'Archived',    cls: 'tag-grey'   },
  pending:     { label: 'Pending',     cls: 'tag-orange' },
  in_progress: { label: 'In Progress', cls: 'tag-blue'   },
  delayed:     { label: 'Delayed',     cls: 'tag-red'    },
  skipped:     { label: 'Skipped',     cls: 'tag-grey'   },
  nominated:   { label: 'Nominated',   cls: 'tag-orange' },
  confirmed:   { label: 'Confirmed',   cls: 'tag-green'  },
  declined:    { label: 'Declined',    cls: 'tag-red'    },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, cls: 'tag-grey' };
  return (
    <span className={`tag ${config.cls} ${className}`}>
      {config.label}
    </span>
  );
}
