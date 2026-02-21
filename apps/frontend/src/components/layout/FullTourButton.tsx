import { PlayCircleIcon } from '@heroicons/react/24/outline';
import { useFullAppTour } from '../../hooks/useFullAppTour';

export default function FullTourButton() {
  const { startFullTour, isRunning, stopTour } = useFullAppTour();

  if (isRunning) {
    return (
      <button
        type="button"
        onClick={stopTour}
        className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
        aria-label="Stop full app tour"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
        </svg>
        Stop Tour
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={startFullTour}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:text-brand-400 dark:hover:bg-brand-900/20 dark:hover:text-brand-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      aria-label="Start full app tour"
    >
      <PlayCircleIcon className="h-4 w-4" aria-hidden="true" />
      Full Tour
    </button>
  );
}
