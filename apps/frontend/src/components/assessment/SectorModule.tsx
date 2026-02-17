import React, { useState, useEffect } from 'react';
import type { ResponseInput, SectorModule as SectorModuleType } from '@wiseshift/shared';
import api from '../../services/api';
import QuestionRenderer from './QuestionRenderer';

interface SectorModuleProps {
  assessmentId: string;
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

export default function SectorModule({
  assessmentId,
  responses,
  onResponseChange,
}: SectorModuleProps) {
  const [sectorModule, setSectorModule] = useState<SectorModuleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSectorQuestions() {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get(`/assessments/${assessmentId}/sector-questions`);
        if (!cancelled) {
          setSectorModule(res.data?.data ?? null);
        }
      } catch (err: any) {
        if (!cancelled) {
          // A 404 or empty response means no sector module applies
          if (err.response?.status === 404) {
            setSectorModule(null);
          } else {
            setError('Failed to load sector-specific questions.');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSectorQuestions();

    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <svg
            className="h-5 w-5 animate-spin text-green-600 dark:text-green-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
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
          Loading sector-specific questions...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    );
  }

  // No applicable sector module for this assessment
  if (!sectorModule) {
    return null;
  }

  const answeredCount = sectorModule.questions.filter(
    (q) => responses[q.id] !== undefined
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Sector module header banner */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
        {/* Green gradient banner */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white text-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
                <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white">
                {sectorModule.name}
              </h2>
              <p className="mt-0.5 text-sm text-green-100">
                {sectorModule.description}
              </p>
            </div>
            {/* Progress indicator */}
            <div className="shrink-0 text-right">
              <span className="text-sm font-medium text-white">
                {answeredCount} / {sectorModule.questions.length}
              </span>
              <p className="text-xs text-green-200">answered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sector-specific questions */}
      <div className="flex flex-col gap-5">
        {sectorModule.questions.map((question, index) => (
          <div key={question.id}>
            {/* Question number label */}
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Sector Question {index + 1} of {sectorModule.questions.length}
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
