import React from 'react';
import type { Domain, ResponseInput } from '@wiseshift/shared';
import QuestionRenderer from './QuestionRenderer';
import HelpTooltip from '../common/HelpTooltip';

interface DomainStepProps {
  domain: Domain;
  responses: Record<string, ResponseInput>;
  onResponseChange: (questionId: string, response: ResponseInput) => void;
}

/**
 * Extracts the display value from a ResponseInput based on question type.
 * Likert/maturity questions use numericValue, narrative uses textValue.
 */
function getDisplayValue(
  response: ResponseInput | undefined,
  questionType: string
): any {
  if (!response) return undefined;
  if (questionType === 'narrative') return response.textValue;
  return response.numericValue;
}

export default function DomainStep({
  domain,
  responses,
  onResponseChange,
}: DomainStepProps) {
  const answeredCount = domain.questions.filter(
    (q) => responses[q.id] !== undefined
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Domain header */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        {/* Color bar */}
        <div className="h-2" style={{ backgroundColor: domain.color }} />

        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white text-lg"
              style={{ backgroundColor: domain.color }}
              aria-hidden="true"
            >
              {domain.shortName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                {domain.name}
                <HelpTooltip tooltipKey={`help.domain.${domain.key}`} />
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">{domain.description}</p>
            </div>
            {/* Progress indicator */}
            <div className="shrink-0 text-right">
              <span className="text-sm font-medium text-gray-600">
                {answeredCount} / {domain.questions.length}
              </span>
              <p className="text-xs text-gray-400">answered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-5">
        {domain.questions.map((question, index) => (
          <div key={question.id}>
            {/* Question number label */}
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Question {index + 1} of {domain.questions.length}
            </p>

            <QuestionRenderer
              question={question}
              value={getDisplayValue(responses[question.id], question.type)}
              onChange={(newValue) => {
                const response: ResponseInput = {
                  domainKey: question.domainKey,
                  questionId: question.id,
                  questionType: question.type,
                  ...(question.type === 'narrative'
                    ? { textValue: newValue as string }
                    : { numericValue: newValue as number }),
                  tags: question.tags,
                };
                onResponseChange(question.id, response);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
