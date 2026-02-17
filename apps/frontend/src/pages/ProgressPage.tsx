import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import PageSkeleton from '../components/common/PageSkeleton';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DomainGoal {
  targetScore: number;
  targetDate: string | null;
  notes: string | null;
}

interface TimelinePoint {
  date: string;
  score: number;
}

interface DomainProgress {
  domainKey: string;
  domainName: string;
  color: string;
  currentScore: number;
  previousScore: number | null;
  delta: number;
  trend: 'improved' | 'declined' | 'unchanged' | 'new';
  goal: DomainGoal | null;
  narrative: string;
  timeline: TimelinePoint[];
}

interface ProgressData {
  assessmentId: string;
  organisationName: string;
  totalAssessments: number;
  firstAssessmentDate: string | null;
  lastAssessmentDate: string | null;
  suggestReassessment: boolean;
  monthsSinceLastAssessment: number;
  domainProgress: DomainProgress[];
}

interface GoalFormState {
  targetScore: number;
  targetDate: string;
  notes: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trendIcon(trend: DomainProgress['trend']) {
  switch (trend) {
    case 'improved':
      return (
        <svg className="inline h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" transform="rotate(180 10 10)" />
        </svg>
      );
    case 'declined':
      return (
        <svg className="inline h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
        </svg>
      );
    case 'unchanged':
      return (
        <svg className="inline h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
        </svg>
      );
    case 'new':
      return (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          New
        </span>
      );
  }
}

function deltaLabel(delta: number) {
  if (delta === 0) return '';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
}

/** Build a simple SVG sparkline from timeline data points. */
function Sparkline({ points, color }: { points: TimelinePoint[]; color: string }) {
  if (points.length < 2) return null;

  const width = 120;
  const height = 36;
  const padding = 4;

  const scores = points.map((p) => p.score);
  const minScore = Math.min(...scores, 1);
  const maxScore = Math.max(...scores, 5);
  const range = maxScore - minScore || 1;

  const xStep = (width - padding * 2) / (points.length - 1);

  const pathPoints = points.map((p, i) => {
    const x = padding + i * xStep;
    const y = height - padding - ((p.score - minScore) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const d = pathPoints.map((pt, i) => (i === 0 ? `M${pt}` : `L${pt}`)).join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block"
      aria-label="Score trend sparkline"
    >
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Dot on the latest point */}
      {pathPoints.length > 0 && (
        <circle
          cx={padding + (points.length - 1) * xStep}
          cy={height - padding - ((points[points.length - 1].score - minScore) / range) * (height - padding * 2)}
          r={3}
          fill={color}
        />
      )}
    </svg>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ProgressPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentId = searchParams.get('id');

  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Goal form state — keyed by domainKey
  const [goalForms, setGoalForms] = useState<Record<string, GoalFormState>>({});
  const [savingGoals, setSavingGoals] = useState<Record<string, boolean>>({});
  const [goalSectionOpen, setGoalSectionOpen] = useState(false);

  // ── Fetch Data ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!assessmentId) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [progressRes, goalsRes] = await Promise.all([
          api.get(`/assessments/${assessmentId}/progress`),
          api.get(`/assessments/${assessmentId}/goals`).catch(() => ({ data: { data: [] } })),
        ]);

        const progressData: ProgressData = progressRes.data.data;
        setProgress(progressData);

        // Initialise goal forms from existing goals or domain progress data
        const existingGoals: Record<string, DomainGoal> = {};
        if (Array.isArray(goalsRes.data.data)) {
          for (const g of goalsRes.data.data) {
            existingGoals[g.domainKey] = g;
          }
        }

        const forms: Record<string, GoalFormState> = {};
        for (const dp of progressData.domainProgress) {
          const existing = dp.goal || existingGoals[dp.domainKey];
          forms[dp.domainKey] = {
            targetScore: existing?.targetScore ?? Math.min(dp.currentScore + 0.5, 5),
            targetDate: existing?.targetDate?.slice(0, 10) ?? '',
            notes: existing?.notes ?? '',
          };
        }
        setGoalForms(forms);
      } catch (err) {
        setError('Failed to load progress data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [assessmentId, navigate]);

  // ── Goal Handlers ─────────────────────────────────────────────────────────

  const updateGoalForm = useCallback(
    (domainKey: string, field: keyof GoalFormState, value: string | number) => {
      setGoalForms((prev) => ({
        ...prev,
        [domainKey]: { ...prev[domainKey], [field]: value },
      }));
    },
    [],
  );

  const saveGoal = useCallback(
    async (domainKey: string) => {
      if (!assessmentId) return;
      setSavingGoals((prev) => ({ ...prev, [domainKey]: true }));
      try {
        const form = goalForms[domainKey];
        await api.put(`/assessments/${assessmentId}/goals`, {
          domainKey,
          targetScore: form.targetScore,
          targetDate: form.targetDate || null,
          notes: form.notes || null,
        });
        toast.success('Goal saved');
      } catch {
        toast.error('Failed to save goal');
      } finally {
        setSavingGoals((prev) => ({ ...prev, [domainKey]: false }));
      }
    },
    [assessmentId, goalForms],
  );

  // ── Loading / Error States ────────────────────────────────────────────────

  if (loading) {
    return <PageSkeleton />;
  }

  if (error || !progress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Unable to load progress
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{error || 'Something went wrong.'}</p>
          <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline dark:text-brand-400">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <Link
            to={`/results?id=${assessmentId}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline dark:text-brand-400"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
            Back to Results
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Progress Tracker</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">{progress.organisationName}</p>
        </div>

        {/* ── Summary Cards ──────────────────────────────────────────────── */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Assessments */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Assessments</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {progress.totalAssessments}
            </p>
            {progress.firstAssessmentDate && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                First: {new Date(progress.firstAssessmentDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Months Since Last */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Months Since Last Assessment
            </p>
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {progress.monthsSinceLastAssessment}
            </p>
            {progress.lastAssessmentDate && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Last: {new Date(progress.lastAssessmentDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Domain count */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Domains Tracked</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {progress.domainProgress.length}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {progress.domainProgress.filter((d) => d.trend === 'improved').length} improving
            </p>
          </div>
        </div>

        {/* ── Reassessment Suggestion Banner ─────────────────────────────── */}
        {progress.suggestReassessment && (
          <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Time for a reassessment?
                </p>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  It has been {progress.monthsSinceLastAssessment} months since your last assessment.
                  We recommend reassessing every 6 months to track meaningful progress.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Domain Progress Cards ──────────────────────────────────────── */}
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Domain Progress
        </h2>
        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          {progress.domainProgress.map((dp) => (
            <div
              key={dp.domainKey}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {/* Color bar */}
              <div className="h-1.5" style={{ backgroundColor: dp.color }} />

              <div className="p-5">
                {/* Domain name + score row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {dp.domainName}
                    </h3>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {/* Sparkline */}
                    {dp.timeline.length > 1 && (
                      <Sparkline points={dp.timeline} color={dp.color} />
                    )}
                  </div>
                </div>

                {/* Score + trend */}
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {dp.currentScore.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/ 5.0</span>
                  {trendIcon(dp.trend)}
                  {dp.delta !== 0 && (
                    <span
                      className={`text-sm font-medium ${
                        dp.delta > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {deltaLabel(dp.delta)}
                    </span>
                  )}
                </div>

                {/* Narrative */}
                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {dp.narrative}
                </p>

                {/* Goal progress indicator */}
                {dp.goal && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Goal: {dp.goal.targetScore.toFixed(1)}
                      </span>
                      {dp.goal.targetDate && (
                        <span className="text-gray-500 dark:text-gray-400">
                          by {new Date(dp.goal.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {/* Progress bar towards goal */}
                    <div className="mt-2">
                      {(() => {
                        const goalDiff = dp.goal.targetScore - (dp.previousScore ?? 1);
                        const currentDiff = dp.currentScore - (dp.previousScore ?? 1);
                        const pct =
                          goalDiff > 0
                            ? Math.min(Math.max((currentDiff / goalDiff) * 100, 0), 100)
                            : dp.currentScore >= dp.goal.targetScore
                              ? 100
                              : 0;
                        return (
                          <>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                              <div
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: dp.color,
                                }}
                              />
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {pct >= 100
                                ? 'Goal reached!'
                                : `${Math.round(pct)}% towards goal`}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                    {dp.goal.notes && (
                      <p className="mt-2 text-xs italic text-gray-500 dark:text-gray-400">
                        {dp.goal.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Goal Setting Section ───────────────────────────────────────── */}
        <div className="mb-8">
          <button
            onClick={() => setGoalSectionOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 text-left shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750"
          >
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Set Goals
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Define target scores and timelines for each domain
              </p>
            </div>
            <svg
              className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${
                goalSectionOpen ? 'rotate-180' : ''
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {goalSectionOpen && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {progress.domainProgress.map((dp) => {
                const form = goalForms[dp.domainKey];
                if (!form) return null;
                const isSaving = savingGoals[dp.domainKey] || false;

                return (
                  <div
                    key={dp.domainKey}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    {/* Color bar */}
                    <div className="h-1.5" style={{ backgroundColor: dp.color }} />

                    <div className="p-5">
                      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
                        {dp.domainName}
                      </h3>

                      {/* Target Score Slider */}
                      <div className="mb-4">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Target Score: {form.targetScore.toFixed(1)}
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="0.5"
                          value={form.targetScore}
                          onChange={(e) =>
                            updateGoalForm(dp.domainKey, 'targetScore', parseFloat(e.target.value))
                          }
                          className="w-full accent-brand-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                          <span>1.0</span>
                          <span>Current: {dp.currentScore.toFixed(1)}</span>
                          <span>5.0</span>
                        </div>
                      </div>

                      {/* Target Date */}
                      <div className="mb-4">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Target Date (optional)
                        </label>
                        <input
                          type="date"
                          value={form.targetDate}
                          onChange={(e) =>
                            updateGoalForm(dp.domainKey, 'targetDate', e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                      </div>

                      {/* Notes */}
                      <div className="mb-4">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Notes
                        </label>
                        <textarea
                          value={form.notes}
                          onChange={(e) =>
                            updateGoalForm(dp.domainKey, 'notes', e.target.value)
                          }
                          rows={2}
                          placeholder="Optional notes about this goal..."
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
                        />
                      </div>

                      {/* Save Button */}
                      <button
                        onClick={() => saveGoal(dp.domainKey)}
                        disabled={isSaving}
                        className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
                      >
                        {isSaving ? 'Saving...' : 'Save Goal'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4">
          <Link to={`/results?id=${assessmentId}`} className="btn-secondary">
            Back to Results
          </Link>
          <Link to={`/assessment?reassess=${assessmentId}`} className="btn-primary">
            Start Reassessment
          </Link>
        </div>
      </div>
    </div>
  );
}
