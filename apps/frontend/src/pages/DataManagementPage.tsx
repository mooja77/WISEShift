import { useState } from 'react';
import { assessmentApi } from '../services/api';
import toast from 'react-hot-toast';
import { ExclamationTriangleIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

type Action = 'delete' | 'anonymise' | null;

export default function DataManagementPage() {
  const [accessCode, setAccessCode] = useState('');
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<Action>(null);
  const [confirmText, setConfirmText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setLoading(true);
    setAssessment(null);
    setAction(null);
    try {
      const res = await assessmentApi.resume(accessCode.trim());
      setAssessment(res.data.data.assessment);
    } catch {
      toast.error('No assessment found for this access code.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!assessment || !action) return;
    if (confirmText !== 'CONFIRM') {
      toast.error('Please type CONFIRM to proceed.');
      return;
    }

    setProcessing(true);
    try {
      if (action === 'delete') {
        await assessmentApi.deleteAssessment(assessment.id, accessCode.trim());
        toast.success('All data has been permanently deleted.');
      } else {
        await assessmentApi.anonymiseData(assessment.id, accessCode.trim());
        toast.success('Data has been anonymised. Numeric scores retained for benchmarking.');
      }
      setDone(true);
    } catch {
      toast.error('Failed to process your request. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <div className="card text-center py-12">
            <ShieldCheckIcon className="mx-auto h-12 w-12 text-emerald-500" />
            <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">
              Request Completed
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {action === 'delete'
                ? 'All your assessment data has been permanently deleted.'
                : 'Your data has been anonymised. Numeric scores are retained for aggregate benchmarking only.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Manage My Data</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Under the EU General Data Protection Regulation (GDPR), you have the right to access,
          rectify, and delete your personal data. Use this page to manage your assessment data.
        </p>

        {/* Step 1: Enter access code */}
        <div className="card mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Step 1: Enter Your Access Code
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enter the access code you received when you created your assessment.
          </p>
          <form onSubmit={handleLookup} className="mt-4 flex gap-3">
            <input
              type="text"
              value={accessCode}
              onChange={e => setAccessCode(e.target.value)}
              placeholder="e.g., WISE-ABC123"
              className="input flex-1"
            />
            <button type="submit" disabled={loading || !accessCode.trim()} className="btn-primary">
              {loading ? 'Looking up...' : 'Look Up'}
            </button>
          </form>
        </div>

        {/* Step 2: Choose action */}
        {assessment && (
          <div className="card mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Step 2: Choose an Action
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Assessment found for <strong>{assessment.organisation?.name}</strong>.
              Status: <strong>{assessment.status}</strong>.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {/* Delete option */}
              <button
                type="button"
                onClick={() => { setAction('delete'); setConfirmText(''); }}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  action === 'delete'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 hover:border-red-300 dark:border-gray-700 dark:hover:border-red-800'
                }`}
              >
                <TrashIcon className="h-6 w-6 text-red-500" />
                <h3 className="mt-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                  Delete All Data
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Permanently removes your assessment, all responses, scores, action plans, and
                  organisation record. This cannot be undone.
                </p>
              </button>

              {/* Anonymise option */}
              <button
                type="button"
                onClick={() => { setAction('anonymise'); setConfirmText(''); }}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  action === 'anonymise'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-gray-200 hover:border-amber-300 dark:border-gray-700 dark:hover:border-amber-800'
                }`}
              >
                <ShieldCheckIcon className="h-6 w-6 text-amber-500" />
                <h3 className="mt-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                  Anonymise Data
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Removes your organisation name and narrative responses. Keeps numeric scores for
                  aggregate benchmarking (fully anonymised, not traceable to you).
                </p>
              </button>
            </div>

            {/* Confirmation */}
            {action && (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="flex gap-3">
                  <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-500" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      {action === 'delete'
                        ? 'This will permanently delete all your data.'
                        : 'This will remove your organisation name and narrative responses.'}
                    </h4>
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      Type <strong>CONFIRM</strong> below to proceed.
                    </p>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={e => setConfirmText(e.target.value)}
                      placeholder="Type CONFIRM"
                      className="input mt-3 max-w-xs text-sm"
                    />
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleAction}
                        disabled={confirmText !== 'CONFIRM' || processing}
                        className={`rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm ${
                          action === 'delete'
                            ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
                            : 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300'
                        }`}
                      >
                        {processing
                          ? 'Processing...'
                          : action === 'delete'
                            ? 'Delete All Data'
                            : 'Anonymise Data'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
