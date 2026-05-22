import { clsx } from 'clsx';

interface ProgressBarProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
  variant?: 'default' | 'gradient';
}

export function ProgressBar({
  progress,
  label,
  showPercentage = true,
  className,
  variant = 'default',
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={clsx('space-y-2', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between text-xs font-medium text-outline">
          {label && <span>{label}</span>}
          {showPercentage && <span>{Math.round(clampedProgress)}%</span>}
        </div>
      )}
      <div className="h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full progress-transition',
            variant === 'gradient' ? 'progress-gradient' : 'bg-primary'
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
