import { useEffect, useState } from 'react';
import { researchApi } from '../../services/api';
import { DOMAINS } from '@wiseshift/shared';
import { RadarChart } from '../results/RadarChart';
import { LoadingSpinner } from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

interface AssessmentSummary {
  assessmentId: string;
  label: string;
  overallScore: number;
  country: string;
  sector: string;
  size: string;
  domainScores: Record<string, { score: number; maturityLevel: string }>;
}

interface ComparisonCase {
  label: string;
  assessmentId: string;
  context: string;
  overallScore: number;
  domainScores: { domainKey: string; domainName: string; score: number; maturityLevel: string }[];
  qualitativeResponses: { domainKey: string; domainName: string; narratives: { questionText: string; text: string }[] }[];
}

export default function ResearchComparison() {
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonCase[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [filterCountry, setFilterCountry] = useState('');
  const [filterSector, setFilterSector] = useState('');

  useEffect(() => {
    researchApi.getAssessments()
      .then(res => setAssessments(res.data.data ?? []))
      .catch(() => toast.error('Failed to load assessments'))
      .finally(() => setLoading(false));
  }, []);

  const toggleSelect = (id: string) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 5
          ? [...prev, id]
          : prev
    );
  };

  const handleCompare = async () => {
    if (selected.length < 2) {
      toast.error('Select at least 2 assessments');
      return;
    }
    setComparing(true);
    try {
      const res = await researchApi.compareAssessments(selected);
      setComparison(res.data.data);
    } catch {
      toast.error('Failed to compare assessments');
    } finally {
      setComparing(false);
    }
  };

  const filtered = assessments.filter(a => {
    if (filterCountry && a.country !== filterCountry) return false;
    if (filterSector && a.sector !== filterSector) return false;
    return true;
  });

  const countries = [...new Set(assessments.map(a => a.country))].sort();
  const sectors = [...new Set(assessments.map(a => a.sector))].sort();

  if (loading) return <LoadingSpinner />;

  // If comparison results exist, show them
  if (comparison) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cross-Case Comparison ({comparison.length} cases)
          </h3>
          <button onClick={() => setComparison(null)} className="btn-secondary text-sm">
            Back to Selection
          </button>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200 text-sm dark:border-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold dark:border-gray-700">Domain</th>
                {comparison.map(c => (
                  <th key={c.assessmentId} className="border border-gray-200 px-3 py-2 text-center font-semibold dark:border-gray-700">
                    {c.label}
                    <div className="text-[10px] font-normal text-gray-400">{c.context}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DOMAINS.map(d => (
                <tr key={d.key}>
                  <td className="border border-gray-200 px-3 py-2 font-medium dark:border-gray-700">{d.shortName}</td>
                  {comparison.map(c => {
                    const ds = c.domainScores.find(s => s.domainKey === d.key);
                    return (
                      <td key={c.assessmentId} className="border border-gray-200 px-3 py-2 text-center dark:border-gray-700">
                        <span className="font-semibold">{ds?.score.toFixed(1) ?? '—'}</span>
                        <span className="ml-1 text-xs text-gray-400">({ds?.maturityLevel ?? '—'})</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold dark:bg-gray-800">
                <td className="border border-gray-200 px-3 py-2 dark:border-gray-700">Overall</td>
                {comparison.map(c => (
                  <td key={c.assessmentId} className="border border-gray-200 px-3 py-2 text-center dark:border-gray-700">
                    {c.overallScore.toFixed(1)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Qualitative comparison by domain */}
        {DOMAINS.map(d => {
          const casesWithNarratives = comparison.filter(c =>
            c.qualitativeResponses.some(qr => qr.domainKey === d.key && qr.narratives.length > 0)
          );
          if (casesWithNarratives.length === 0) return null;

          return (
            <details key={d.key} className="rounded-lg border border-gray-200 dark:border-gray-700">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
                {d.name} — Qualitative Responses
              </summary>
              <div className="border-t border-gray-200 p-4 space-y-4 dark:border-gray-700">
                {casesWithNarratives.map(c => {
                  const qr = c.qualitativeResponses.find(q => q.domainKey === d.key);
                  if (!qr) return null;
                  return (
                    <div key={c.assessmentId}>
                      <p className="text-xs font-bold text-brand-600 dark:text-brand-400">{c.label} ({c.context})</p>
                      {qr.narratives.map((n, idx) => (
                        <div key={idx} className="mt-1 rounded bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          <p className="font-medium text-gray-500 dark:text-gray-400">{n.questionText}</p>
                          <p className="mt-1 leading-relaxed">{n.text.slice(0, 300)}{n.text.length > 300 ? '...' : ''}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    );
  }

  // Assessment selection view
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Cross-Case Comparison
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Select 2-5 assessments to compare their scores and qualitative responses side by side.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="input text-sm">
          <option value="">All Countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterSector} onChange={e => setFilterSector(e.target.value)} className="input text-sm">
          <option value="">All Sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={handleCompare}
          disabled={selected.length < 2 || comparing}
          className="btn-primary text-sm"
        >
          {comparing ? 'Comparing...' : `Compare Selected (${selected.length})`}
        </button>
      </div>

      {/* Assessment table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-3 py-2 text-left"></th>
              <th className="px-3 py-2 text-left font-semibold">Label</th>
              <th className="px-3 py-2 text-center font-semibold">Score</th>
              <th className="px-3 py-2 text-left font-semibold">Country</th>
              <th className="px-3 py-2 text-left font-semibold">Sector</th>
              <th className="px-3 py-2 text-left font-semibold">Size</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr
                key={a.assessmentId}
                className={`border-b border-gray-100 cursor-pointer transition-colors dark:border-gray-800 ${
                  selected.includes(a.assessmentId) ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => toggleSelect(a.assessmentId)}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(a.assessmentId)}
                    onChange={() => toggleSelect(a.assessmentId)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600"
                  />
                </td>
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{a.label}</td>
                <td className="px-3 py-2 text-center font-semibold">{a.overallScore.toFixed(1)}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{a.country}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{a.sector}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{a.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">No completed assessments found.</p>
      )}
    </div>
  );
}
