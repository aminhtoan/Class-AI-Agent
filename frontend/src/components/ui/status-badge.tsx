import { clsx } from 'clsx';

export type Status = 'pending' | 'crawling' | 'running' | 'ready' | 'succeeded' | 'failed' | 'cancelled' | 'fetched' | 'processing';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; icon: string; colorClass: string }> = {
  pending: {
    label: 'Pending',
    icon: 'hourglass_empty',
    colorClass: 'bg-status-pending/10 text-status-pending',
  },
  crawling: {
    label: 'Crawling',
    icon: 'sync',
    colorClass: 'bg-primary-container/10 text-primary-container',
  },
  running: {
    label: 'Running',
    icon: 'sync',
    colorClass: 'bg-primary-container/10 text-primary-container',
  },
  ready: {
    label: 'Ready',
    icon: 'check_circle',
    colorClass: 'bg-status-ready/10 text-status-ready',
  },
  succeeded: {
    label: 'Succeeded',
    icon: 'check_circle',
    colorClass: 'bg-status-ready/10 text-status-ready',
  },
  fetched: {
    label: 'Fetched',
    icon: 'check_circle',
    colorClass: 'bg-status-ready/10 text-status-ready',
  },
  failed: {
    label: 'Failed',
    icon: 'error',
    colorClass: 'bg-status-failed/10 text-status-failed',
  },
  cancelled: {
    label: 'Cancelled',
    icon: 'cancel',
    colorClass: 'bg-outline/10 text-outline',
  },
  processing: {
    label: 'Processing',
    icon: 'sync',
    colorClass: 'bg-status-pending/10 text-status-pending',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const isAnimated = status === 'crawling' || status === 'running' || status === 'processing';

  return (
    <span
      className={clsx(
        'px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1',
        config.colorClass,
        isAnimated && 'animate-pulse',
        className
      )}
    >
      <span
        className={clsx(
          'material-symbols-outlined text-[14px]',
          isAnimated && 'animate-spin'
        )}
      >
        {config.icon}
      </span>
      {config.label}
    </span>
  );
}
