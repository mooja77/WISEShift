import clsx from 'clsx';
import { getMaturityLevelByName } from '@wiseshift/shared';
import { formatScore } from '../../utils/locale';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DomainScoreCardProps {
  /** Unique key identifying the domain. */
  domainKey: string;
  /** Human-readable domain name. */
  domainName: string;
  /** Numeric score for the domain (0-5). */
  score: number;
  /** Maturity level label (e.g. "Emerging", "Developing"). */
  maturityLevel: string;
  /** Accent color for the domain (hex string). */
  color: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DomainScoreCard({
  domainKey,
  domainName,
  score,
  maturityLevel,
  color,
}: DomainScoreCardProps) {
  // Look up the canonical maturity level to get its color.
  const maturity = getMaturityLevelByName(maturityLevel);
  const badgeColor = maturity?.color ?? '#6B7280';

  // Percentage fill for the progress bar (score out of 5).
  const fillPercent = Math.min(Math.max((score / 5) * 100, 0), 100);

  return (
    <div
      data-domain={domainKey}
      className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <div className="px-5 py-4">
        {/* Header row: domain name + maturity badge */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900 leading-tight">
            {domainName}
          </h3>

          <span
            className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: badgeColor }}
          >
            {maturityLevel}
          </span>
        </div>

        {/* Score display */}
        <div className="mt-3 flex items-baseline gap-1">
          <span
            className="text-3xl font-bold leading-none"
            style={{ color }}
          >
            {formatScore(score)}
          </span>
          <span className="text-sm font-medium text-gray-400">/5</span>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-500 ease-out',
              )}
              style={{
                width: `${fillPercent}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DomainScoreCard;
