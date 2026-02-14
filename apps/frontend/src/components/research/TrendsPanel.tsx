import { useState, useEffect } from 'react';
import { DOMAINS } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import TrendLineChart from './TrendLineChart';
import { LoadingSpinner } from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

interface TrendPeriod {
  period: string;
  count: number;
  means: Record<string, number>;
}

interface ChangeDetection {
  period: string;
  domainKey: string;
  delta: number;
  direction: string;
}

export default function TrendsPanel() {
  const [granularity, setGranularity] = useState<'month' | 'quarter' | 'year'>('quarter');
  const [periods, setPeriods] = useState<TrendPeriod[]>([]);
  const [changes, setChanges] = useState<ChangeDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleDomains, setVisibleDomains] = useState<Set<string>>(new Set(DOMAINS.map(d => d.key)));

  useEffect(() => {
    loadTrends();
  }, [granularity]);

  const loadTrends = async () => {
    setLoading(true);
    try {
      const res = await researchApi.getTrends(granularity);
      setPeriods(res.data.data.periods);
      setChanges(res.data.data.changes);
    } catch {
      toast.error('Failed to load trend data');
    } finally {
      setLoading(false);
    }
  };

  const toggleDomain = (key: string) => {
    setVisibleDomains(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Temporal Analysis</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track domain score trends over time across all completed assessments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Granularity:</label>
            {(['month', 'quarter', 'year'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  granularity === g
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Domain Toggles */}
      <div className="card">
        <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Visible Domains:</p>
        <div className="flex flex-wrap gap-2">
          {DOMAINS.map(d => (
            <button
              key={d.key}
              onClick={() => toggleDomain(d.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                visibleDomains.has(d.key)
                  ? 'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200'
                  : 'bg-gray-100 text-gray-400 line-through dark:bg-gray-800 dark:text-gray-600'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <TrendLineChart periods={periods} visibleDomains={visibleDomains} />
        {periods.length > 0 && (
          <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
            Based on {periods.reduce((s, p) => s + p.count, 0)} completed assessments across {periods.length} periods
          </p>
        )}
      </div>

      {/* Change Detection */}
      {changes.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Significant Changes Detected</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Domains where mean scores shifted by more than 0.5 points between consecutive periods.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {changes.map((c, i) => {
              const domain = DOMAINS.find(d => d.key === c.domainKey);
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-3 ${
                    c.direction === 'increase'
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {domain?.name || c.domainKey}
                  </p>
                  <p className={`text-lg font-bold ${c.direction === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {c.delta > 0 ? '+' : ''}{c.delta.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Period: {c.period}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
