import clsx from 'clsx';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectorDomainScore {
  domainKey: string;
  domainName: string;
  score: number;
}

export interface SectorBenchmarkData {
  domainAverages: Record<string, number>;
  domainPercentiles: Record<
    string,
    { p25: number; p50: number; p75: number }
  >;
}

export interface SectorComparisonProps {
  /** Organisation domain scores. */
  domainScores: SectorDomainScore[];
  /** Sector benchmark data including averages and percentiles. */
  benchmarkData: SectorBenchmarkData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SectorComparison({
  domainScores,
  benchmarkData,
}: SectorComparisonProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Domain
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Your Score
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Sector Average
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              25th Pctile
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Median
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              75th Pctile
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              vs. Average
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {domainScores.map((domain) => {
            const average =
              benchmarkData.domainAverages[domain.domainKey] ?? 0;
            const percentiles =
              benchmarkData.domainPercentiles[domain.domainKey];
            const diff = domain.score - average;
            const isAbove = diff >= 0;

            return (
              <tr
                key={domain.domainKey}
                className="transition-colors hover:bg-gray-50/50"
              >
                {/* Domain name */}
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  {domain.domainName}
                </td>

                {/* Your score */}
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <span className="text-sm font-semibold text-brand-700 tabular-nums">
                    {domain.score.toFixed(1)}
                  </span>
                </td>

                {/* Sector average */}
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-600 tabular-nums">
                  {average.toFixed(1)}
                </td>

                {/* 25th percentile */}
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-500 tabular-nums">
                  {percentiles ? percentiles.p25.toFixed(1) : '-'}
                </td>

                {/* Median (50th) */}
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-500 tabular-nums">
                  {percentiles ? percentiles.p50.toFixed(1) : '-'}
                </td>

                {/* 75th percentile */}
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-500 tabular-nums">
                  {percentiles ? percentiles.p75.toFixed(1) : '-'}
                </td>

                {/* Above / below average indicator */}
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      isAbove
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700',
                    )}
                  >
                    {isAbove ? (
                      <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                    )}
                    {isAbove ? '+' : ''}
                    {diff.toFixed(1)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default SectorComparison;
