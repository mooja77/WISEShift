import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProgressBarProps {
  /** Current progress value between 0 and 100. */
  value: number;
  /** Optional label displayed above the bar on the left side. */
  label?: string;
  /** When true the numeric percentage is shown above the bar on the right side. @default false */
  showPercentage?: boolean;
  /** Tailwind background color class for the filled portion. @default 'bg-brand-600' */
  color?: string;
  /** Extra Tailwind / CSS classes applied to the outermost container. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProgressBar({
  value,
  label,
  showPercentage = false,
  color = 'bg-brand-600',
  className,
}: ProgressBarProps) {
  // Clamp the value to [0, 100].
  const clamped = Math.max(0, Math.min(100, value));
  const rounded = Math.round(clamped);

  return (
    <div className={clsx('w-full', className)}>
      {/* Header row with label and / or percentage */}
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label && (
            <span className="font-medium text-gray-700">{label}</span>
          )}
          {showPercentage && (
            <span className="tabular-nums text-gray-500">{rounded}%</span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200"
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `${rounded}% complete`}
      >
        {/* Fill */}
        <div
          className={clsx(
            'h-full rounded-full transition-[width] duration-300 ease-in-out',
            color,
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
