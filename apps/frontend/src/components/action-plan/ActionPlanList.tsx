import { useMemo, useState } from 'react';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InboxIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import type { ActionPlanItem } from '@wiseshift/shared';
import { RecommendationCard } from './RecommendationCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionPlanListProps {
  /** Action plan items to display, grouped by priority. */
  items: ActionPlanItem[];
  /** Callback when an item's status/notes change. */
  onUpdateItem?: (planId: string, data: { status?: string; notes?: string }) => void;
  /** Whether progress tracking controls are enabled. */
  trackingEnabled?: boolean;
}

// ---------------------------------------------------------------------------
// Priority group configuration
// ---------------------------------------------------------------------------

type Priority = ActionPlanItem['priority'];
type StatusFilter = 'all' | 'not_started' | 'in_progress' | 'completed';

interface PriorityGroupConfig {
  label: string;
  headerBg: string;
  headerText: string;
  icon: React.ElementType;
}

const PRIORITY_CONFIG: Record<Priority, PriorityGroupConfig> = {
  high: {
    label: 'High Priority',
    headerBg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    headerText: 'text-red-800 dark:text-red-300',
    icon: ExclamationTriangleIcon,
  },
  medium: {
    label: 'Medium Priority',
    headerBg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    headerText: 'text-amber-800 dark:text-amber-300',
    icon: ExclamationCircleIcon,
  },
  low: {
    label: 'Low Priority',
    headerBg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    headerText: 'text-green-800 dark:text-green-300',
    icon: CheckCircleIcon,
  },
};

const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByPriority(items: ActionPlanItem[]): Record<Priority, ActionPlanItem[]> {
  const groups: Record<Priority, ActionPlanItem[]> = { high: [], medium: [], low: [] };
  for (const item of items) {
    groups[item.priority].push(item);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActionPlanList({ items, onUpdateItem, trackingEnabled = false }: ActionPlanListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredItems = useMemo(
    () => statusFilter === 'all' ? items : items.filter(i => i.status === statusFilter),
    [items, statusFilter],
  );
  const grouped = useMemo(() => groupByPriority(filteredItems), [filteredItems]);

  // Progress stats
  const total = items.length;
  const completed = items.filter(i => i.status === 'completed').length;
  const inProgress = items.filter(i => i.status === 'in_progress').length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-600 dark:bg-gray-800/50">
        <InboxIcon className="h-10 w-10 text-gray-400" />
        <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          No action plan items
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Complete an assessment to generate personalised recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress summary bar */}
      {trackingEnabled && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Action Plan Progress
            </h3>
            <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
              {completed}/{total} completed ({progressPct}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="flex h-full">
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${(completed / total) * 100}%` }}
              />
              <div
                className="bg-amber-400 transition-all duration-300"
                style={{ width: `${(inProgress / total) * 100}%` }}
              />
            </div>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> {completed} completed
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> {inProgress} in progress
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-gray-400" /> {total - completed - inProgress} not started
            </span>
          </div>
        </div>
      )}

      {/* Status filter */}
      {trackingEnabled && (
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-4 w-4 text-gray-400" />
          {(['all', 'not_started', 'in_progress', 'completed'] as StatusFilter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              {f === 'all' ? 'All' : f === 'not_started' ? 'Not Started' : f === 'in_progress' ? 'In Progress' : 'Completed'}
            </button>
          ))}
        </div>
      )}

      {/* Priority groups */}
      <div className="space-y-8">
        {PRIORITY_ORDER.map((priority) => {
          const groupItems = grouped[priority];
          if (groupItems.length === 0) return null;

          const config = PRIORITY_CONFIG[priority];
          const Icon = config.icon;

          return (
            <section key={priority}>
              <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 ${config.headerBg}`}>
                <Icon className={`h-5 w-5 ${config.headerText}`} />
                <h3 className={`text-sm font-semibold ${config.headerText}`}>
                  {config.label}
                </h3>
                <span className={`ml-auto text-xs font-medium ${config.headerText} opacity-70`}>
                  {groupItems.length} {groupItems.length === 1 ? 'recommendation' : 'recommendations'}
                </span>
              </div>

              <div className="mt-3 grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {groupItems.map((item) => (
                  <RecommendationCard
                    key={item.id}
                    item={item}
                    onUpdate={onUpdateItem}
                    trackingEnabled={trackingEnabled}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default ActionPlanList;
