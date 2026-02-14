import {
  ResponsiveContainer,
  RadarChart as RechartsRadarChart,
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

export interface RadarDomainScore {
  domainKey: string;
  domainName: string;
  score: number;
}

export interface RadarChartProps {
  /** Array of domain scores to plot on the radar chart. */
  domainScores: RadarDomainScore[];
  /** Optional benchmark scores to overlay as a second dataset. */
  benchmarkScores?: RadarDomainScore[];
  /** Width and height of the chart container in pixels. @default 480 */
  size?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RadarDataPoint {
  domainName: string;
  shortName: string;
  score: number;
  benchmark?: number;
}

/** Shorten long domain names for radar chart labels */
const SHORT_NAMES: Record<string, string> = {
  'Governance & Democracy': 'Governance',
  'Social Mission & Impact': 'Social Mission',
  'Employment Pathways': 'Employment',
  'Organisational Culture': 'Culture',
  'Economic Sustainability': 'Economic',
  'Stakeholder Engagement': 'Stakeholders',
  'Support Infrastructure': 'Support',
  'Impact Measurement & Learning': 'Impact & Learning',
};

function buildChartData(
  domainScores: RadarDomainScore[],
  benchmarkScores?: RadarDomainScore[],
): RadarDataPoint[] {
  const benchmarkMap = new Map(
    benchmarkScores?.map((b) => [b.domainKey, b.score]) ?? [],
  );

  return domainScores.map((d) => ({
    domainName: d.domainName,
    shortName: SHORT_NAMES[d.domainName] ?? d.domainName,
    score: parseFloat(d.score.toFixed(2)),
    ...(benchmarkScores
      ? { benchmark: parseFloat((benchmarkMap.get(d.domainKey) ?? 0).toFixed(2)) }
      : {}),
  }));
}

/**
 * Custom tooltip renderer for the radar chart.
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
          {entry.name === 'score' ? 'Organisation' : 'Benchmark'}:{' '}
          <span className="font-medium">{entry.value.toFixed(1)}</span>
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RadarChart({
  domainScores,
  benchmarkScores,
  size = 480,
}: RadarChartProps) {
  const data = buildChartData(domainScores, benchmarkScores);

  return (
    <div
      style={{ width: size, height: size }}
      className="mx-auto"
      aria-label={`Radar chart showing organisation scores across ${domainScores.length} domains: ${domainScores.map((d) => `${d.domainName} (${d.score.toFixed(1)})`).join(', ')}`}
      role="img"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          {/* Grid lines */}
          <PolarGrid
            stroke="#E5E7EB"
            strokeDasharray="3 3"
          />

          {/* Domain name labels on each axis */}
          <PolarAngleAxis
            dataKey="shortName"
            tick={{
              fill: '#374151',
              fontSize: 12,
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

          {/* Organisation scores */}
          <Radar
            name="score"
            dataKey="score"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.2}
            strokeWidth={2}
            dot={{
              r: 4,
              fill: '#3B82F6',
              stroke: '#fff',
              strokeWidth: 1.5,
            }}
          />

          {/* Benchmark overlay (if provided) */}
          {benchmarkScores && (
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
          )}

          {/* Tooltip */}
          <Tooltip content={<CustomTooltip />} />

          {/* Legend */}
          <Legend
            wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
            formatter={(value: string) =>
              value === 'score' ? 'Organisation' : 'Sector Benchmark'
            }
          />
        </RechartsRadarChart>
      </ResponsiveContainer>

      {/* Screen-reader accessible data table */}
      <table className="sr-only">
        <caption>Domain scores from the radar chart</caption>
        <thead>
          <tr>
            <th scope="col">Domain</th>
            <th scope="col">Score</th>
            {benchmarkScores && <th scope="col">Benchmark</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.domainName}>
              <td>{point.domainName}</td>
              <td>{point.score.toFixed(1)} out of 5</td>
              {benchmarkScores && (
                <td>{(point.benchmark ?? 0).toFixed(1)} out of 5</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RadarChart;
