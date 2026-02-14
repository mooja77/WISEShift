import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resultsApi, actionPlanApi } from '../services/api';
import type { AssessmentResults, ActionPlanItem } from '@wiseshift/shared';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assessmentId) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [resultsRes, apRes] = await Promise.all([
          resultsApi.getResults(assessmentId),
          actionPlanApi.get(assessmentId).catch(() => ({ data: { data: { items: [] } } })),
        ]);
        setResults(resultsRes.data.data);
        setActionPlanItems(apRes.data.data?.items || apRes.data.data || []);
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
    <div className="min-h-screen bg-white">
      {/* Print button (self-hiding) */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-3 print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Print Preview</h1>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="btn-primary"
            >
              Print Report / Save as PDF
            </button>
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Report content */}
      <div className="mx-auto max-w-4xl px-6 py-8 print:px-0 print:py-0">
        {/* Title Page */}
        <div className="mb-8 text-center print:mb-12 print:pt-24">
          <h1 className="text-3xl font-extrabold text-gray-900">
            WISEShift Self-Assessment Report
          </h1>
          <p className="mt-4 text-xl text-gray-600">{results.organisationName}</p>
          <p className="mt-2 text-sm text-gray-400">
            Completed: {new Date(results.completedAt).toLocaleDateString()}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-50 px-6 py-2">
            <span className="text-3xl font-bold text-brand-600">
              {formatScore(results.overallScore)}
            </span>
            <span className="text-sm text-brand-600">/5 — {results.overallMaturityLevel}</span>
          </div>
        </div>

        {/* Domain Scores Table */}
        <div className="break-before-page print:pt-8">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Domain Scores</h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Domain</th>
                <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Score</th>
                <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Maturity Level</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Radar Chart (SVG prints natively) */}
        <div className="mt-8 flex justify-center print:mt-12">
          <RadarChart domainScores={radarData} size={400} />
        </div>

        {/* Qualitative Responses */}
        {results.qualitativeSummary.length > 0 && (
          <div className="break-before-page print:pt-8">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Qualitative Responses</h2>
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

        {/* Action Plan */}
        {actionPlanItems.length > 0 && (
          <div className="break-before-page print:pt-8">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Action Plan</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Domain</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Recommendation</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold">Priority</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold">Effort</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold">Impact</th>
                </tr>
              </thead>
              <tbody>
                {actionPlanItems.map((item) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 px-3 py-2 text-xs">{item.domainName}</td>
                    <td className="border border-gray-300 px-3 py-2 text-xs">{item.recommendation}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-xs capitalize">{item.priority}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-xs capitalize">{item.effort}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-xs capitalize">{item.impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 border-t border-gray-200 pt-4 text-center print:mt-8">
          <p className="text-xs text-gray-400">
            Generated by WISEShift Self-Assessment Tool. Grounded in EMES, ENSIE, and Horizon Europe WISESHIFT research.
          </p>
        </div>
      </div>
    </div>
  );
}
