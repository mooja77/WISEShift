import { useEffect, useState } from 'react';
import { reassessmentApi } from '../../services/api';
import { RadarChart } from './RadarChart';
import type { ReassessmentComparison as ComparisonData } from '@wiseshift/shared';

interface ReassessmentComparisonProps {
  assessmentId: string;
}

export default function ReassessmentComparison({ assessmentId }: ReassessmentComparisonProps) {
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await reassessmentApi.getComparison(assessmentId);
        setComparison(res.data.data);
      } catch {
        // No comparison available
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [assessmentId]);

  if (loading || !comparison) return null;

  const currentScores = comparison.domains.map((d) => ({
    domainKey: d.domainKey,
    domainName: d.domainName,
    score: d.currentScore,
  }));

  const previousScores = comparison.domains.map((d) => ({
    domainKey: d.domainKey,
    domainName: d.domainName,
    score: d.previousScore,
  }));

  return (
    <div className="card">
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Reassessment Comparison</h2>
      <p className="mb-4 text-sm text-gray-500">
        Comparing your current assessment with your previous one. Blue = current, gray = previous.
      </p>

      {/* Overlaid radar chart */}
      <div className="flex justify-center">
        <RadarChart domainScores={currentScores} benchmarkScores={previousScores} />
      </div>

      {/* Domain deltas */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {comparison.domains.map((d) => (
          <div
            key={d.domainKey}
            className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3 text-center"
          >
            <p className="text-xs font-medium text-gray-500 truncate">{d.domainName}</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-gray-900">
                {d.currentScore.toFixed(1)}
              </span>
              {d.direction === 'improved' && (
                <span className="flex items-center gap-0.5 text-sm font-medium text-green-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18" />
                  </svg>
                  +{d.delta.toFixed(1)}
                </span>
              )}
              {d.direction === 'declined' && (
                <span className="flex items-center gap-0.5 text-sm font-medium text-red-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l-4 4m0 0l-4-4m4 4V3" />
                  </svg>
                  {d.delta.toFixed(1)}
                </span>
              )}
              {d.direction === 'unchanged' && (
                <span className="text-sm font-medium text-gray-400">=</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
