import { useState, useEffect, useCallback } from 'react';
import type { AISuggestion, AIStatusResponse } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import toast from 'react-hot-toast';

interface Props {
  /** IDs of currently visible narrative responses */
  visibleResponseIds: string[];
  /** Callback to refresh highlights after accepting suggestions */
  onAccepted: () => void;
}

type FilterStatus = 'all' | 'pending' | 'accepted' | 'rejected';

export default function AISuggestionsPanel({ visibleResponseIds, onAccepted }: Props) {
  const [aiStatus, setAiStatus] = useState<AIStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [requesting, setRequesting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [consentGiven, setConsentGiven] = useState(() => {
    try {
      return localStorage.getItem('wiseshift-ai-consent') === 'true';
    } catch {
      return false;
    }
  });
  const [showConsent, setShowConsent] = useState(false);

  // Check if AI coding is available on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await researchApi.getAIStatus();
        setAiStatus(res.data.data);
      } catch {
        setAiStatus({ enabled: false });
      } finally {
        setStatusLoading(false);
      }
    })();
  }, []);

  // Fetch existing suggestions when panel opens
  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await researchApi.getAISuggestions();
      setSuggestions(res.data.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (panelOpen) {
      fetchSuggestions();
    }
  }, [panelOpen, fetchSuggestions]);

  // If AI is not enabled, render nothing
  if (statusLoading || !aiStatus?.enabled) {
    return null;
  }

  const handleRequestSuggestions = async () => {
    if (!consentGiven) {
      setShowConsent(true);
      return;
    }

    if (visibleResponseIds.length === 0) {
      toast.error('No narratives visible to analyse');
      return;
    }

    setRequesting(true);
    try {
      const ids = visibleResponseIds.slice(0, 20);
      const res = await researchApi.requestAISuggestions(ids);
      const { suggestions: newSuggestions, skipped } = res.data.data;
      toast.success(`${newSuggestions.length} suggestion${newSuggestions.length !== 1 ? 's' : ''} generated${skipped > 0 ? ` (${skipped} skipped)` : ''}`);
      await fetchSuggestions();
      setPanelOpen(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to get AI suggestions';
      toast.error(msg);
    } finally {
      setRequesting(false);
    }
  };

  const handleConsent = (accepted: boolean) => {
    setShowConsent(false);
    if (accepted) {
      setConsentGiven(true);
      try {
        localStorage.setItem('wiseshift-ai-consent', 'true');
      } catch { /* ignore */ }
      // Trigger the actual request now
      handleRequestSuggestions();
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await researchApi.acceptSuggestion(id);
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'accepted' as const } : s));
      onAccepted();
      toast.success('Suggestion accepted');
    } catch {
      toast.error('Failed to accept suggestion');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await researchApi.rejectSuggestion(id);
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected' as const } : s));
      toast.success('Suggestion rejected');
    } catch {
      toast.error('Failed to reject suggestion');
    }
  };

  const handleBulkAcceptHighConfidence = async () => {
    const highConfPending = suggestions.filter(s => s.status === 'pending' && s.confidence >= 0.8);
    if (highConfPending.length === 0) {
      toast('No high-confidence pending suggestions to accept');
      return;
    }
    try {
      const ids = highConfPending.map(s => s.id);
      await researchApi.bulkAcceptSuggestions(ids);
      setSuggestions(prev => prev.map(s =>
        ids.includes(s.id) ? { ...s, status: 'accepted' as const } : s
      ));
      onAccepted();
      toast.success(`Accepted ${ids.length} high-confidence suggestion${ids.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to bulk accept suggestions');
    }
  };

  const handleClearAll = async () => {
    setShowClearConfirm(false);
    try {
      const res = await researchApi.clearAISuggestions();
      const { deleted } = res.data.data;
      setSuggestions(prev => prev.filter(s => s.status !== 'pending'));
      toast.success(`Cleared ${deleted} pending suggestion${deleted !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to clear suggestions');
    }
  };

  const filteredSuggestions = filterStatus === 'all'
    ? suggestions
    : suggestions.filter(s => s.status === filterStatus);

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  const truncateText = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '...' : text;

  const confidenceColor = (c: number) =>
    c >= 0.8 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400';

  const confidenceBarColor = (c: number) =>
    c >= 0.8 ? 'bg-green-500' : 'bg-yellow-500';

  return (
    <>
      {/* Consent Banner Modal */}
      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
              AI-Assisted Coding
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              AI coding sends anonymised narrative text to{' '}
              <strong className="text-gray-800 dark:text-gray-200">
                {aiStatus.provider === 'anthropic' ? 'Anthropic' : aiStatus.provider === 'openai' ? 'OpenAI' : aiStatus.provider}
              </strong>{' '}
              for analysis. Your data is not stored by the AI provider. Text is anonymised before sending.
            </p>
            <p className="mb-6 text-xs text-gray-500 dark:text-gray-400">
              You can disable this at any time. Suggestions must be manually reviewed before they become part of your coding.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleConsent(true)}
                className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                Enable AI Coding
              </button>
              <button
                onClick={() => handleConsent(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                No Thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger button — always visible in the toolbar when AI is enabled */}
      <button
        onClick={() => {
          if (!consentGiven) {
            setShowConsent(true);
          } else if (panelOpen) {
            setPanelOpen(false);
          } else {
            handleRequestSuggestions();
          }
        }}
        disabled={requesting}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        title={panelOpen ? 'Close AI suggestions panel' : 'Get AI coding suggestions for visible narratives'}
      >
        {/* Sparkle icon */}
        <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
        </svg>
        {requesting ? (
          <span className="animate-pulse">Analysing...</span>
        ) : panelOpen ? (
          <>
            AI Suggestions
            {pendingCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {pendingCount}
              </span>
            )}
          </>
        ) : (
          'AI Suggest'
        )}
      </button>

      {/* Slide-in panel */}
      {panelOpen && (
        <div className="fixed right-0 top-0 z-40 flex h-full w-80 flex-col border-l border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
              </svg>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                AI Suggestions
              </h3>
              {suggestions.length > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {filteredSuggestions.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {(['all', 'pending', 'accepted', 'rejected'] as FilterStatus[]).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex-1 px-2 py-2 text-xs font-medium capitalize transition-colors ${
                  filterStatus === status
                    ? 'border-b-2 border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Bulk actions */}
          {pendingCount > 0 && (
            <div className="flex gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
              <button
                onClick={handleBulkAcceptHighConfidence}
                className="text-xs font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              >
                Accept all above 80%
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={handleRequestSuggestions}
                disabled={requesting}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50 dark:text-brand-400 dark:hover:text-brand-300"
              >
                {requesting ? 'Analysing...' : 'Re-analyse'}
              </button>
            </div>
          )}

          {/* Suggestions list */}
          <div className="flex-1 overflow-y-auto">
            {filteredSuggestions.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <svg className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {suggestions.length === 0
                    ? "Click 'AI Suggest' to analyse your narratives"
                    : 'No suggestions match this filter'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredSuggestions.map(suggestion => (
                  <div key={suggestion.id} className="px-4 py-3">
                    {/* Suggested text */}
                    <p className="mb-1.5 text-xs italic text-gray-600 dark:text-gray-300">
                      "{truncateText(suggestion.suggestedText, 100)}"
                    </p>

                    {/* Tag chip */}
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: suggestion.tag?.color || '#6b7280' }}
                      >
                        {suggestion.tag?.name || 'Unknown tag'}
                      </span>
                    </div>

                    {/* Confidence bar */}
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                        <div
                          className={`h-full rounded-full transition-all ${confidenceBarColor(suggestion.confidence)}`}
                          style={{ width: `${Math.round(suggestion.confidence * 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${confidenceColor(suggestion.confidence)}`}>
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </div>

                    {/* Actions */}
                    {suggestion.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(suggestion.id)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(suggestion.id)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className={`text-xs font-medium capitalize ${
                        suggestion.status === 'accepted'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-500 dark:text-red-400'
                      }`}>
                        {suggestion.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel footer */}
          {pendingCount > 0 && (
            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
              {showClearConfirm ? (
                <div className="space-y-2">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Clear all pending suggestions? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearAll}
                      className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Clear all pending suggestions
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
