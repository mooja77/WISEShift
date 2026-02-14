import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DOMAINS } from '@wiseshift/shared';

const DOMAIN_COLORS: Record<string, string> = {
  governance: '#6366f1',
  social_impact: '#f59e0b',
  economic_sustainability: '#10b981',
  workforce_development: '#ef4444',
  stakeholder_engagement: '#8b5cf6',
  innovation: '#06b6d4',
  environmental: '#22c55e',
  quality_management: '#ec4899',
};

interface TrendPeriod {
  period: string;
  count: number;
  means: Record<string, number>;
}

interface TrendLineChartProps {
  periods: TrendPeriod[];
  visibleDomains: Set<string>;
}

export default function TrendLineChart({ periods, visibleDomains }: TrendLineChartProps) {
  if (periods.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 dark:text-gray-400">
        No trend data available yet.
      </div>
    );
  }

  const chartData = periods.map(p => ({
    period: p.period,
    count: p.count,
    ...p.means,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid #e5e7eb', borderRadius: '8px' }}
          formatter={(value: number) => value.toFixed(2)}
        />
        <Legend />
        {DOMAINS.filter(d => visibleDomains.has(d.key)).map(d => (
          <Line
            key={d.key}
            type="monotone"
            dataKey={d.key}
            name={d.name}
            stroke={DOMAIN_COLORS[d.key] || '#888'}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
