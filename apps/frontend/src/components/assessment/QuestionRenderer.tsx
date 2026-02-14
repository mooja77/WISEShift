import { useState } from 'react';
import type { Question } from '@wiseshift/shared';
import { getQuestionHelp } from '@wiseshift/shared';
import LikertScale from './LikertScale';
import MaturitySelector from './MaturitySelector';
import NarrativeInput from './NarrativeInput';
import { ChevronDownIcon, ChevronUpIcon, LightBulbIcon } from '@heroicons/react/24/outline';

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
  const [helpOpen, setHelpOpen] = useState(false);
  const help = getQuestionHelp(question.id);

  return (
    <div className="card flex flex-col gap-4">
      {/* Question header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <h3 className="text-base font-semibold text-gray-900 leading-snug dark:text-gray-100">
            {question.text}
          </h3>
          {question.required && (
            <span className="mt-0.5 inline-flex shrink-0 items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-500/30">
              Required
            </span>
          )}
        </div>

        {question.description && (
          <p className="text-sm text-gray-500 leading-relaxed dark:text-gray-400">
            {question.description}
          </p>
        )}

        {/* Contextual Help Toggle */}
        {help && (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setHelpOpen(prev => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <LightBulbIcon className="h-4 w-4" />
              What does this mean?
              {helpOpen
                ? <ChevronUpIcon className="h-3 w-3" />
                : <ChevronDownIcon className="h-3 w-3" />
              }
            </button>

            {helpOpen && (
              <div className="mt-2 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm dark:border-brand-800 dark:bg-brand-900/20">
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  {help.plainLanguage}
                </p>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">EU Framework Context: </span>
                  {help.frameworkReference}
                </p>
                {help.exampleResponse && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                      See an example response
                    </summary>
                    <div className="mt-2 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-600 leading-relaxed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {help.exampleResponse}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
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
            domainKey={question.domainKey}
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
