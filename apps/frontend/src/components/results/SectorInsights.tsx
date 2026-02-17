import { useEffect, useState } from 'react';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SectorQuestion {
  questionId: string;
  questionText: string;
  questionType: string;
  value: any;
  tags: string[];
}

interface SectorRecommendation {
  recommendation: string;
  description: string;
}

interface SectorData {
  sectorKey: string;
  sectorName: string;
  score: number;
  recommendation: SectorRecommendation | null;
  questions: SectorQuestion[];
}

interface SectorInsightsProps {
  assessmentId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the fill percentage for a numeric score (assumed 1-5 scale). */
function scoreFillPercent(value: number): number {
  return Math.min(Math.max((value / 5) * 100, 0), 100);
}

/** Format a numeric score to two decimal places. */
function fmt(n: number): string {
  return Number(n).toFixed(2);
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function Skeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-4 h-10 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SectorInsights({ assessmentId }: SectorInsightsProps) {
  const [data, setData] = useState<SectorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/assessments/${assessmentId}/sector-results`)
      .then((res) => {
        const payload = res.data;
        if (payload?.success && payload.data) {
          setData(payload.data);
        }
      })
      .catch(() => {
        // Sector results unavailable — silently ignore.
      })
      .finally(() => setLoading(false));
  }, [assessmentId]);

  if (loading) return <Skeleton />;
  if (!data) return null;

  const fillPercent = scoreFillPercent(data.score);

  return (
    <div className="card">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Sector-Specific Insights
        </h2>
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          {data.sectorName}
        </span>
      </div>

      {/* ── Sector Score ── */}
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Sector Score
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {fmt(data.score)}
          </span>
          <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
            / 5
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out dark:bg-emerald-400"
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      {/* ── Recommendation callout ── */}
      {data.recommendation && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-900/20">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            {data.recommendation.recommendation}
          </p>
          {data.recommendation.description && (
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
              {data.recommendation.description}
            </p>
          )}
        </div>
      )}

      {/* ── Question responses ── */}
      {data.questions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Question Responses
          </h3>
          <div className="mt-3 space-y-4">
            {data.questions.map((q) => (
              <div
                key={q.questionId}
                className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40"
              >
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {q.questionText}
                </p>

                {/* Render numeric values as a bar, narrative text inline */}
                {typeof q.value === 'number' ? (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300 dark:bg-emerald-400"
                        style={{ width: `${scoreFillPercent(q.value)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {q.value} / 5
                    </span>
                  </div>
                ) : q.value != null && String(q.value).trim() !== '' ? (
                  <p className="mt-1.5 text-sm text-gray-600 leading-relaxed dark:text-gray-400">
                    {String(q.value)}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm italic text-gray-400 dark:text-gray-500">
                    No response provided.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SectorInsights;
