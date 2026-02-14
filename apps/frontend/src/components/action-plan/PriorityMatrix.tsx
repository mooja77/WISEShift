import { useMemo } from 'react';
import clsx from 'clsx';
import type { ActionPlanItem } from '@wiseshift/shared';
import { getDomainByKey } from '@wiseshift/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PriorityMatrixProps {
  /** Action plan items to plot on the effort vs. impact matrix. */
  items: ActionPlanItem[];
}

// ---------------------------------------------------------------------------
// Quadrant definitions
// ---------------------------------------------------------------------------

type EffortLevel = ActionPlanItem['effort'];
type ImpactLevel = ActionPlanItem['impact'];

/** Map textual levels to numeric positions (0 = low, 1 = medium, 2 = high). */
const LEVEL_INDEX: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

interface Quadrant {
  label: string;
  subtitle: string;
  /** CSS classes for the quadrant background. */
  bg: string;
  /** Effort range: [minIndex, maxIndex] (inclusive). */
  effortRange: [number, number];
  /** Impact range: [minIndex, maxIndex] (inclusive). */
  impactRange: [number, number];
  /** Grid position: row / col (CSS grid with row 1 = top). */
  gridRow: number;
  gridCol: number;
}

const QUADRANTS: Quadrant[] = [
  {
    label: 'Quick Wins',
    subtitle: 'Low Effort, High Impact',
    bg: 'bg-green-50/70',
    effortRange: [0, 1], // low-medium effort
    impactRange: [2, 2], // high impact
    gridRow: 1,
    gridCol: 1,
  },
  {
    label: 'Major Projects',
    subtitle: 'High Effort, High Impact',
    bg: 'bg-blue-50/70',
    effortRange: [2, 2], // high effort
    impactRange: [2, 2], // high impact
    gridRow: 1,
    gridCol: 2,
  },
  {
    label: 'Fill-Ins',
    subtitle: 'Low Effort, Low Impact',
    bg: 'bg-gray-50/70',
    effortRange: [0, 1], // low-medium effort
    impactRange: [0, 1], // low-medium impact
    gridRow: 2,
    gridCol: 1,
  },
  {
    label: 'Thankless Tasks',
    subtitle: 'High Effort, Low Impact',
    bg: 'bg-amber-50/70',
    effortRange: [2, 2], // high effort
    impactRange: [0, 1], // low-medium impact
    gridRow: 2,
    gridCol: 2,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getQuadrantIndex(effort: EffortLevel, impact: ImpactLevel): number {
  const effortIdx = LEVEL_INDEX[effort];
  const impactIdx = LEVEL_INDEX[impact];

  return QUADRANTS.findIndex(
    (q) =>
      effortIdx >= q.effortRange[0] &&
      effortIdx <= q.effortRange[1] &&
      impactIdx >= q.impactRange[0] &&
      impactIdx <= q.impactRange[1],
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PriorityMatrix({ items }: PriorityMatrixProps) {
  /** Group items into their respective quadrants. */
  const quadrantItems = useMemo(() => {
    const result: ActionPlanItem[][] = QUADRANTS.map(() => []);

    for (const item of items) {
      const idx = getQuadrantIndex(item.effort, item.impact);
      if (idx >= 0) {
        result[idx].push(item);
      }
    }

    return result;
  }, [items]);

  return (
    <div className="w-full">
      {/* Axis labels */}
      <div className="mb-1 flex items-end justify-between px-10">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Impact
        </span>
      </div>

      <div className="flex">
        {/* Y-axis label */}
        <div className="flex w-8 shrink-0 flex-col items-center justify-between py-4">
          <span className="text-[10px] font-medium text-gray-500">High</span>
          <span className="text-[10px] font-medium text-gray-500">Low</span>
        </div>

        {/* Matrix grid */}
        <div className="flex-1">
          <div className="grid grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200">
            {QUADRANTS.map((quadrant, qIdx) => (
              <div
                key={quadrant.label}
                className={clsx(
                  'relative min-h-[180px] p-4',
                  quadrant.bg,
                )}
                style={{
                  gridRow: quadrant.gridRow,
                  gridColumn: quadrant.gridCol,
                }}
              >
                {/* Quadrant label */}
                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {quadrant.label}
                  </h4>
                  <p className="text-[10px] text-gray-500">
                    {quadrant.subtitle}
                  </p>
                </div>

                {/* Items as chips */}
                <div className="flex flex-wrap gap-1.5">
                  {quadrantItems[qIdx].map((item) => {
                    const domain = getDomainByKey(item.domainKey);
                    const dotColor = domain?.color ?? '#6B7280';

                    return (
                      <div
                        key={item.id}
                        title={`${item.domainName}: ${item.recommendation}`}
                        className="group relative flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm transition-shadow hover:shadow-md"
                      >
                        {/* Domain color dot */}
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: dotColor }}
                        />
                        <span className="max-w-[140px] truncate text-xs font-medium text-gray-800">
                          {item.recommendation}
                        </span>

                        {/* Hover tooltip */}
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                          <p className="font-semibold text-gray-900">
                            {item.recommendation}
                          </p>
                          <p className="mt-0.5 text-gray-500">
                            {item.domainName} &middot; Effort:{' '}
                            {item.effort} &middot; Impact: {item.impact}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {quadrantItems[qIdx].length === 0 && (
                    <span className="text-xs italic text-gray-400">
                      No items
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* X-axis labels */}
          <div className="mt-1 flex items-start justify-between px-4">
            <span className="text-[10px] font-medium text-gray-500">
              Low Effort
            </span>
            <span className="text-[10px] font-medium text-gray-500">
              High Effort
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      {items.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3 px-10">
          {Array.from(new Set(items.map((i) => i.domainKey))).map(
            (domainKey) => {
              const domain = getDomainByKey(domainKey);
              if (!domain) return null;

              return (
                <div key={domainKey} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: domain.color }}
                  />
                  <span className="text-xs text-gray-600">
                    {domain.shortName}
                  </span>
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}

export default PriorityMatrix;
