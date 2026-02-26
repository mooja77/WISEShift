import { useState, useEffect } from 'react';
import { researchApi } from '../../services/api';
import { DOMAINS } from '@wiseshift/shared';
import type { LongitudinalCase, LongitudinalData } from '@wiseshift/shared';
import toast from 'react-hot-toast';

/** Domain key → display name + color */
const DOMAIN_META = Object.fromEntries(
  DOMAINS.map(d => [d.key, { name: d.shortName || d.name, color: d.color }])
);

function formatDate(iso: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatScore(score: number | null): string {
  if (score === null || score === undefined) return '-';
  return score.toFixed(2);
}

/** Delta badge: green for positive, red for negative, gray for zero/null */
function DeltaBadge({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.005) return <span className="text-xs text-gray-400">0.00</span>;
  const isPositive = delta > 0;
  return (
    <span className={`text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      {isPositive ? '+' : ''}{delta.toFixed(2)}
    </span>
  );
}

export default function LongitudinalTracker() {
  const [data, setData] = useState<LongitudinalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await researchApi.getLongitudinal();
        setData(res.data.data);
      } catch {
        toast.error('Failed to load longitudinal data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center text-gray-500 dark:text-gray-400 py-4">Loading longitudinal data...</div>;
  }

  if (!data || data.cases.length === 0) {
    return (
      <div className="card">
        <div className="rounded-lg bg-amber-50 p-6 text-center dark:bg-amber-900/20">
          <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">No Longitudinal Data Available</h3>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            Longitudinal tracking requires organisations to complete multiple assessment rounds linked via the
            &ldquo;previous assessment&rdquo; field. Once repeat assessments exist, score trajectories will appear here.
          </p>
        </div>
      </div>
    );
  }

  const multiRoundCases = data.cases.filter(c => c.rounds.length >= 2);
  const totalOrgs = data.cases.length;
  const totalRounds = data.cases.reduce((sum, c) => sum + c.rounds.length, 0);
  const avgRounds = totalOrgs > 0 ? (totalRounds / totalOrgs) : 0;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Organisations</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{totalOrgs}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">With Multiple Rounds</p>
          <p className="mt-1 text-2xl font-bold text-brand-600 dark:text-brand-400">
            {data.totalOrganisationsWithMultipleRounds}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Rounds per Org</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{avgRounds.toFixed(1)}</p>
        </div>
      </div>

      {/* Multi-round cases */}
      {multiRoundCases.length > 0 ? (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Organisations with Multiple Rounds</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Click an organisation to expand and view score trajectories across assessment rounds.
          </p>

          <div className="mt-4 space-y-2">
            {multiRoundCases.map(c => (
              <CaseRow
                key={c.organisationId}
                caseData={c}
                expanded={expandedOrg === c.organisationId}
                onToggle={() => setExpandedOrg(expandedOrg === c.organisationId ? null : c.organisationId)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No organisations have completed multiple assessment rounds yet.
              Single-round organisations are shown in the summary above.
            </p>
          </div>
        </div>
      )}

      {/* Single-round organisations summary */}
      {data.cases.filter(c => c.rounds.length === 1).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Single-Round Organisations</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            These organisations have completed one assessment round. A second round is needed for trajectory analysis.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Organisation</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Country</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sector</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Overall Score</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.cases.filter(c => c.rounds.length === 1).map(c => (
                  <tr key={c.organisationId}>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{c.label}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{c.country || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{c.sector || '-'}</td>
                    <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{formatScore(c.rounds[0]?.overallScore ?? null)}</td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatDate(c.rounds[0]?.completedAt ?? null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/** Expandable row for an organisation with multiple rounds */
function CaseRow({
  caseData,
  expanded,
  onToggle,
}: {
  caseData: LongitudinalCase;
  expanded: boolean;
  onToggle: () => void;
}) {
  const latestRound = caseData.rounds[caseData.rounds.length - 1];
  const previousRound = caseData.rounds.length >= 2 ? caseData.rounds[caseData.rounds.length - 2] : null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <div>
            <span className="font-medium text-gray-900 dark:text-gray-100">{caseData.label}</span>
            <div className="flex gap-2 mt-0.5">
              {caseData.country && (
                <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  {caseData.country}
                </span>
              )}
              {caseData.sector && (
                <span className="inline-block rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                  {caseData.sector}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {caseData.rounds.length} rounds
          </span>
          {previousRound && latestRound && (
            <DeltaBadge current={latestRound.overallScore} previous={previousRound.overallScore} />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4 space-y-6 bg-gray-50/50 dark:bg-gray-800/50">
          {/* Rounds table */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assessment Rounds</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Round</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Overall Score</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Change</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {caseData.rounds.map((round, idx) => {
                    const prev = idx > 0 ? caseData.rounds[idx - 1] : null;
                    return (
                      <tr key={round.assessmentId}>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">Round {round.roundNumber}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{formatScore(round.overallScore)}</td>
                        <td className="px-3 py-2 text-right">
                          {prev ? <DeltaBadge current={round.overallScore} previous={prev.overallScore} /> : <span className="text-xs text-gray-400">-</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatDate(round.completedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-domain trajectories */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Domain Score Trajectories</h4>
            <div className="space-y-4">
              {DOMAINS.map(domain => {
                const scores = caseData.rounds.map(r => r.domainScores[domain.key] ?? null);
                const hasAnyScore = scores.some(s => s !== null);
                if (!hasAnyScore) return null;

                const meta = DOMAIN_META[domain.key];
                const lastScore = scores.filter(s => s !== null).pop() ?? null;
                const secondLastScore = scores.filter(s => s !== null).slice(-2, -1)[0] ?? null;

                return (
                  <div key={domain.key} className="rounded-lg bg-white p-3 dark:bg-gray-900">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: meta?.color || '#6B7280' }} />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{meta?.name || domain.key}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Score trajectory text */}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {scores.map((s, i) => (
                            <span key={i}>
                              {i > 0 && <span className="mx-1 text-gray-300 dark:text-gray-600">&rarr;</span>}
                              <span className={s === null ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}>
                                {s !== null ? s.toFixed(1) : '-'}
                              </span>
                            </span>
                          ))}
                        </span>
                        {secondLastScore !== null && lastScore !== null && (
                          <DeltaBadge current={lastScore} previous={secondLastScore} />
                        )}
                      </div>
                    </div>

                    {/* CSS bar chart for each round */}
                    <div className="flex items-end gap-1 h-10">
                      {scores.map((score, idx) => {
                        if (score === null) {
                          return (
                            <div
                              key={idx}
                              className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-t"
                              style={{ height: '4px' }}
                              title={`Round ${idx + 1}: No score`}
                            />
                          );
                        }
                        // Max score is 5
                        const pct = Math.max(5, (score / 5) * 100);
                        const prevScore = idx > 0 ? scores[idx - 1] : null;
                        const improving = prevScore !== null && score > prevScore;
                        const declining = prevScore !== null && score < prevScore;
                        return (
                          <div
                            key={idx}
                            className={`flex-1 rounded-t transition-all ${
                              declining
                                ? 'bg-red-400 dark:bg-red-500'
                                : improving
                                  ? 'bg-green-400 dark:bg-green-500'
                                  : ''
                            }`}
                            style={{
                              height: `${pct}%`,
                              backgroundColor:
                                !improving && !declining ? (meta?.color || '#6B7280') : undefined,
                            }}
                            title={`Round ${idx + 1}: ${score.toFixed(2)}`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">R1</span>
                      {scores.length > 1 && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">R{scores.length}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
