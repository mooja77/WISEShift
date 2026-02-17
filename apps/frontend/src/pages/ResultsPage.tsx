import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resultsApi, wordCloudApi, reassessmentApi } from '../services/api';
import type { AssessmentResults } from '@wiseshift/shared';
import { RadarChart } from '../components/results/RadarChart';
import { ScoreOverview } from '../components/results/ScoreOverview';
import { DomainScoreCard } from '../components/results/DomainScoreCard';
import { QualitativeSummary } from '../components/results/QualitativeSummary';
import { DOMAINS } from '@wiseshift/shared';
import PageSkeleton from '../components/common/PageSkeleton';
import HelpTooltip from '../components/common/HelpTooltip';
import ExportDropdown from '../components/results/ExportDropdown';
import WordCloud from '../components/results/WordCloud';
import InterviewGuide from '../components/results/InterviewGuide';
import PeerExemplars from '../components/results/PeerExemplars';
import ReassessmentComparison from '../components/results/ReassessmentComparison';
import AssessmentTimeline from '../components/results/AssessmentTimeline';
import {
  ClipboardDocumentListIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  GlobeEuropeAfricaIcon,
  ChartBarSquareIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';
import SectorInsights from '../components/results/SectorInsights';
import OptInDialog from '../components/registry/OptInDialog';
import { useAssessmentStore } from '../stores/assessmentStore';
import { useTour } from '../hooks/useTour';
import { resultsTourSteps } from '../config/tourSteps';
import { formatScore } from '../utils/locale';
import toast from 'react-hot-toast';

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentId = searchParams.get('id');
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [wordCloudData, setWordCloudData] = useState<{ text: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [optInOpen, setOptInOpen] = useState(false);
  const { accessCode } = useAssessmentStore();
  const { hasSeenTour, startTour } = useTour('results', resultsTourSteps);

  useEffect(() => {
    if (!assessmentId) {
      navigate('/');
      return;
    }

    const fetchResults = async () => {
      try {
        const [resultsRes, wcRes] = await Promise.all([
          resultsApi.getResults(assessmentId),
          wordCloudApi.getForAssessment(assessmentId).catch(() => ({ data: { data: [] } })),
        ]);
        setResults(resultsRes.data.data);
        setWordCloudData(wcRes.data.data || []);
      } catch (err) {
        setError('Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [assessmentId, navigate]);

  useEffect(() => {
    if (!loading && results && !hasSeenTour) {
      const timeout = setTimeout(startTour, 500);
      return () => clearTimeout(timeout);
    }
  }, [loading, results, hasSeenTour, startTour]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (error || !results) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Unable to load results</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const radarData = results.domainScores.map((ds) => ({
    domainKey: ds.domainKey,
    domainName: ds.domainName,
    score: ds.score,
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Assessment Results</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">{results.organisationName}</p>
        </div>

        {/* Score Overview */}
        <ScoreOverview
          overallScore={results.overallScore}
          maturityLevel={results.overallMaturityLevel}
          strengths={results.strengths}
          weaknesses={results.weaknesses}
        />

        {/* Radar Chart */}
        <div className="mt-8 card">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Performance Overview <HelpTooltip tooltipKey="help.radarChart" />
          </h2>
          <div className="flex justify-center">
            <RadarChart domainScores={radarData} />
          </div>
        </div>

        {/* Domain Score Cards */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Domain Scores</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {results.domainScores.map((ds) => {
              const domain = DOMAINS.find((d) => d.key === ds.domainKey);
              return (
                <div key={ds.domainKey}>
                  <DomainScoreCard
                    domainKey={ds.domainKey}
                    domainName={ds.domainName}
                    score={ds.score}
                    maturityLevel={ds.maturityLevel}
                    color={domain?.color || '#6366F1'}
                  />
                  <PeerExemplars
                    assessmentId={assessmentId!}
                    domainKey={ds.domainKey}
                    domainName={ds.domainName}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Sector-Specific Insights */}
        <div className="mt-8">
          <SectorInsights assessmentId={assessmentId!} />
        </div>

        {/* Qualitative Summary */}
        {results.qualitativeSummary.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Qualitative Evidence</h2>
            <QualitativeSummary qualitativeSummary={results.qualitativeSummary} />
          </div>
        )}

        {/* Key Themes Word Cloud */}
        {wordCloudData.length > 0 && (
          <div className="mt-8 card">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Key Themes</h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Words that appear most frequently in your narrative responses. Larger, darker words appear more often.
            </p>
            <WordCloud words={wordCloudData} />
          </div>
        )}

        {/* Assessment Timeline (visible when multiple assessments exist) */}
        <div className="mt-8 card">
          <AssessmentTimeline assessmentId={assessmentId!} />
        </div>

        {/* Reassessment Comparison */}
        <div className="mt-8">
          <ReassessmentComparison assessmentId={assessmentId!} />
        </div>

        {/* Interview Guide */}
        <div className="mt-8">
          <InterviewGuide assessmentId={assessmentId!} />
        </div>

        {/* What's Next? */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">What&rsquo;s Next?</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to={`/action-plan?id=${assessmentId}`}
              className="group card-interactive flex flex-col items-start gap-3 p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                <ClipboardDocumentListIcon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Review Your Action Plan</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Get personalised recommendations prioritised by impact and effort for your organisation.
              </p>
            </Link>

            <Link
              to={`/benchmarks?id=${assessmentId}`}
              className="group card-interactive flex flex-col items-start gap-3 p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                <ChartBarIcon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Compare with Other WISEs</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                See how your scores compare against sector benchmarks from organisations across Europe.
              </p>
            </Link>

            <Link
              to={`/policy-alignment?id=${assessmentId}`}
              className="group card-interactive flex flex-col items-start gap-3 p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                <GlobeEuropeAfricaIcon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">EU Policy Alignment</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                See how your scores align with the European Pillar of Social Rights, UN SDGs, and EU Social Economy Action Plan.
              </p>
            </Link>

            <Link
              to={`/report?id=${assessmentId}`}
              className="group card-interactive flex flex-col items-start gap-3 p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                <DocumentArrowDownIcon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Download Your Report</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Generate a printable PDF summary of your results to share with your team or stakeholders.
              </p>
            </Link>

            <Link
              to={`/progress?id=${assessmentId}`}
              className="group card-interactive flex flex-col items-start gap-3 p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400">
                <ChartBarSquareIcon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Track Progress</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                View domain trends over time, set improvement goals, and get auto-generated progress narratives.
              </p>
            </Link>

            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await reassessmentApi.startReassessment(assessmentId!);
                  const { accessCode: newCode } = res.data.data;
                  toast.success(`Reassessment started! Access code: ${newCode}`);
                  navigate(`/assessment`);
                } catch (err) {
                  toast.error('Failed to start reassessment');
                }
              }}
              className="card-interactive flex flex-col items-start gap-3 p-5 text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                <ArrowPathIcon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Start a Reassessment</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Repeat the assessment later to track your progress and measure improvement over time.
              </p>
            </button>
          </div>

          {/* Registry Opt-In */}
          {accessCode && (
            <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-900/20">
              <div className="flex items-center gap-3">
                <BuildingLibraryIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">Join the WISE Registry</p>
                  <p className="text-xs text-teal-700 dark:text-teal-300">
                    Share your profile publicly to help build the first comprehensive WISE directory in Europe.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOptInOpen(true)}
                  className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
                >
                  Opt In
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ExportDropdown assessmentId={assessmentId!} />
            <button
              onClick={() => navigate('/')}
              className="btn-secondary"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>

      {/* Registry Opt-In Dialog */}
      {assessmentId && accessCode && (
        <OptInDialog
          open={optInOpen}
          onClose={() => setOptInOpen(false)}
          assessmentId={assessmentId}
          accessCode={accessCode}
        />
      )}
    </div>
  );
}
