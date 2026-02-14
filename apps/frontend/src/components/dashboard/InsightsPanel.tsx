import clsx from 'clsx';
import {
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import type { DashboardInsight } from '@wiseshift/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InsightsPanelProps {
  /** Array of dashboard insights to display. */
  insights: DashboardInsight[];
}

// ---------------------------------------------------------------------------
// Insight type configuration
// ---------------------------------------------------------------------------

type InsightType = DashboardInsight['type'];

interface InsightConfig {
  icon: React.ElementType;
  label: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
}

const INSIGHT_CONFIG: Record<InsightType, InsightConfig> = {
  strength: {
    icon: CheckBadgeIcon,
    label: 'Strength',
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50/50',
    borderColor: 'border-green-200',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
  },
  weakness: {
    icon: ExclamationTriangleIcon,
    label: 'Area for Improvement',
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50/50',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
  },
  trend: {
    icon: ArrowTrendingUpIcon,
    label: 'Trend',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50/50',
    borderColor: 'border-blue-200',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
  },
  recommendation: {
    icon: LightBulbIcon,
    label: 'Recommendation',
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50/50',
    borderColor: 'border-purple-200',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
        <LightBulbIcon className="h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          No insights available yet. Insights will appear as assessments are
          completed.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
      {insights.map((insight, index) => {
        const config = INSIGHT_CONFIG[insight.type];
        const Icon = config.icon;

        return (
          <div
            key={`${insight.type}-${insight.title}-${index}`}
            className={clsx(
              'rounded-xl border p-4 transition-shadow hover:shadow-sm',
              config.borderColor,
              config.bgColor,
            )}
          >
            {/* Header row: icon + type badge */}
            <div className="flex items-start gap-3">
              <div
                className={clsx(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  config.badgeBg,
                )}
              >
                <Icon className={clsx('h-5 w-5', config.iconColor)} />
              </div>

              <div className="min-w-0 flex-1">
                {/* Type label */}
                <span
                  className={clsx(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    config.badgeBg,
                    config.badgeText,
                  )}
                >
                  {config.label}
                </span>

                {/* Title */}
                <h4 className="mt-1.5 text-sm font-semibold text-gray-900 leading-snug">
                  {insight.title}
                </h4>

                {/* Description */}
                <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                  {insight.description}
                </p>

                {/* Optional metadata */}
                {(insight.domainKey || insight.value !== undefined) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {insight.domainKey && (
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {insight.domainKey}
                      </span>
                    )}
                    {insight.value !== undefined && (
                      <span className="text-xs font-semibold tabular-nums text-gray-700">
                        {insight.value.toFixed(1)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default InsightsPanel;
