import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { researchApi } from '../../services/api';
import { DOMAINS } from '@wiseshift/shared';
import { LoadingSpinner } from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

interface DomainStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  n: number;
}

interface StatsData {
  totalAssessments: number;
  domains: Record<string, DomainStats>;
  correlations: Record<string, Record<string, number>>;
  distributions: Record<string, { binStart: number; binEnd: number; count: number }[]>;
}

interface GroupData {
  group: string;
  mean: number;
  median: number;
  stdDev: number;
  n: number;
}

export default function StatisticalDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('sector');
  const [groupDomain, setGroupDomain] = useState('');
  const [selectedDist, setSelectedDist] = useState(DOMAINS[0]?.key ?? '');

  useEffect(() => {
    researchApi.getStatistics()
      .then(res => setStats(res.data.data))
      .catch(() => toast.error('Failed to load statistics'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    researchApi.getStatisticsGroups(groupBy, groupDomain || undefined)
      .then(res => setGroups(res.data.data ?? []))
      .catch(() => {});
  }, [groupBy, groupDomain]);

  if (loading) return <LoadingSpinner />;
  if (!stats || stats.totalAssessments === 0) {
    return <p className="text-center text-sm text-gray-400 py-8">No completed assessments for statistical analysis.</p>;
  }

  const domain = DOMAINS.find(d => d.key === selectedDist);
  const distribution = stats.distributions[selectedDist] ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Statistical Dashboard</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Descriptive statistics across {stats.totalAssessments} completed assessments.
        </p>
      </div>

      {/* ─── Descriptive Statistics Table ─── */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Descriptive Statistics by Domain</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="px-3 py-2 text-left font-semibold">Domain</th>
                <th className="px-3 py-2 text-center font-semibold">Mean</th>
                <th className="px-3 py-2 text-center font-semibold">Median</th>
                <th className="px-3 py-2 text-center font-semibold">SD</th>
                <th className="px-3 py-2 text-center font-semibold">Min</th>
                <th className="px-3 py-2 text-center font-semibold">Max</th>
                <th className="px-3 py-2 text-center font-semibold">n</th>
              </tr>
            </thead>
            <tbody>
              {DOMAINS.map(d => {
                const s = stats.domains[d.key];
                if (!s) return null;
                return (
                  <tr key={d.key} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 font-medium">
                      <span className="inline-block h-2 w-2 rounded-full mr-2" style={{ backgroundColor: d.color }} />
                      {d.shortName}
                    </td>
                    <td className="px-3 py-2 text-center">{s.mean.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">{s.median.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">{s.stdDev.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">{s.min.toFixed(1)}</td>
                    <td className="px-3 py-2 text-center">{s.max.toFixed(1)}</td>
                    <td className="px-3 py-2 text-center">{s.n}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Correlation Heatmap ─── */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Domain Correlation Matrix</h4>
        <div className="overflow-x-auto">
          <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `auto repeat(${DOMAINS.length}, minmax(50px, 1fr))` }}>
            {/* Header row */}
            <div className="p-1" />
            {DOMAINS.map(d => (
              <div key={d.key} className="p-1 text-center text-[10px] font-semibold text-gray-600 dark:text-gray-400 truncate">
                {d.shortName}
              </div>
            ))}
            {/* Data rows */}
            {DOMAINS.map(d1 => (
              <>
                <div key={`label-${d1.key}`} className="p-1 text-[10px] font-semibold text-gray-600 dark:text-gray-400 truncate text-right pr-2">
                  {d1.shortName}
                </div>
                {DOMAINS.map(d2 => {
                  const val = stats.correlations[d1.key]?.[d2.key] ?? 0;
                  const abs = Math.abs(val);
                  const bg = d1.key === d2.key
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : val > 0.3 ? `bg-emerald-${abs > 0.6 ? 300 : 100}` : val < -0.3 ? `bg-red-${abs > 0.6 ? 300 : 100}` : 'bg-gray-50 dark:bg-gray-800';

                  return (
                    <div
                      key={`${d1.key}-${d2.key}`}
                      className={`p-1 text-center text-[10px] font-mono rounded-sm ${bg}`}
                      title={`${d1.shortName} vs ${d2.shortName}: r=${val}`}
                    >
                      {val.toFixed(2)}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Distribution Histogram ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Score Distribution</h4>
          <select
            value={selectedDist}
            onChange={e => setSelectedDist(e.target.value)}
            className="input text-sm"
          >
            {DOMAINS.map(d => <option key={d.key} value={d.key}>{d.shortName}</option>)}
          </select>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="binStart"
                tick={{ fontSize: 11 }}
                tickFormatter={v => `${v}-${(v + 1).toFixed(0)}`}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                formatter={(val: number) => [val, 'Count']}
                labelFormatter={v => `Score ${v} - ${(parseFloat(v as string) + 1).toFixed(0)}`}
              />
              <Bar dataKey="count">
                {distribution.map((_, i) => (
                  <Cell key={i} fill={domain?.color ?? '#6366F1'} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Group Comparison ─── */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Group Comparison</h4>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="input text-sm">
            <option value="sector">By Sector</option>
            <option value="country">By Country</option>
            <option value="size">By Size</option>
          </select>
          <select value={groupDomain} onChange={e => setGroupDomain(e.target.value)} className="input text-sm">
            <option value="">Overall Score</option>
            {DOMAINS.map(d => <option key={d.key} value={d.key}>{d.shortName}</option>)}
          </select>
        </div>
        {groups.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groups} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="group" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip
                  contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                  formatter={(val: number, name: string) => [val.toFixed(2), name === 'mean' ? 'Mean' : name]}
                />
                <Bar dataKey="mean" fill="#6366F1" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">No group data available.</p>
        )}
      </div>
    </div>
  );
}
