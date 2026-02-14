import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { DOMAINS } from '@wiseshift/shared';
import type { AssessmentTimelineEntry } from '@wiseshift/shared';
import { resultsApi } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface AssessmentTimelineProps {
  assessmentId: string;
}

const DOMAIN_COLORS: Record<string, string> = {};
for (const d of DOMAINS) {
  DOMAIN_COLORS[d.key] = d.color;
}

export default function AssessmentTimeline({ assessmentId }: AssessmentTimelineProps) {
  const [timeline, setTimeline] = useState<AssessmentTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resultsApi.getTimeline(assessmentId)
      .then(res => setTimeline(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assessmentId]);

  if (loading) return <LoadingSpinner />;
  if (timeline.length < 2) return null; // Only show when there are multiple assessments

  // Build chart data: each entry becomes a row with date + domain scores
  const chartData = timeline.map((entry, i) => {
    const row: Record<string, any> = {
      name: `Assessment ${i + 1}`,
      date: new Date(entry.completedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      overall: entry.overallScore,
    };
    for (const d of DOMAINS) {
      row[d.key] = entry.domainScores[d.key] ?? null;
    }
    return row;
  });

  // Calculate deltas between first and latest
  const first = timeline[0];
  const latest = timeline[timeline.length - 1];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Assessment Timeline
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Score progression across {timeline.length} assessments
      </p>

      {/* Line chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg, white)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            {DOMAINS.map(d => (
              <Line
                key={d.key}
                type="monotone"
                dataKey={d.key}
                name={d.name}
                stroke={d.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Delta indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DOMAINS.map(d => {
          const firstScore = first.domainScores[d.key] ?? 0;
          const latestScore = latest.domainScores[d.key] ?? 0;
          const delta = latestScore - firstScore;
          const deltaStr = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);

          return (
            <div key={d.key} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{d.name}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {latestScore.toFixed(1)}
                </span>
                <span className={`text-xs font-semibold ${
                  delta > 0.1 ? 'text-emerald-600 dark:text-emerald-400'
                    : delta < -0.1 ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {deltaStr}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
