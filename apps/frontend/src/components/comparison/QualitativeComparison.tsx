import { useState } from 'react';
import type { CrossCaseComparison } from '@wiseshift/shared';
import { DOMAINS } from '@wiseshift/shared';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { renderMarkdown } from '../../utils/renderMarkdown';

interface QualitativeComparisonProps {
  assessments: CrossCaseComparison[];
}

export default function QualitativeComparison({ assessments }: QualitativeComparisonProps) {
  return (
    <div className="space-y-3">
      {DOMAINS.map((domain) => {
        // Only show domains where at least one assessment has narratives
        const hasNarratives = assessments.some((a) =>
          a.qualitativeResponses.some(
            (qr) => qr.domainKey === domain.key && qr.narratives.length > 0
          )
        );
        if (!hasNarratives) return null;

        return (
          <Disclosure key={domain.key} as="div">
            {({ open }) => (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <DisclosureButton className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: domain.color }}
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      {domain.name}
                    </span>
                  </div>
                  <ChevronUpIcon
                    className={clsx(
                      'h-4 w-4 text-gray-400 transition-transform',
                      open ? 'rotate-0' : 'rotate-180'
                    )}
                  />
                </DisclosureButton>

                <DisclosurePanel className="border-t border-gray-100 px-5 pb-5 pt-4">
                  <div className={`grid gap-4 grid-cols-${assessments.length}`}>
                    {assessments.map((a) => {
                      const domainQR = a.qualitativeResponses.find(
                        (qr) => qr.domainKey === domain.key
                      );
                      return (
                        <div key={a.assessmentId}>
                          <h4 className="mb-2 text-xs font-bold text-gray-500">
                            {a.label}
                          </h4>
                          {domainQR && domainQR.narratives.length > 0 ? (
                            <div className="space-y-2">
                              {domainQR.narratives.map((n, idx) => (
                                <div
                                  key={idx}
                                  className="rounded border border-gray-100 bg-gray-50/50 px-3 py-2"
                                >
                                  <p className="text-[10px] font-semibold uppercase text-gray-400">
                                    {n.questionText}
                                  </p>
                                  <div
                                    className="mt-1 text-xs leading-relaxed text-gray-700"
                                    dangerouslySetInnerHTML={{
                                      __html: renderMarkdown(n.text),
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs italic text-gray-400">
                              No narratives
                            </p>
                          )}
                        </div>
                      );
                    })}
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
