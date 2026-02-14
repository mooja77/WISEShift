import { useEffect } from 'react';
import clsx from 'clsx';
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { DOMAINS } from '@wiseshift/shared';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useUiStore } from '../../stores/uiStore';
import CollaboratorBadge from '../assessment/CollaboratorBadge';

interface SidebarProps {
  /** Zero-based index of the currently active domain */
  currentDomainIndex: number;
  /** Callback when a domain is selected by index */
  onSelectDomain: (index: number) => void;
  /** Map of domain key to number of responses completed for that domain */
  domainProgress: Record<string, number>;
}

export default function Sidebar({
  currentDomainIndex,
  onSelectDomain,
  domainProgress,
}: SidebarProps) {
  const { sidebarOpen: collapsed, toggleSidebar, mobileSidebarOpen, closeMobileSidebar } = useUiStore();
  const assessmentId = useAssessmentStore(s => s.assessmentId);

  // The uiStore "sidebarOpen" was originally true=open, but we renamed the toggle semantics.
  // For backwards-compat: sidebarOpen=true means visible; we'll use "collapsed" to mean !sidebarOpen
  // Actually, let's just use the store directly — the old code had a local collapsed state,
  // we now use the store's sidebarOpen (true = expanded, false = collapsed for desktop).
  const isCollapsed = !useUiStore(s => s.sidebarOpen);

  // Close mobile sidebar on route change / domain select
  const handleDomainSelect = (index: number) => {
    onSelectDomain(index);
    closeMobileSidebar();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileSidebarOpen) closeMobileSidebar();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileSidebarOpen, closeMobileSidebar]);

  // Calculate overall question-level progress
  const totalRequired = DOMAINS.reduce((sum, d) => sum + d.questions.filter(q => q.required).length, 0);
  const answeredRequired = Object.values(domainProgress).reduce((sum, pct) => {
    // domainProgress values are already percentages 0-100 per domain
    return sum;
  }, 0);

  // Recalculate from scratch for accurate question-level progress
  const completedDomains = DOMAINS.filter(
    d => (domainProgress[d.key] ?? 0) >= 100,
  ).length;

  const sidebarContent = (
    <>
      {/* Collapse/expand toggle (desktop only) */}
      <div className="hidden md:flex items-center justify-between border-b border-gray-100 px-3 py-3 dark:border-gray-700">
        {!isCollapsed && (
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Domains
          </h2>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className={clsx(
            'inline-flex items-center justify-center rounded-md p-1.5',
            'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
            'dark:hover:bg-gray-700 dark:hover:text-gray-300',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
            isCollapsed && 'mx-auto',
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile close button */}
      <div className="flex md:hidden items-center justify-between border-b border-gray-100 px-3 py-3 dark:border-gray-700">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Domains
        </h2>
        <button
          type="button"
          onClick={closeMobileSidebar}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          aria-label="Close sidebar"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Domain navigation list */}
      <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Domain navigation">
        <ul role="list" className="space-y-1">
          {DOMAINS.map((domain, index) => {
            const isCurrent = index === currentDomainIndex;
            const responseCount = domainProgress[domain.key] ?? 0;
            const totalQuestions = domain.questions.length;
            const isComplete = responseCount >= 100; // domainProgress is now percentage

            return (
              <li key={domain.key}>
                <button
                  type="button"
                  onClick={() => handleDomainSelect(index)}
                  title={isCollapsed ? domain.name : undefined}
                  className={clsx(
                    'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
                    isCurrent
                      ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-white',
                    isCollapsed && 'justify-center px-0',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={
                    isCollapsed
                      ? `${domain.name}${isComplete ? ' (completed)' : ''}`
                      : undefined
                  }
                >
                  {/* Domain color dot */}
                  <span
                    className={clsx(
                      'flex h-3 w-3 shrink-0 rounded-full ring-2',
                      isCurrent ? 'ring-brand-300 dark:ring-brand-600' : 'ring-transparent',
                    )}
                    style={{ backgroundColor: domain.color }}
                    aria-hidden="true"
                  />

                  {/* Domain name (hidden when collapsed on desktop) */}
                  {!isCollapsed && (
                    <span className="flex-1 truncate">
                      {domain.name}
                      {assessmentId && (
                        <CollaboratorBadge
                          assessmentId={assessmentId}
                          domainKey={domain.key}
                        />
                      )}
                    </span>
                  )}

                  {/* Completion indicator */}
                  {!isCollapsed && isComplete && (
                    <CheckCircleIcon
                      className="h-5 w-5 shrink-0 text-emerald-500"
                      aria-label="Completed"
                    />
                  )}

                  {/* Progress count when not complete and not collapsed */}
                  {!isCollapsed && !isComplete && responseCount > 0 && (
                    <span
                      className={clsx(
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                        isCurrent
                          ? 'bg-brand-100 text-brand-700 dark:bg-brand-800 dark:text-brand-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
                      )}
                      aria-label={`${responseCount}% answered`}
                    >
                      {responseCount}%
                    </span>
                  )}

                  {/* Collapsed mode: show checkmark overlay */}
                  {isCollapsed && isComplete && (
                    <span className="absolute -right-0.5 -top-0.5">
                      <CheckCircleIcon
                        className="h-3.5 w-3.5 text-emerald-500"
                        aria-label="Completed"
                      />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Progress summary at bottom */}
      {!isCollapsed && (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-700">
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Domain {currentDomainIndex + 1} of {DOMAINS.length}</span>
            <span className="font-medium">
              {completedDomains}/{DOMAINS.length} complete
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
            role="progressbar"
            aria-valuenow={completedDomains}
            aria-valuemin={0}
            aria-valuemax={DOMAINS.length}
            aria-label="Domain completion progress"
          >
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{
                width: `${(completedDomains / DOMAINS.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-out sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-white transition-transform duration-200 md:hidden dark:bg-gray-900',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Assessment domains"
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'hidden md:flex flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-900',
          isCollapsed ? 'w-16' : 'w-64 lg:w-72',
        )}
        aria-label="Assessment domains"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
