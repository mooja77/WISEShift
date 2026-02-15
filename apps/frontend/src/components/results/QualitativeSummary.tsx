import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { getDomainByKey } from '@wiseshift/shared';
import { renderMarkdown } from '../../utils/renderMarkdown';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NarrativeItem {
  questionText: string;
  text: string;
  tags: string[];
}

export interface DomainNarrativeGroup {
  domainKey: string;
  domainName: string;
  narratives: NarrativeItem[];
}

export interface QualitativeSummaryProps {
  /** Qualitative narratives grouped by domain. */
  qualitativeSummary: DomainNarrativeGroup[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic pastel-ish background + text colour for a tag string. */
function tagColor(tag: string): { bg: string; text: string } {
  const palette: { bg: string; text: string }[] = [
    { bg: 'bg-blue-50', text: 'text-blue-700' },
    { bg: 'bg-green-50', text: 'text-green-700' },
    { bg: 'bg-purple-50', text: 'text-purple-700' },
    { bg: 'bg-amber-50', text: 'text-amber-700' },
    { bg: 'bg-rose-50', text: 'text-rose-700' },
    { bg: 'bg-teal-50', text: 'text-teal-700' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700' },
    { bg: 'bg-sky-50', text: 'text-sky-700' },
    { bg: 'bg-pink-50', text: 'text-pink-700' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  ];

  // Simple hash to pick a deterministic colour for a given tag.
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NarrativeCard({ narrative }: { narrative: NarrativeItem }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50">
      {/* Question text as subtitle */}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {narrative.questionText}
      </p>

      {/* Response text (rendered with basic markdown) */}
      <div
        className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(narrative.text) }}
      />

      {/* Tags */}
      {narrative.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {narrative.tags.map((tag) => {
            const colors = tagColor(tag);
            return (
              <span
                key={tag}
                className={clsx(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                  colors.bg,
                  colors.text,
                )}
              >
                {tag}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QualitativeSummary({
  qualitativeSummary,
}: QualitativeSummaryProps) {
  if (qualitativeSummary.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-gray-400">
          No qualitative responses have been recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {qualitativeSummary.map((group) => {
        const domain = getDomainByKey(group.domainKey);
        const accentColor = domain?.color ?? '#6B7280';

        return (
          <Disclosure key={group.domainKey} as="div">
            {({ open }) => (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <DisclosureButton className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Domain colour indicator */}
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: accentColor }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {group.domainName}
                    </span>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      {group.narratives.length}{' '}
                      {group.narratives.length === 1 ? 'response' : 'responses'}
                    </span>
                  </div>

                  <ChevronUpIcon
                    className={clsx(
                      'h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200',
                      open ? 'rotate-0' : 'rotate-180',
                    )}
                  />
                </DisclosureButton>

                <DisclosurePanel className="border-t border-gray-100 dark:border-gray-700 px-5 pb-5 pt-4">
                  <div className="space-y-3">
                    {group.narratives.map((narrative, idx) => (
                      <NarrativeCard key={idx} narrative={narrative} />
                    ))}
                  </div>
                </DisclosurePanel>
              </div>
            )}
          </Disclosure>
        );
      })}
    </div>
  );
}

export default QualitativeSummary;
