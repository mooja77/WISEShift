import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resultsApi, actionPlanApi, benchmarkApi } from '../services/api';
import type { AssessmentResults, ActionPlanItem, BenchmarkData } from '@wiseshift/shared';
import { RadarChart } from '../components/results/RadarChart';
import { DOMAINS } from '@wiseshift/shared';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { renderMarkdown } from '../utils/renderMarkdown';
import { formatScore } from '../utils/locale';

export default function PrintReportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentId = searchParams.get('id');
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [actionPlanItems, setActionPlanItems] = useState<ActionPlanItem[]>([]);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assessmentId) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [resultsRes, apRes, bmRes] = await Promise.all([
          resultsApi.getResults(assessmentId),
          actionPlanApi.get(assessmentId).catch(() => ({ data: { data: { items: [] } } })),
          benchmarkApi.getAll().catch(() => ({ data: { data: [] } })),
        ]);
        setResults(resultsRes.data.data);
        setActionPlanItems(apRes.data.data?.items || apRes.data.data || []);
        // Use first benchmark set as comparison
        const benchmarks = bmRes.data.data;
        if (Array.isArray(benchmarks) && benchmarks.length > 0) {
          setBenchmark(benchmarks[0]);
        }
      } catch (err) {
        console.error('Failed to load report data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [assessmentId, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Unable to load report data.</p>
      </div>
    );
  }

  const radarData = results.domainScores.map((ds) => ({
    domainKey: ds.domainKey,
    domainName: ds.domainName,
    score: ds.score,
  }));

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Print button bar (self-hiding) */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-3 print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Print Preview</h1>
          <div className="flex gap-3">
            <button onClick={() => window.print()} className="btn-primary">
              Print Report / Save as PDF
            </button>
            <button onClick={() => navigate(-1)} className="btn-secondary">
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Report content */}
      <div className="mx-auto max-w-4xl px-6 py-8 print:px-0 print:py-0">
        {/* ─── Title Page ─── */}
        <div className="mb-8 text-center print:mb-12 print:pt-24">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 print:bg-brand-50">
            <span className="text-2xl font-extrabold text-brand-600">W</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            WISEShift Self-Assessment Report
          </h1>
          <p className="mt-4 text-xl text-gray-600">{results.organisationName}</p>
          <p className="mt-2 text-sm text-gray-400">
            Completed: {new Date(results.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-50 px-6 py-2">
            <span className="text-3xl font-bold text-brand-600">
              {formatScore(results.overallScore)}
            </span>
            <span className="text-sm text-brand-600">/5 — {results.overallMaturityLevel}</span>
          </div>
        </div>

        {/* ─── Executive Summary ─── */}
        <div className="break-before-page print:pt-8">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Executive Summary</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Strengths */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 print:border-emerald-300">
              <h3 className="text-sm font-bold text-emerald-800">Top Strengths</h3>
              <ul className="mt-2 space-y-1">
                {results.strengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-emerald-700">
                    <span className="mt-0.5 text-emerald-500">+</span>
                    {s}
                  </li>
                ))}
                {results.strengths.length === 0 && (
                  <li className="text-sm text-emerald-600 italic">No strengths identified yet</li>
                )}
              </ul>
            </div>
            {/* Weaknesses */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 print:border-amber-300">
              <h3 className="text-sm font-bold text-amber-800">Areas for Development</h3>
              <ul className="mt-2 space-y-1">
                {results.weaknesses.slice(0, 3).map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                    <span className="mt-0.5 text-amber-500">!</span>
                    {w}
                  </li>
                ))}
                {results.weaknesses.length === 0 && (
                  <li className="text-sm text-amber-600 italic">No areas identified yet</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* ─── Domain Scores Table ─── */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Domain Scores</h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Domain</th>
                <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Score</th>
                <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Maturity Level</th>
                {benchmark && (
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Benchmark Avg</th>
                )}
              </tr>
            </thead>
            <tbody>
              {results.domainScores.map((ds) => (
                <tr key={ds.domainKey}>
                  <td className="border border-gray-300 px-4 py-2 text-sm">{ds.domainName}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">
                    {formatScore(ds.score)}/5
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center text-sm">{ds.maturityLevel}</td>
                  {benchmark && (
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-500">
                      {benchmark.domainAverages[ds.domainKey]
                        ? formatScore(benchmark.domainAverages[ds.domainKey])
                        : '—'}
                    </td>
                  )}
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="border border-gray-300 px-4 py-2 text-sm">Overall</td>
                <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                  {formatScore(results.overallScore)}/5
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center text-sm">{results.overallMaturityLevel}</td>
                {benchmark && (
                  <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-500">
                    {formatScore(benchmark.overallAverage)}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ─── Radar Chart (SVG prints natively) ─── */}
        <div className="mt-8 flex justify-center print:mt-12">
          <RadarChart domainScores={radarData} size={400} />
        </div>

        {/* ─── Qualitative Highlights ─── */}
        {results.qualitativeSummary.length > 0 && (
          <div className="break-before-page print:pt-8">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Qualitative Evidence</h2>
            {results.qualitativeSummary.map((group) => (
              <div key={group.domainKey} className="mb-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-800">{group.domainName}</h3>
                {group.narratives.map((narrative, idx) => (
                  <div key={idx} className="mb-3 rounded border border-gray-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      {narrative.questionText}
                    </p>
                    <div
                      className="mt-1 text-sm leading-relaxed text-gray-700"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(narrative.text) }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ─── Action Plan Summary ─── */}
        {actionPlanItems.length > 0 && (
          <div className="break-before-page print:pt-8">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Action Plan Summary</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Domain</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Recommendation</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold">Priority</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold">Effort</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold">Timeframe</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {actionPlanItems.map((item) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 px-3 py-2 text-xs">{item.domainName}</td>
                    <td className="border border-gray-300 px-3 py-2 text-xs">{item.recommendation}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-xs capitalize">{item.priority}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-xs capitalize">{item.effort}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-xs capitalize">{item.timeframe}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-xs capitalize">
                      {item.status?.replace('_', ' ') ?? 'Not Started'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Benchmark Comparison ─── */}
        {benchmark && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Benchmark Comparison</h2>
            <p className="mb-3 text-sm text-gray-500">
              Compared against {benchmark.sector} sector average (n={benchmark.sampleSize}).
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {results.domainScores.map((ds) => {
                const avg = benchmark.domainAverages[ds.domainKey] ?? 0;
                const diff = ds.score - avg;
                return (
                  <div key={ds.domainKey} className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs font-medium text-gray-600 truncate">{ds.domainName}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{formatScore(ds.score)}</p>
                    <p className={`text-xs font-semibold ${diff >= 0.1 ? 'text-emerald-600' : diff <= -0.1 ? 'text-red-600' : 'text-gray-500'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} vs avg
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Footer ─── */}
        <div className="mt-12 border-t border-gray-200 pt-4 text-center print:mt-8">
          <p className="text-xs text-gray-400">
            Generated by WISEShift Self-Assessment Tool. Grounded in EMES, ENSIE, and Horizon Europe WISESHIFT research.
          </p>
          <p className="mt-1 text-xs text-gray-300">
            Report generated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
