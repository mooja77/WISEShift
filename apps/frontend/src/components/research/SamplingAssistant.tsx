import { useState } from 'react';
import { researchApi } from '../../services/api';
import toast from 'react-hot-toast';

type SamplingMethod = 'maximum_variation' | 'extreme_deviant' | 'typical' | 'purposive';

interface SampledCase {
  assessmentId: string;
  label: string;
  overallScore: number;
  domainScores: Record<string, number>;
  context: string;
  justification: string;
}

interface SamplingResult {
  cases: SampledCase[];
  methodologyText: string;
  totalPool: number;
}

const METHODS: { value: SamplingMethod; label: string; description: string }[] = [
  {
    value: 'maximum_variation',
    label: 'Maximum Variation',
    description: 'Selects cases that maximise diversity across all domain scores using Euclidean distance. Best for capturing the full range of organisational profiles.',
  },
  {
    value: 'extreme_deviant',
    label: 'Extreme/Deviant Case',
    description: 'Selects the highest and lowest scoring cases. Best for understanding what differentiates top performers from those in early stages.',
  },
  {
    value: 'typical',
    label: 'Typical Case',
    description: 'Selects cases closest to the mean score profile. Best for understanding the "average" WISE experience.',
  },
  {
    value: 'purposive',
    label: 'Purposive',
    description: 'Filters by country, sector, or size, then randomly samples from qualifying cases. Best when targeting specific populations.',
  },
];

export default function SamplingAssistant() {
  const [method, setMethod] = useState<SamplingMethod>('maximum_variation');
  const [count, setCount] = useState(5);
  const [criteria, setCriteria] = useState({ country: '', sector: '', size: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SamplingResult | null>(null);

  const handleRun = async () => {
    setLoading(true);
    try {
      const body: any = { method, count };
      if (method === 'purposive') {
        const filtered: Record<string, string> = {};
        if (criteria.country) filtered.country = criteria.country;
        if (criteria.sector) filtered.sector = criteria.sector;
        if (criteria.size) filtered.size = criteria.size;
        body.criteria = filtered;
      }
      const res = await researchApi.runSampling(body);
      setResult(res.data.data);
    } catch {
      toast.error('Failed to run sampling');
    } finally {
      setLoading(false);
    }
  };

  const copyMethodology = () => {
    if (result?.methodologyText) {
      navigator.clipboard.writeText(result.methodologyText);
      toast.success('Methodology text copied');
    }
  };

  const exportCsv = () => {
    if (!result) return;
    const headers = ['Label', 'Overall Score', 'Context', 'Justification'];
    const rows = result.cases.map(c => [
      c.label,
      c.overallScore.toFixed(2),
      `"${c.context}"`,
      `"${c.justification}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sampling-${method}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Method Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sampling Method</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {METHODS.map(m => (
            <label
              key={m.value}
              className={`flex cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                method === m.value
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
            >
              <input
                type="radio"
                name="samplingMethod"
                value={m.value}
                checked={method === m.value}
                onChange={() => setMethod(m.value)}
                className="sr-only"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">{m.label}</span>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{m.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Parameters</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Number of Cases</label>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={e => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="input mt-1 w-32"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">1-20 cases</p>
          </div>

          {method === 'purposive' && (
            <>
              <div>
                <label className="label">Country (optional)</label>
                <input
                  type="text"
                  value={criteria.country}
                  onChange={e => setCriteria(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="e.g. FR, DE, IT"
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="label">Sector (optional)</label>
                <input
                  type="text"
                  value={criteria.sector}
                  onChange={e => setCriteria(prev => ({ ...prev, sector: e.target.value }))}
                  placeholder="e.g. recycling, care"
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="label">Size (optional)</label>
                <input
                  type="text"
                  value={criteria.size}
                  onChange={e => setCriteria(prev => ({ ...prev, size: e.target.value }))}
                  placeholder="e.g. small, medium"
                  className="input mt-1"
                />
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleRun}
          disabled={loading}
          className="btn-primary mt-4"
        >
          {loading ? 'Sampling...' : 'Run Sampling'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="card">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Results — {result.cases.length} of {result.totalPool} cases selected
              </h3>
              <div className="flex gap-2">
                <button onClick={exportCsv} className="btn-secondary text-sm">
                  Export CSV
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Case</th>
                    <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Score</th>
                    <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Context</th>
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Justification</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cases.map((c, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">{c.label}</td>
                      <td className="py-2 pr-4 font-mono text-gray-700 dark:text-gray-300">{c.overallScore.toFixed(2)}</td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{c.context}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{c.justification}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Methodology Text */}
          <div className="card">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Methodology Text</h3>
              <button onClick={copyMethodology} className="btn-secondary text-sm">
                Copy Text
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300 italic">
              {result.methodologyText}
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Ready to paste into your methods section. Includes academic citations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
