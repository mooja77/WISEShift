import clsx from 'clsx';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import type { ActionPlanItem } from '@wiseshift/shared';
import { getDomainByKey } from '@wiseshift/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecommendationCardProps {
  /** The action plan item to render. */
  item: ActionPlanItem;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const effortColors: Record<ActionPlanItem['effort'], string> = {
  low: 'bg-green-50 text-green-700 ring-green-600/20',
  medium: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  high: 'bg-red-50 text-red-700 ring-red-600/20',
};

const impactColors: Record<ActionPlanItem['impact'], string> = {
  low: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  medium: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  high: 'bg-brand-50 text-brand-700 ring-brand-600/20',
};

const timeframeLabels: Record<ActionPlanItem['timeframe'], string> = {
  short: '0-3 months',
  medium: '3-6 months',
  long: '6-12 months',
};

const timeframeColors: Record<ActionPlanItem['timeframe'], string> = {
  short: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  medium: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  long: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecommendationCard({ item }: RecommendationCardProps) {
  const domain = getDomainByKey(item.domainKey);
  const domainColor = domain?.color ?? '#6B7280';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        {/* Domain badge + recommendation title */}
        <div className="flex flex-wrap items-start gap-2">
          <span
            className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: domainColor }}
          >
            {item.domainName}
          </span>
        </div>

        <h4 className="mt-2.5 text-sm font-bold text-gray-900 leading-snug">
          {item.recommendation}
        </h4>

        <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
          {item.description}
        </p>

        {/* Level progression */}
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
            {item.currentLevel}
          </span>
          <ArrowRightIcon className="h-3.5 w-3.5 text-gray-400" />
          <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
            {item.targetLevel}
          </span>
        </div>

        {/* Effort / Impact / Timeframe badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={clsx(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
              effortColors[item.effort],
            )}
          >
            Effort: {capitalize(item.effort)}
          </span>

          <span
            className={clsx(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
              impactColors[item.impact],
            )}
          >
            Impact: {capitalize(item.impact)}
          </span>

          <span
            className={clsx(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
              timeframeColors[item.timeframe],
            )}
          >
            {timeframeLabels[item.timeframe]}
          </span>
        </div>
      </div>
    </div>
  );
}

export default RecommendationCard;
