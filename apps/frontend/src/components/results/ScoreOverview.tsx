import clsx from 'clsx';
import { CheckCircleIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { getMaturityLevelByName } from '@wiseshift/shared';
import { formatScore } from '../../utils/locale';
import HelpTooltip from '../common/HelpTooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoreOverviewProps {
  /** Overall assessment score (0-5). */
  overallScore: number;
  /** Overall maturity level label (e.g. "Established"). */
  maturityLevel: string;
  /** Domain names identified as top strengths. */
  strengths: string[];
  /** Domain names identified as areas for development. */
  weaknesses: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Tailwind ring / text color class pair based on the score.
 */
function scoreRingColor(score: number): string {
  if (score >= 4.5) return 'text-blue-500 ring-blue-200 bg-blue-50';
  if (score >= 3.5) return 'text-green-500 ring-green-200 bg-green-50';
  if (score >= 2.5) return 'text-yellow-500 ring-yellow-200 bg-yellow-50';
  if (score >= 1.5) return 'text-orange-500 ring-orange-200 bg-orange-50';
  return 'text-red-500 ring-red-200 bg-red-50';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScoreOverview({
  overallScore,
  maturityLevel,
  strengths,
  weaknesses,
}: ScoreOverviewProps) {
  const maturity = getMaturityLevelByName(maturityLevel);
  const badgeColor = maturity?.color ?? '#6B7280';
  const ringClass = scoreRingColor(overallScore);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* ── Score hero ── */}
      <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6">
        {/* Circular score display */}
        <div
          className={clsx(
            'flex h-28 w-28 items-center justify-center rounded-full ring-4',
            ringClass,
          )}
        >
          <div className="text-center">
            <span className="block text-4xl font-extrabold leading-none">
              {formatScore(overallScore)}
            </span>
            <span className="block text-xs font-medium text-gray-400 mt-0.5">
              out of 5 <HelpTooltip tooltipKey="help.scoreCalculation" />
            </span>
          </div>
        </div>

        {/* Maturity badge */}
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-white"
          style={{ backgroundColor: badgeColor }}
        >
          {maturityLevel}
        </span>

        {maturity?.shortDescription && (
          <p className="text-sm text-gray-500 text-center max-w-sm">
            {maturity.shortDescription}
          </p>
        )}
      </div>

      {/* ── Strengths / Weaknesses columns ── */}
      <div className="border-t border-gray-100 px-6 py-5">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Strengths */}
          <div>
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              Top Strengths
            </h4>
            <ul className="mt-3 space-y-2">
              {strengths.length > 0 ? (
                strengths.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-500" />
                    {name}
                  </li>
                ))
              ) : (
                <li className="text-sm italic text-gray-400">
                  No strengths identified yet.
                </li>
              )}
            </ul>
          </div>

          {/* Weaknesses */}
          <div>
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
              <ArrowTrendingUpIcon className="h-5 w-5 text-amber-500" />
              Areas for Development
            </h4>
            <ul className="mt-3 space-y-2">
              {weaknesses.length > 0 ? (
                weaknesses.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <ArrowTrendingUpIcon className="h-4 w-4 shrink-0 text-amber-500" />
                    {name}
                  </li>
                ))
              ) : (
                <li className="text-sm italic text-gray-400">
                  No development areas identified yet.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScoreOverview;
