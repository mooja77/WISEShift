import { useState } from 'react';
import { researchApi } from '../../services/api';
import toast from 'react-hot-toast';

interface TagAgreement {
  tagName: string;
  observed: number;
  expected: number;
  kappa: number;
  interpretation: string;
  rater1Count: number;
  rater2Count: number;
  bothCount: number;
  totalResponses: number;
}

interface IRRResult {
  overallKappa: number;
  overallInterpretation: string;
  percentageAgreement: number;
  totalSharedResponses: number;
  perTag: TagAgreement[];
}

const KAPPA_COLORS: Record<string, string> = {
  'Poor': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Slight': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Fair': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Moderate': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Substantial': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Almost Perfect': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
};

export default function IRRPanel() {
  const [otherCode, setOtherCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IRRResult | null>(null);

  const handleCalculate = async () => {
    if (!otherCode.trim()) {
      toast.error('Enter the other researcher\'s dashboard code');
      return;
    }
    setLoading(true);
    try {
      const res = await researchApi.calculateIRR(otherCode.trim());
      setResult(res.data.data);
    } catch {
      toast.error('Failed to calculate IRR — check the dashboard code');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!result) return;
    const headers = ['Tag', 'Kappa', 'Interpretation', 'Observed Agreement', 'Expected Agreement', 'Rater 1 Count', 'Rater 2 Count', 'Both Count', 'Total Responses'];
    const rows = result.perTag.map(t => [
      `"${t.tagName}"`,
      t.kappa.toFixed(2),
      t.interpretation,
      t.observed.toFixed(2),
      t.expected.toFixed(2),
      t.rater1Count,
      t.rater2Count,
      t.bothCount,
      t.totalResponses,
    ]);
    const summary = [
      '',
      `"Overall Kappa",${result.overallKappa.toFixed(2)}`,
      `"Overall Interpretation","${result.overallInterpretation}"`,
      `"Percentage Agreement",${result.percentageAgreement}%`,
      `"Total Shared Responses",${result.totalSharedResponses}`,
    ];
    const csv = [headers.join(','), ...rows.map(r => r.join(',')), '', ...summary].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `irr-cohens-kappa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Inter-Rater Reliability</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Calculate Cohen's kappa between your coding and another researcher's coding of the same narrative responses.
          Both researchers must have highlighted and tagged the same responses using matching tag names.
        </p>

        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="label">Other Researcher's Dashboard Code</label>
            <input
              type="text"
              value={otherCode}
              onChange={e => setOtherCode(e.target.value.toUpperCase())}
              placeholder="DASH-XXXXXXXX"
              className="input mt-1 font-mono tracking-wider"
            />
          </div>
          <button
            onClick={handleCalculate}
            disabled={loading || !otherCode.trim()}
            className="btn-primary"
          >
            {loading ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Overall Summary */}
          <div className="card">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Overall Agreement</h3>
              <button onClick={exportCsv} className="btn-secondary text-sm">
                Export CSV
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Cohen's Kappa</p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {result.overallKappa.toFixed(2)}
                </p>
                <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${KAPPA_COLORS[result.overallInterpretation] || 'bg-gray-100 text-gray-800'}`}>
                  {result.overallInterpretation}
                </span>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Percentage Agreement</p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {result.percentageAgreement}%
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Shared Responses</p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {result.totalSharedResponses}
                </p>
              </div>
            </div>

            {result.totalSharedResponses === 0 && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                No shared responses found. Both researchers need to have highlighted the same narrative responses for IRR to be calculated.
              </div>
            )}
          </div>

          {/* Per-Tag Table */}
          {result.perTag.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Per-Tag Agreement</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Tag</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Kappa</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Interpretation</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Observed</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Expected</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">You</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Other</th>
                      <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Both</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.perTag.map((t, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">{t.tagName}</td>
                        <td className="py-2 pr-4 font-mono text-gray-700 dark:text-gray-300">{t.kappa.toFixed(2)}</td>
                        <td className="py-2 pr-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${KAPPA_COLORS[t.interpretation] || 'bg-gray-100 text-gray-800'}`}>
                            {t.interpretation}
                          </span>
                        </td>
                        <td className="py-2 pr-4 font-mono text-gray-600 dark:text-gray-400">{t.observed.toFixed(2)}</td>
                        <td className="py-2 pr-4 font-mono text-gray-600 dark:text-gray-400">{t.expected.toFixed(2)}</td>
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{t.rater1Count}</td>
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{t.rater2Count}</td>
                        <td className="py-2 text-gray-600 dark:text-gray-400">{t.bothCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Interpretation Guide */}
              <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Kappa Interpretation Scale (Landis & Koch, 1977)</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(KAPPA_COLORS).map(([label, classes]) => (
                    <span key={label} className={`rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
