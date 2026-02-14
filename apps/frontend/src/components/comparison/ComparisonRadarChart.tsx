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

interface DatasetScore {
  domainKey: string;
  domainName: string;
  score: number;
}

interface ComparisonRadarChartProps {
  datasets: {
    label: string;
    scores: DatasetScore[];
    color: string;
  }[];
  size?: number;
}

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

export default function ComparisonRadarChart({ datasets, size = 480 }: ComparisonRadarChartProps) {
  if (datasets.length === 0) return null;

  // Use the first dataset's domains as the base
  const baseScores = datasets[0].scores;
  const data = baseScores.map((d) => {
    const point: Record<string, any> = {
      domainName: d.domainName,
      shortName: SHORT_NAMES[d.domainName] ?? d.domainName,
    };
    for (const ds of datasets) {
      const score = ds.scores.find((s) => s.domainKey === d.domainKey);
      point[ds.label] = parseFloat((score?.score || 0).toFixed(2));
    }
    return point;
  });

  const COLORS = ['#3B82F6', '#EF4444', '#10B981'];

  return (
    <div style={{ width: size, height: size }} className="mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid stroke="#E5E7EB" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="shortName"
            tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tickCount={6}
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            axisLine={false}
          />
          {datasets.map((ds, idx) => (
            <Radar
              key={ds.label}
              name={ds.label}
              dataKey={ds.label}
              stroke={COLORS[idx] || ds.color}
              fill={COLORS[idx] || ds.color}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS[idx] || ds.color, stroke: '#fff', strokeWidth: 1 }}
            />
          ))}
          <Tooltip />
          <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
