import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DomainScore {
  domainKey: string;
  domainName: string;
  score: number;
}

export interface BenchmarkRadarData {
  sector: string;
  domainAverages: Record<string, number>;
}

export interface BenchmarkRadarProps {
  /** Organisation domain scores. */
  domainScores: DomainScore[];
  /** Sector benchmark data to overlay on the chart. */
  benchmarkData: BenchmarkRadarData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ChartDataPoint {
  domainName: string;
  organisation: number;
  benchmark: number;
}

function buildChartData(
  domainScores: DomainScore[],
  benchmarkAverages: Record<string, number>,
): ChartDataPoint[] {
  return domainScores.map((d) => ({
    domainName: d.domainName,
    organisation: parseFloat(d.score.toFixed(2)),
    benchmark: parseFloat(
      (benchmarkAverages[d.domainKey] ?? 0).toFixed(2),
    ),
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
          {entry.name === 'organisation' ? 'Your Score' : 'Sector Average'}:{' '}
          <span className="font-medium">{entry.value.toFixed(1)}</span>
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BenchmarkRadar({
  domainScores,
  benchmarkData,
}: BenchmarkRadarProps) {
  const data = buildChartData(domainScores, benchmarkData.domainAverages);

  return (
    <div className="w-full">
      <div className="mx-auto" style={{ width: '100%', height: 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
            {/* Grid lines */}
            <PolarGrid stroke="#E5E7EB" strokeDasharray="3 3" />

            {/* Domain labels on each axis */}
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

            {/* Organisation scores - brand-600 fill */}
            <Radar
              name="organisation"
              dataKey="organisation"
              stroke="#4F46E5"
              fill="#4F46E5"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: '#4F46E5',
                stroke: '#fff',
                strokeWidth: 1.5,
              }}
            />

            {/* Benchmark overlay - gray-400 dashed */}
            <Radar
              name="benchmark"
              dataKey="benchmark"
              stroke="#9CA3AF"
              fill="#9CA3AF"
              fillOpacity={0.05}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={{
                r: 3,
                fill: '#9CA3AF',
                stroke: '#fff',
                strokeWidth: 1,
              }}
            />

            {/* Tooltip */}
            <Tooltip content={<CustomTooltip />} />

            {/* Legend */}
            <Legend
              wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
              formatter={(value: string) =>
                value === 'organisation'
                  ? 'Your Organisation'
                  : `${benchmarkData.sector} Average`
              }
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default BenchmarkRadar;
