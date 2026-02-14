import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { DOMAINS } from '@wiseshift/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AggregateRadarProps {
  /** Record mapping domain keys to average scores across the sector. */
  domainAverages: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ChartDataPoint {
  domainName: string;
  average: number;
}

function buildChartData(
  domainAverages: Record<string, number>,
): ChartDataPoint[] {
  return DOMAINS.map((domain) => ({
    domainName: domain.shortName,
    average: parseFloat((domainAverages[domain.key] ?? 0).toFixed(2)),
  }));
}

/**
 * Custom tooltip for the radar chart.
 */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-sm font-semibold text-gray-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          Average:{' '}
          <span className="font-medium">{entry.value.toFixed(1)}</span>
          <span className="text-gray-400"> / 5</span>
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AggregateRadar({ domainAverages }: AggregateRadarProps) {
  const data = buildChartData(domainAverages);

  return (
    <div className="mx-auto" style={{ width: '100%', height: 380 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          {/* Grid lines */}
          <PolarGrid stroke="#E5E7EB" strokeDasharray="3 3" />

          {/* Domain name labels on each axis */}
          <PolarAngleAxis
            dataKey="domainName"
            tick={{
              fill: '#374151',
              fontSize: 11,
              fontWeight: 500,
            }}
            tickLine={false}
          />

          {/* Radial scale 0-5 */}
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tickCount={6}
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            axisLine={false}
          />

          {/* Sector averages - teal/brand coloring */}
          <Radar
            name="average"
            dataKey="average"
            stroke="#0D9488"
            fill="#14B8A6"
            fillOpacity={0.2}
            strokeWidth={2}
            dot={{
              r: 4,
              fill: '#0D9488',
              stroke: '#fff',
              strokeWidth: 1.5,
            }}
          />

          {/* Tooltip */}
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AggregateRadar;
