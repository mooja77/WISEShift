import { useState, useEffect } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { formatDistanceToNow } from 'date-fns';

export default function AutoSaveIndicator() {
  const isSaving = useUiStore((s) => s.isSaving);
  const lastSaved = useUiStore((s) => s.lastSaved);
  const saveError = useUiStore((s) => s.saveError);
  const [, setTick] = useState(0);

  // Update relative time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const relativeTime = lastSaved
    ? formatDistanceToNow(lastSaved, { addSuffix: true })
    : null;

  return (
    <div
      className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-gray-500 shadow-sm ring-1 ring-gray-200"
      role="status"
      aria-live="polite"
    >
      {saveError ? (
        <>
          <svg
            className="h-3.5 w-3.5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <span className="text-red-600">Save failed</span>
        </>
      ) : isSaving ? (
        <>
          <svg
            className="h-3.5 w-3.5 animate-spin text-brand-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Saving...</span>
        </>
      ) : lastSaved ? (
        <>
          <svg
            className="h-3.5 w-3.5 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>All changes saved {relativeTime}</span>
        </>
      ) : (
        <>
          <svg
            className="h-3.5 w-3.5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Progress saves automatically</span>
        </>
      )}
    </div>
  );
}
