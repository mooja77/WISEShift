import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface LoadingSpinnerProps {
  /** Diameter of the spinner. @default 'md' */
  size?: SpinnerSize;
  /** Extra Tailwind / CSS classes. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LoadingSpinner({
  size = 'md',
  className,
}: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={clsx('inline-block', className)}
    >
      <span
        className={clsx(
          'block animate-spin rounded-full border-current border-r-transparent',
          sizeStyles[size],
        )}
      />
      <span className="sr-only">Loading...</span>
    </span>
  );
}

export default LoadingSpinner;
