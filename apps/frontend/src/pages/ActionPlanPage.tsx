import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { actionPlanApi } from '../services/api';
import type { ActionPlan, ActionPlanItem } from '@wiseshift/shared';
import { ActionPlanList } from '../components/action-plan/ActionPlanList';
import { PriorityMatrix } from '../components/action-plan/PriorityMatrix';
import PageSkeleton from '../components/common/PageSkeleton';
import toast from 'react-hot-toast';

export default function ActionPlanPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentId = searchParams.get('id');
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!assessmentId) {
      navigate('/');
      return;
    }
    fetchActionPlan();
  }, [assessmentId]);

  const fetchActionPlan = async () => {
    try {
      const res = await actionPlanApi.get(assessmentId!);
      setActionPlan(res.data.data);
    } catch (err) {
      toast.error('Failed to load action plan');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await actionPlanApi.generate(assessmentId!);
      setActionPlan(res.data.data);
      toast.success('Action plan generated!');
    } catch (err) {
      toast.error('Failed to generate action plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateItem = useCallback(async (planId: string, data: { status?: string; notes?: string }) => {
    if (!assessmentId) return;
    try {
      const res = await actionPlanApi.updateItem(assessmentId, planId, data);
      const updated = res.data.data;
      // Update the item in local state
      setActionPlan(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(item =>
            item.id === planId
              ? { ...item, status: updated.status, notes: updated.notes, completedAt: updated.completedAt?.toISOString?.() ?? updated.completedAt }
              : item,
          ),
        };
      });
    } catch {
      toast.error('Failed to update action plan item');
    }
  }, [assessmentId]);

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Action Plan</h1>
            {actionPlan && (
              <p className="mt-1 text-gray-600 dark:text-gray-400">{actionPlan.organisationName}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`btn-primary ${generating ? 'btn-loading' : ''}`}
            >
              {generating ? 'Generating...' : actionPlan?.items.length ? 'Regenerate Plan' : 'Generate Plan'}
            </button>
          </div>
        </div>

        {actionPlan && actionPlan.items.length > 0 ? (
          <>
            {/* Priority Matrix */}
            <div className="card mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Priority Matrix
              </h2>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Recommendations mapped by effort required and potential impact.
              </p>
              <PriorityMatrix items={actionPlan.items} />
            </div>

            {/* Action Plan List with tracking */}
            <ActionPlanList
              items={actionPlan.items}
              onUpdateItem={handleUpdateItem}
              trackingEnabled
            />
          </>
        ) : (
          <div className="card text-center py-16">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
              <ClipboardDocumentListIcon className="h-8 w-8 text-brand-600 dark:text-brand-400" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-gray-100">
              Your Personalised Action Plan
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm text-gray-600 dark:text-gray-400">
              Based on your assessment results, we&rsquo;ll create a step-by-step improvement plan
              tailored to your organisation — with approximately 8 recommendations across high,
              medium, and low priority levels.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`btn-primary mt-6 px-8 py-3 text-base ${generating ? 'btn-loading' : ''}`}
            >
              {generating ? 'Generating...' : 'Generate My Action Plan'}
            </button>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              This typically takes a few seconds
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link to={`/results?id=${assessmentId}`} className="btn-secondary">
            Back to Results
          </Link>
          <Link to={`/benchmarks?id=${assessmentId}`} className="btn-secondary">
            View Benchmarks
          </Link>
        </div>
      </div>
    </div>
  );
}
