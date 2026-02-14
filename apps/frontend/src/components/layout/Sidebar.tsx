import { useState } from 'react';
import clsx from 'clsx';
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { DOMAINS } from '@wiseshift/shared';
import { useAssessmentStore } from '../../stores/assessmentStore';
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
  const [collapsed, setCollapsed] = useState(false);
  const assessmentId = useAssessmentStore(s => s.assessmentId);

  return (
    <aside
      className={clsx(
        'flex flex-col border-r border-gray-200 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-64 lg:w-72',
      )}
      aria-label="Assessment domains"
    >
      {/* Collapse/expand toggle */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-3">
        {!collapsed && (
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Domains
          </h2>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className={clsx(
            'inline-flex items-center justify-center rounded-md p-1.5',
            'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
            collapsed && 'mx-auto',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Domain navigation list */}
      <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Domain navigation">
        <ul role="list" className="space-y-1">
          {DOMAINS.map((domain, index) => {
            const isCurrent = index === currentDomainIndex;
            const responseCount = domainProgress[domain.key] ?? 0;
            const totalQuestions = domain.questions.length;
            const isComplete = responseCount >= totalQuestions;

            return (
              <li key={domain.key}>
                <button
                  type="button"
                  onClick={() => onSelectDomain(index)}
                  title={collapsed ? domain.name : undefined}
                  className={clsx(
                    'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
                    isCurrent
                      ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                    collapsed && 'justify-center px-0',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={
                    collapsed
                      ? `${domain.name}${isComplete ? ' (completed)' : ''}`
                      : undefined
                  }
                >
                  {/* Domain color dot */}
                  <span
                    className={clsx(
                      'flex h-3 w-3 shrink-0 rounded-full ring-2',
                      isCurrent ? 'ring-brand-300' : 'ring-transparent',
                    )}
                    style={{ backgroundColor: domain.color }}
                    aria-hidden="true"
                  />

                  {/* Domain name (hidden when collapsed) */}
                  {!collapsed && (
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
                  {!collapsed && isComplete && (
                    <CheckCircleIcon
                      className="h-5 w-5 shrink-0 text-emerald-500"
                      aria-label="Completed"
                    />
                  )}

                  {/* Progress count when not complete and not collapsed */}
                  {!collapsed && !isComplete && responseCount > 0 && (
                    <span
                      className={clsx(
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                        isCurrent
                          ? 'bg-brand-100 text-brand-700'
                          : 'bg-gray-100 text-gray-500',
                      )}
                      aria-label={`${responseCount} of ${totalQuestions} answered`}
                    >
                      {responseCount}/{totalQuestions}
                    </span>
                  )}

                  {/* Collapsed mode: show checkmark overlay */}
                  {collapsed && isComplete && (
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
      {!collapsed && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
            <span>Overall progress</span>
            <span className="font-medium">
              {DOMAINS.filter(
                (d) => (domainProgress[d.key] ?? 0) >= d.questions.length,
              ).length}
              /{DOMAINS.length} domains
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuenow={
              DOMAINS.filter(
                (d) => (domainProgress[d.key] ?? 0) >= d.questions.length,
              ).length
            }
            aria-valuemin={0}
            aria-valuemax={DOMAINS.length}
            aria-label="Domain completion progress"
          >
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{
                width: `${
                  (DOMAINS.filter(
                    (d) =>
                      (domainProgress[d.key] ?? 0) >= d.questions.length,
                  ).length /
                    DOMAINS.length) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
      )}
    </aside>
  );
}
