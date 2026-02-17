import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import PageSkeleton from '../components/common/PageSkeleton';

interface DomainMapping {
  domainKey: string;
  strength: string;
  weight: number;
}

interface Objective {
  id: string;
  name: string;
  description: string;
  score: number;
  domainMappings: DomainMapping[];
}

interface Framework {
  key: string;
  name: string;
  shortName: string;
  description: string;
  url: string;
  overallScore: number;
  objectives: Objective[];
}

interface TopAligned {
  framework: string;
  objective: string;
  score: number;
}

interface PolicyAlignmentData {
  assessmentId: string;
  frameworks: Framework[];
  topAligned: TopAligned[];
}

function getScoreColor(score: number): string {
  if (score >= 3.5) return 'bg-emerald-500';
  if (score >= 2) return 'bg-amber-500';
  return 'bg-red-500';
}

function getScoreTextColor(score: number): string {
  if (score >= 3.5) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 2) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBgLight(score: number): string {
  if (score >= 3.5) return 'bg-emerald-50 dark:bg-emerald-900/20';
  if (score >= 2) return 'bg-amber-50 dark:bg-amber-900/20';
  return 'bg-red-50 dark:bg-red-900/20';
}

function getStrengthBadgeColor(strength: string): string {
  switch (strength.toLowerCase()) {
    case 'strong':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'moderate':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'weak':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}

export default function PolicyAlignmentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentId = searchParams.get('id');

  const [data, setData] = useState<PolicyAlignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!assessmentId) {
      navigate('/');
      return;
    }

    const fetchPolicyAlignment = async () => {
      try {
        const res = await api.get(`/assessments/${assessmentId}/policy-alignment`);
        setData(res.data.data);
      } catch (err) {
        setError('Failed to load policy alignment data. Please ensure the assessment is complete.');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicyAlignment();
  }, [assessmentId, navigate]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Unable to load policy alignment
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const activeFramework = data.frameworks[activeTab];
  const topFive = data.topAligned.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={`/results?id=${assessmentId}`}
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Results
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">EU Policy Alignment</h1>
          <p className="mt-2 max-w-3xl text-gray-600 dark:text-gray-400">
            See how your assessment results align with key European policy frameworks. Each framework's
            objectives are mapped to your WISE assessment domains to identify areas of strong alignment
            and opportunities for improvement.
          </p>
        </div>

        {/* Top Aligned Summary */}
        {topFive.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Top Aligned Objectives
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {topFive.map((item, idx) => (
                <div
                  key={idx}
                  className="flex min-w-[220px] flex-shrink-0 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <span className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {item.framework}
                  </span>
                  <span className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                    {item.objective}
                  </span>
                  <div className="mt-auto flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full rounded-full ${getScoreColor(item.score)}`}
                        style={{ width: `${(item.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold ${getScoreTextColor(item.score)}`}>
                      {item.score.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Framework Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex gap-6" aria-label="Framework tabs">
            {data.frameworks.map((fw, idx) => (
              <button
                key={fw.key}
                onClick={() => setActiveTab(idx)}
                className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  activeTab === idx
                    ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {fw.shortName}
              </button>
            ))}
          </nav>
        </div>

        {/* Active Framework View */}
        {activeFramework && (
          <div>
            {/* Framework Description & Overall Score */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {activeFramework.name}
                  </h2>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {activeFramework.description}
                  </p>
                  <a
                    href={activeFramework.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    Learn more
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                </div>
                <div className={`flex flex-col items-center rounded-xl px-8 py-4 ${getScoreBgLight(activeFramework.overallScore)}`}>
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Overall Alignment
                  </span>
                  <span className={`mt-1 text-4xl font-bold ${getScoreTextColor(activeFramework.overallScore)}`}>
                    {activeFramework.overallScore.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">out of 5.0</span>
                </div>
              </div>
            </div>

            {/* Objectives */}
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Objectives ({activeFramework.objectives.length})
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeFramework.objectives.map((obj) => (
                <div
                  key={obj.id}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {obj.name}
                  </h4>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-3">
                    {obj.description}
                  </p>

                  {/* Score bar */}
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreColor(obj.score)}`}
                        style={{ width: `${(obj.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold ${getScoreTextColor(obj.score)}`}>
                      {obj.score.toFixed(1)}
                    </span>
                  </div>

                  {/* Domain Mappings */}
                  {obj.domainMappings.length > 0 && (
                    <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Mapped Domains
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {obj.domainMappings.map((dm) => (
                          <span
                            key={dm.domainKey}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStrengthBadgeColor(dm.strength)}`}
                            title={`Weight: ${dm.weight}`}
                          >
                            {dm.domainKey}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
