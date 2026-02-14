import { useState } from 'react';
import { comparisonApi } from '../services/api';
import type { CrossCaseComparison } from '@wiseshift/shared';
import ComparisonRadarChart from '../components/comparison/ComparisonRadarChart';
import ComparisonTable from '../components/comparison/ComparisonTable';
import QualitativeComparison from '../components/comparison/QualitativeComparison';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ComparisonPage() {
  const [ids, setIds] = useState(['', '', '']);
  const [results, setResults] = useState<CrossCaseComparison[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    const validIds = ids.filter((id) => id.trim());
    if (validIds.length < 2) {
      toast.error('Enter at least 2 assessment IDs');
      return;
    }

    setLoading(true);
    try {
      const res = await comparisonApi.compare(validIds);
      setResults(res.data.data);
    } catch (err) {
      toast.error('Failed to load comparison. Check that all assessment IDs are valid and completed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Cross-Case Comparison</h1>
        <p className="mt-1 text-gray-600">
          Compare 2-3 completed assessments side-by-side to identify patterns and differences.
        </p>

        {/* Input step */}
        <div className="mt-8 card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Enter Assessment IDs
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Enter the assessment IDs you want to compare. You can find these in the assessment results URL.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {ids.map((id, idx) => (
              <div key={idx}>
                <label
                  htmlFor={`id-${idx}`}
                  className="label"
                >
                  Assessment {idx + 1}{idx < 2 ? ' *' : ' (optional)'}
                </label>
                <input
                  id={`id-${idx}`}
                  type="text"
                  className="input mt-1"
                  placeholder="Assessment ID"
                  value={id}
                  onChange={(e) => {
                    const newIds = [...ids];
                    newIds[idx] = e.target.value;
                    setIds(newIds);
                  }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleCompare}
            disabled={loading || ids.filter((id) => id.trim()).length < 2}
            className="btn-primary mt-4"
          >
            {loading ? 'Comparing...' : 'Compare'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-8 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Results */}
        {results && results.length > 0 && (
          <>
            {/* Overlaid Radar */}
            <div className="mt-8 card">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Performance Comparison
              </h2>
              <div className="flex justify-center">
                <ComparisonRadarChart
                  datasets={results.map((a, idx) => ({
                    label: a.label,
                    scores: a.domainScores.map((ds) => ({
                      domainKey: ds.domainKey,
                      domainName: ds.domainName,
                      score: ds.score,
                    })),
                    color: ['#3B82F6', '#EF4444', '#10B981'][idx] || '#6366F1',
                  }))}
                />
              </div>
            </div>

            {/* Score Comparison Table */}
            <div className="mt-8 card">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Score Comparison
              </h2>
              <ComparisonTable assessments={results} />
            </div>

            {/* Qualitative Comparison */}
            <div className="mt-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Qualitative Comparison
              </h2>
              <QualitativeComparison assessments={results} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
