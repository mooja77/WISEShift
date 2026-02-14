import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { actionPlanApi } from '../services/api';
import type { ActionPlan, ActionPlanItem } from '@wiseshift/shared';
import { ActionPlanList } from '../components/action-plan/ActionPlanList';
import { PriorityMatrix } from '../components/action-plan/PriorityMatrix';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
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
              className="btn-primary"
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
          <div className="card text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Action Plan Yet</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Click "Generate Plan" to create personalised recommendations based on your assessment scores.
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
