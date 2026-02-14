import React from 'react';
import type { Question } from '@wiseshift/shared';
import LikertScale from './LikertScale';
import MaturitySelector from './MaturitySelector';
import NarrativeInput from './NarrativeInput';

interface QuestionRendererProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

export default function QuestionRenderer({
  question,
  value,
  onChange,
  disabled = false,
}: QuestionRendererProps) {
  return (
    <div className="card flex flex-col gap-4">
      {/* Question header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <h3 className="text-base font-semibold text-gray-900 leading-snug">
            {question.text}
          </h3>
          {question.required && (
            <span className="mt-0.5 inline-flex shrink-0 items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
              Required
            </span>
          )}
        </div>

        {question.description && (
          <p className="text-sm text-gray-500 leading-relaxed">
            {question.description}
          </p>
        )}

        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Input component based on question type */}
      <div className="mt-1">
        {question.type === 'likert' && (
          <LikertScale
            value={value as number | undefined}
            onChange={onChange}
            disabled={disabled}
          />
        )}

        {question.type === 'maturity' && (
          <MaturitySelector
            value={value as number | undefined}
            onChange={onChange}
            disabled={disabled}
          />
        )}

        {question.type === 'narrative' && (
          <NarrativeInput
            value={value as string | undefined}
            onChange={onChange}
            placeholder={question.placeholder}
            disabled={disabled}
            questionDescription={question.description}
            questionTags={question.tags}
          />
        )}
      </div>
    </div>
  );
}
