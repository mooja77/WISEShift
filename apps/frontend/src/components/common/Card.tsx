import { type ReactNode } from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardProps {
  /** Optional heading displayed at the top of the card. */
  title?: string;
  /** Optional subtitle rendered beneath the title. */
  subtitle?: string;
  /** Optional ReactNode rendered in the top-right corner of the header row. */
  action?: ReactNode;
  /** Extra Tailwind / CSS classes applied to the outer container. */
  className?: string;
  /** Card body content. */
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Card({
  title,
  subtitle,
  action,
  className,
  children,
}: CardProps) {
  const hasHeader = title || subtitle || action;

  return (
    <div
      className={clsx(
        'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800',
        className,
      )}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div className="min-w-0">
            {title && (
              <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>

          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

export default Card;
