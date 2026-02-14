import { useState } from 'react';
import clsx from 'clsx';
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, BookOpenIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import type { ActionPlanItem } from '@wiseshift/shared';
import { getDomainByKey, getResourcesForRecommendation, RESOURCE_TYPE_LABELS, RESOURCE_TYPE_COLORS } from '@wiseshift/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecommendationCardProps {
  /** The action plan item to render. */
  item: ActionPlanItem;
  /** Callback when the status or notes change. */
  onUpdate?: (planId: string, data: { status?: string; notes?: string }) => void;
  /** Whether tracking controls are enabled (requires assessment ownership). */
  trackingEnabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const effortColors: Record<ActionPlanItem['effort'], string> = {
  low: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-300',
  medium: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300',
  high: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-300',
};

const impactColors: Record<ActionPlanItem['impact'], string> = {
  low: 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-900/30 dark:text-brand-300',
};

const timeframeLabels: Record<ActionPlanItem['timeframe'], string> = {
  short: '0-3 months',
  medium: '3-6 months',
  long: '6-12 months',
};

const timeframeColors: Record<ActionPlanItem['timeframe'], string> = {
  short: 'bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-900/30 dark:text-teal-300',
  medium: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-300',
  long: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-900/30 dark:text-violet-300',
};

const statusOptions = [
  { value: 'not_started', label: 'Not Started', dot: 'bg-gray-400' },
  { value: 'in_progress', label: 'In Progress', dot: 'bg-amber-400' },
  { value: 'completed', label: 'Completed', dot: 'bg-emerald-500' },
];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecommendationCard({ item, onUpdate, trackingEnabled = false }: RecommendationCardProps) {
  const domain = getDomainByKey(item.domainKey);
  const domainColor = domain?.color ?? '#6B7280';
  const [expanded, setExpanded] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState(item.notes ?? '');

  const resources = getResourcesForRecommendation(item.domainKey, item.currentLevel);

  const currentStatus = statusOptions.find(s => s.value === item.status) ?? statusOptions[0];

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate?.(item.id, { status: e.target.value });
  };

  const handleNotesBlur = () => {
    if (localNotes !== (item.notes ?? '')) {
      onUpdate?.(item.id, { notes: localNotes });
    }
  };

  return (
    <div
      className={clsx(
        'rounded-xl border bg-white shadow-sm overflow-hidden dark:bg-gray-800',
        item.status === 'completed'
          ? 'border-emerald-200 dark:border-emerald-800'
          : 'border-gray-200 dark:border-gray-700',
      )}
    >
      <div className="px-5 py-4">
        {/* Domain badge + status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: domainColor }}
          >
            {item.domainName}
          </span>

          {trackingEnabled ? (
            <div className="flex items-center gap-1.5">
              <span className={clsx('h-2 w-2 rounded-full', currentStatus.dot)} />
              <select
                value={item.status}
                onChange={handleStatusChange}
                className="rounded-md border-0 bg-transparent py-0.5 pl-0 pr-6 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-brand-600 dark:text-gray-300"
              >
                {statusOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className={clsx('h-2 w-2 rounded-full', currentStatus.dot)} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{currentStatus.label}</span>
            </div>
          )}
        </div>

        <h4 className={clsx(
          'mt-2.5 text-sm font-bold leading-snug',
          item.status === 'completed'
            ? 'text-gray-500 line-through dark:text-gray-400'
            : 'text-gray-900 dark:text-gray-100',
        )}>
          {item.recommendation}
        </h4>

        <p className="mt-1.5 text-sm text-gray-600 leading-relaxed dark:text-gray-300">
          {item.description}
        </p>

        {/* Level progression */}
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {item.currentLevel}
          </span>
          <ArrowRightIcon className="h-3.5 w-3.5 text-gray-400" />
          <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {item.targetLevel}
          </span>
        </div>

        {/* Effort / Impact / Timeframe badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', effortColors[item.effort])}>
            Effort: {capitalize(item.effort)}
          </span>
          <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', impactColors[item.impact])}>
            Impact: {capitalize(item.impact)}
          </span>
          <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', timeframeColors[item.timeframe])}>
            {timeframeLabels[item.timeframe]}
          </span>
        </div>

        {/* Expandable notes section */}
        {trackingEnabled && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExpanded(prev => !prev)}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {expanded ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
              {localNotes ? 'Edit notes' : 'Add notes'}
            </button>
            {expanded && (
              <textarea
                value={localNotes}
                onChange={e => setLocalNotes(e.target.value)}
                onBlur={handleNotesBlur}
                rows={3}
                placeholder="Add implementation notes, progress updates..."
                className="mt-2 input text-xs"
              />
            )}
          </div>
        )}

        {/* Resources section */}
        {resources.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setResourcesOpen(prev => !prev)}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <BookOpenIcon className="h-3.5 w-3.5" />
              {resourcesOpen ? 'Hide' : 'View'} Resources ({resources.length})
              {resourcesOpen
                ? <ChevronUpIcon className="h-3 w-3" />
                : <ChevronDownIcon className="h-3 w-3" />
              }
            </button>
            {resourcesOpen && (
              <div className="mt-2 space-y-2">
                {resources.map((r, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
                        >
                          {r.title}
                          <ArrowTopRightOnSquareIcon className="h-3 w-3 shrink-0" />
                        </a>
                        <p className="mt-0.5 text-xs text-gray-500 leading-relaxed dark:text-gray-400">
                          {r.description}
                        </p>
                      </div>
                      <span className={clsx(
                        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                        RESOURCE_TYPE_COLORS[r.type],
                      )}>
                        {RESOURCE_TYPE_LABELS[r.type]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed date */}
        {item.completedAt && (
          <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
            Completed {new Date(item.completedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

export default RecommendationCard;
