import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resultsApi, wordCloudApi, reassessmentApi } from '../services/api';
import type { AssessmentResults } from '@wiseshift/shared';
import { RadarChart } from '../components/results/RadarChart';
import { ScoreOverview } from '../components/results/ScoreOverview';
import { DomainScoreCard } from '../components/results/DomainScoreCard';
import { QualitativeSummary } from '../components/results/QualitativeSummary';
import { DOMAINS } from '@wiseshift/shared';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import HelpTooltip from '../components/common/HelpTooltip';
import ExportDropdown from '../components/results/ExportDropdown';
import WordCloud from '../components/results/WordCloud';
import InterviewGuide from '../components/results/InterviewGuide';
import ReassessmentComparison from '../components/results/ReassessmentComparison';
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Unable to load results</h2>
          <p className="mt-2 text-gray-600">{error}</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Assessment Results</h1>
          <p className="mt-1 text-gray-600">{results.organisationName}</p>
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
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
            Performance Overview <HelpTooltip tooltipKey="help.radarChart" />
          </h2>
          <div className="flex justify-center">
            <RadarChart domainScores={radarData} />
          </div>
        </div>

        {/* Domain Score Cards */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Domain Scores</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {results.domainScores.map((ds) => {
              const domain = DOMAINS.find((d) => d.key === ds.domainKey);
              return (
                <DomainScoreCard
                  key={ds.domainKey}
                  domainKey={ds.domainKey}
                  domainName={ds.domainName}
                  score={ds.score}
                  maturityLevel={ds.maturityLevel}
                  color={domain?.color || '#6366F1'}
                />
              );
            })}
          </div>
        </div>

        {/* Qualitative Summary */}
        {results.qualitativeSummary.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Qualitative Evidence</h2>
            <QualitativeSummary qualitativeSummary={results.qualitativeSummary} />
          </div>
        )}

        {/* Key Themes Word Cloud */}
        {wordCloudData.length > 0 && (
          <div className="mt-8 card">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Key Themes</h2>
            <p className="mb-4 text-sm text-gray-500">
              Words that appear most frequently in your narrative responses. Larger, darker words appear more often.
            </p>
            <WordCloud words={wordCloudData} />
          </div>
        )}

        {/* Reassessment Comparison */}
        <div className="mt-8">
          <ReassessmentComparison assessmentId={assessmentId!} />
        </div>

        {/* Interview Guide */}
        <div className="mt-8">
          <InterviewGuide assessmentId={assessmentId!} />
        </div>

        {/* Action Links */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link to={`/action-plan?id=${assessmentId}`} className="btn-primary">
            View Action Plan
          </Link>
          <Link to={`/benchmarks?id=${assessmentId}`} className="btn-secondary">
            Compare with Benchmarks
          </Link>
          <Link to={`/report?id=${assessmentId}`} className="btn-secondary">
            Print Report
          </Link>
          <ExportDropdown assessmentId={assessmentId!} />
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await reassessmentApi.startReassessment(assessmentId!);
                const { assessment: newAssessment, accessCode } = res.data.data;
                toast.success(`Reassessment started! Access code: ${accessCode}`);
                navigate(`/assessment`);
              } catch (err) {
                toast.error('Failed to start reassessment');
              }
            }}
            className="btn-secondary"
          >
            Reassess
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}
