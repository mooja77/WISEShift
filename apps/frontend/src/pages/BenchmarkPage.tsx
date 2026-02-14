import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resultsApi, benchmarkApi } from '../services/api';
import type { AssessmentResults, BenchmarkData } from '@wiseshift/shared';
import { AVAILABLE_SECTORS } from '@wiseshift/shared';
import { BenchmarkRadar } from '../components/benchmark/BenchmarkRadar';
import { SectorComparison } from '../components/benchmark/SectorComparison';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import HelpTooltip from '../components/common/HelpTooltip';

export default function BenchmarkPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentId = searchParams.get('id');
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [selectedSector, setSelectedSector] = useState('All WISEs');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assessmentId) {
      navigate('/');
      return;
    }
    fetchData();
  }, [assessmentId]);

  useEffect(() => {
    fetchBenchmark(selectedSector);
  }, [selectedSector]);

  const fetchData = async () => {
    try {
      const [resultsRes, benchmarkRes] = await Promise.all([
        resultsApi.getResults(assessmentId!),
        benchmarkApi.getBySector(selectedSector),
      ]);
      setResults(resultsRes.data.data);
      setBenchmark(benchmarkRes.data.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBenchmark = async (sector: string) => {
    try {
      const res = await benchmarkApi.getBySector(sector);
      setBenchmark(res.data.data);
    } catch (err) {
      console.error('Failed to load benchmark:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!results || !benchmark) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Unable to load benchmark data.</p>
      </div>
    );
  }

  const domainScores = results.domainScores.map((ds) => ({
    domainKey: ds.domainKey,
    domainName: ds.domainName,
    score: ds.score,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
              Sector Benchmarking <HelpTooltip tooltipKey="help.benchmarkData" />
            </h1>
            <p className="mt-1 text-gray-600">{results.organisationName}</p>
          </div>
          <div>
            <label htmlFor="sector" className="label">
              Compare with:
            </label>
            <select
              id="sector"
              className="input mt-1"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
            >
              {AVAILABLE_SECTORS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Radar Comparison */}
        <div className="card mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Performance vs {selectedSector} Benchmark
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            Your scores (blue) compared against sector averages (gray) from {benchmark.sampleSize} organisations.
          </p>
          <div className="flex justify-center">
            <BenchmarkRadar domainScores={domainScores} benchmarkData={benchmark} />
          </div>
        </div>

        {/* Detailed Comparison Table */}
        <div className="card">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Detailed Domain Comparison
          </h2>
          <SectorComparison domainScores={domainScores} benchmarkData={benchmark} />
        </div>

        {/* Navigation */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link to={`/results?id=${assessmentId}`} className="btn-secondary">
            Back to Results
          </Link>
          <Link to={`/action-plan?id=${assessmentId}`} className="btn-secondary">
            View Action Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
