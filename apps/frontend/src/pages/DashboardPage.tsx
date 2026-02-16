import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, wordCloudApi } from '../services/api';
import type { DashboardOverview, DashboardInsight } from '@wiseshift/shared';
import { DOMAINS } from '@wiseshift/shared';
import { AggregateRadar } from '../components/dashboard/AggregateRadar';
import { InsightsPanel } from '../components/dashboard/InsightsPanel';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import WordCloud from '../components/results/WordCloud';
import { formatDate, formatScore } from '../utils/locale';
import { useTour } from '../hooks/useTour';
import { dashboardTourSteps } from '../config/tourSteps';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [insights, setInsights] = useState<DashboardInsight[]>([]);
  const [dashboardWordCloud, setDashboardWordCloud] = useState<{ text: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const { hasSeenTour, startTour } = useTour('dashboard', dashboardTourSteps);

  useEffect(() => {
    if (authenticated && overview && !hasSeenTour) {
      const timeout = setTimeout(startTour, 500);
      return () => clearTimeout(timeout);
    }
  }, [authenticated, overview, hasSeenTour, startTour]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dashboardApi.auth(accessCode.trim());
      setAuthenticated(true);
      fetchDashboardData();
    } catch (err) {
      toast.error('Invalid or expired dashboard access code');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, insightsRes, wcRes] = await Promise.all([
        dashboardApi.getOverview(),
        dashboardApi.getInsights(),
        wordCloudApi.getForDashboard().catch(() => ({ data: { data: [] } })),
      ]);
      setOverview(overviewRes.data.data);
      setInsights(insightsRes.data.data);
      setDashboardWordCloud(wcRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    }
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-indigo-50 px-4">
        <div className="w-full max-w-md card">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">European WISE Sector Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter your dashboard access code to view aggregate sector data across European WISEs.
            </p>
          </div>
          <form onSubmit={handleAuth} className="mt-6 space-y-4">
            <div>
              <label htmlFor="dashCode" className="label">Dashboard Access Code</label>
              <input
                id="dashCode"
                type="text"
                className="input mt-1 text-center font-mono text-lg tracking-wider"
                placeholder="DASH-XXXXXXXX"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading || !accessCode.trim()} className="btn-primary w-full">
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => navigate('/')} className="text-sm text-brand-600 hover:text-brand-800">
              Back to Home
            </button>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              Want to explore? Try the demo code: <code className="font-mono font-bold">DASH-DEMO2025</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">European WISE Sector Dashboard</h1>
        <p className="mt-1 text-gray-600">Aggregate view across all completed assessments, aligned with EU social economy frameworks</p>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-brand-600">{overview.completedAssessments}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-brand-600">{overview.totalAssessments}</p>
            <p className="text-sm text-gray-500">Total Started</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-brand-600">{formatScore(overview.averageOverallScore)}</p>
            <p className="text-sm text-gray-500">Avg Score</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-brand-600">
              {Object.keys(overview.sectorBreakdown).length}
            </p>
            <p className="text-sm text-gray-500">Sectors</p>
          </div>
        </div>

        {/* Radar */}
        {Object.keys(overview.domainAverages).length > 0 && (
          <div className="mt-8 card">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Sector Average by Domain</h2>
            <div className="flex justify-center">
              <AggregateRadar domainAverages={overview.domainAverages} />
            </div>
          </div>
        )}

        {/* Two columns */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Maturity Distribution */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Maturity Distribution</h2>
            {Object.entries(overview.maturityDistribution).map(([level, count]) => (
              <div key={level} className="mb-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{level}</span>
                  <span className="text-gray-500">{count} organisations</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-brand-500"
                    style={{ width: `${(count / overview.completedAssessments) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(overview.maturityDistribution).length === 0 && (
              <p className="text-sm text-gray-500">No data available yet.</p>
            )}
          </div>

          {/* Sector Breakdown */}
          <div className="card">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Sector Breakdown</h2>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600" title="Sectors aligned with EU NACE Rev. 2 classification">
                NACE aligned
              </span>
            </div>
            {Object.entries(overview.sectorBreakdown).map(([sector, count]) => (
              <div key={sector} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm font-medium">{sector}</span>
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  {count}
                </span>
              </div>
            ))}
            {Object.keys(overview.sectorBreakdown).length === 0 && (
              <p className="text-sm text-gray-500">No data available yet.</p>
            )}
          </div>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Sector Insights</h2>
            <InsightsPanel insights={insights} />
          </div>
        )}

        {/* Common Themes Word Cloud */}
        {dashboardWordCloud.length > 0 && (
          <div className="mt-8 card">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Common Themes Across WISEs</h2>
            <p className="mb-4 text-sm text-gray-500">
              Aggregated word frequencies from narrative responses across all completed assessments.
            </p>
            <WordCloud words={dashboardWordCloud} />
          </div>
        )}

        {/* Compare Assessments & Research Links */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/comparison')}
            className="btn-secondary"
          >
            Compare Assessments
          </button>
          <button
            onClick={() => navigate('/research')}
            className="btn-primary"
          >
            Research Workspace
          </button>
        </div>

        {/* EU Policy Alignment */}
        <div className="mt-8 card">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">EU Policy Alignment</h2>
          <p className="mb-4 text-sm text-gray-600">
            This dashboard aligns with the European Social Enterprise Monitor (ESEM) methodology
            and the European Pillar of Social Rights indicators.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col items-center rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-lg font-bold text-red-700">1</span>
              <span className="mt-2 text-xs font-semibold text-red-800">SDG 1</span>
              <span className="mt-0.5 text-xs text-red-600">No Poverty</span>
            </div>
            <div className="flex flex-col items-center rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">8</span>
              <span className="mt-2 text-xs font-semibold text-amber-800">SDG 8</span>
              <span className="mt-0.5 text-xs text-amber-600">Decent Work</span>
            </div>
            <div className="flex flex-col items-center rounded-lg border border-pink-200 bg-pink-50 p-4 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-lg font-bold text-pink-700">10</span>
              <span className="mt-2 text-xs font-semibold text-pink-800">SDG 10</span>
              <span className="mt-0.5 text-xs text-pink-600">Reduced Inequalities</span>
            </div>
            <div className="flex flex-col items-center rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">12</span>
              <span className="mt-2 text-xs font-semibold text-emerald-800">SDG 12</span>
              <span className="mt-0.5 text-xs text-emerald-600">Responsible Consumption</span>
            </div>
          </div>
        </div>

        {/* Data Sources */}
        <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Data Sources &amp; Benchmarks</h3>
              <p className="mt-1 text-sm text-blue-800">
                Benchmark data is derived from the ENSIE Impact-WISEs annual surveys, the European
                Social Enterprise Monitor (ESEM), and the PERSE project comparative research across
                12 EU countries. Aggregate scores reflect self-reported assessments and should be
                interpreted alongside qualitative context.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Assessments */}
        {overview.recentAssessments.length > 0 && (
          <div className="mt-8 card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Assessments</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Organisation</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Score</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {overview.recentAssessments.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2 text-sm">{a.organisationName}</td>
                      <td className="px-4 py-2 text-sm font-semibold">{formatScore(a.overallScore)}/5</td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {a.completedAt ? formatDate(a.completedAt) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
