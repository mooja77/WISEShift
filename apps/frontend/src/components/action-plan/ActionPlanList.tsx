import { useMemo } from 'react';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';
import type { ActionPlanItem } from '@wiseshift/shared';
import { RecommendationCard } from './RecommendationCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionPlanListProps {
  /** Action plan items to display, grouped by priority. */
  items: ActionPlanItem[];
}

// ---------------------------------------------------------------------------
// Priority group configuration
// ---------------------------------------------------------------------------

type Priority = ActionPlanItem['priority'];

interface PriorityGroupConfig {
  label: string;
  headerBg: string;
  headerText: string;
  icon: React.ElementType;
}

const PRIORITY_CONFIG: Record<Priority, PriorityGroupConfig> = {
  high: {
    label: 'High Priority',
    headerBg: 'bg-red-50 border-red-200',
    headerText: 'text-red-800',
    icon: ExclamationTriangleIcon,
  },
  medium: {
    label: 'Medium Priority',
    headerBg: 'bg-amber-50 border-amber-200',
    headerText: 'text-amber-800',
    icon: ExclamationCircleIcon,
  },
  low: {
    label: 'Low Priority',
    headerBg: 'bg-green-50 border-green-200',
    headerText: 'text-green-800',
    icon: CheckCircleIcon,
  },
};

/** Render order for priority groups. */
const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByPriority(
  items: ActionPlanItem[],
): Record<Priority, ActionPlanItem[]> {
  const groups: Record<Priority, ActionPlanItem[]> = {
    high: [],
    medium: [],
    low: [],
  };

  for (const item of items) {
    groups[item.priority].push(item);
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActionPlanList({ items }: ActionPlanListProps) {
  const grouped = useMemo(() => groupByPriority(items), [items]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
        <InboxIcon className="h-10 w-10 text-gray-400" />
        <h3 className="mt-3 text-sm font-semibold text-gray-900">
          No action plan items
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Complete an assessment to generate personalised recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {PRIORITY_ORDER.map((priority) => {
        const groupItems = grouped[priority];
        if (groupItems.length === 0) return null;

        const config = PRIORITY_CONFIG[priority];
        const Icon = config.icon;

        return (
          <section key={priority}>
            {/* Group header */}
            <div
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 ${config.headerBg}`}
            >
              <Icon className={`h-5 w-5 ${config.headerText}`} />
              <h3
                className={`text-sm font-semibold ${config.headerText}`}
              >
                {config.label}
              </h3>
              <span
                className={`ml-auto text-xs font-medium ${config.headerText} opacity-70`}
              >
                {groupItems.length}{' '}
                {groupItems.length === 1 ? 'recommendation' : 'recommendations'}
              </span>
            </div>

            {/* Recommendation cards */}
            <div className="mt-3 grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {groupItems.map((item) => (
                <RecommendationCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default ActionPlanList;
