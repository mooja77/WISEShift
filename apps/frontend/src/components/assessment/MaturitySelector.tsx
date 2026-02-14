import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MATURITY_LEVELS, getDomainMaturityExamples } from '@wiseshift/shared';
import type { DomainMaturityExample } from '@wiseshift/shared';
import HelpTooltip from '../common/HelpTooltip';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

/** Map maturity level names to i18n keys */
const MATURITY_I18N_KEYS: Record<string, string> = {
  'Emerging': 'maturity.emerging',
  'Developing': 'maturity.developing',
  'Established': 'maturity.established',
  'Advanced': 'maturity.advanced',
  'Leading': 'maturity.leading',
};

interface MaturitySelectorProps {
  value: number | undefined;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Domain key for domain-specific maturity level examples */
  domainKey?: string;
}

export default function MaturitySelector({
  value,
  onChange,
  disabled = false,
  domainKey,
}: MaturitySelectorProps) {
  const { t } = useTranslation();
  const groupId = useId();
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);

  const domainExamples: DomainMaturityExample[] = domainKey
    ? getDomainMaturityExamples(domainKey)
    : [];

  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('questions.maturitySelect')}</span>
        <HelpTooltip tooltipKey="help.maturitySelector" />
      </div>
      <div
        role="radiogroup"
        aria-label="Maturity level selector"
        className="grid grid-cols-1 gap-3 sm:grid-cols-5"
      >
      {MATURITY_LEVELS.map((ml) => {
        const isSelected = value === ml.level;
        const example = domainExamples.find(e => e.level === ml.level);
        const isExpanded = expandedLevel === ml.level;

        return (
          <div key={ml.level} className="relative">
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Level ${ml.level} - ${MATURITY_I18N_KEYS[ml.name] ? t(MATURITY_I18N_KEYS[ml.name]) : ml.name}: ${ml.shortDescription}`}
              id={`${groupId}-maturity-${ml.level}`}
              disabled={disabled}
              onClick={() => onChange(ml.level)}
              className={`
                relative flex w-full flex-col items-center gap-1.5
                rounded-xl border-2 px-3 py-4 text-center
                transition-all duration-150 select-none
                focus-visible:outline focus-visible:outline-2
                focus-visible:outline-offset-2 focus-visible:outline-brand-600
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              style={{
                borderColor: isSelected ? ml.color : undefined,
                backgroundColor: isSelected ? `${ml.color}10` : undefined,
                boxShadow: isSelected ? `0 0 0 1px ${ml.color}` : undefined,
              }}
            >
              {/* Level number badge */}
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: ml.color }}
              >
                {ml.level}
              </span>

              {/* Level name */}
              <span
                className="text-sm font-semibold"
                style={{ color: isSelected ? ml.color : undefined }}
              >
                {MATURITY_I18N_KEYS[ml.name] ? t(MATURITY_I18N_KEYS[ml.name]) : ml.name}
              </span>

              {/* Short description */}
              <span className="text-xs leading-tight text-gray-500 dark:text-gray-400">
                {ml.shortDescription}
              </span>

              {/* Selected indicator */}
              {isSelected && (
                <span
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: ml.color }}
                  aria-hidden="true"
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
              )}
            </button>

            {/* Domain-specific example info icon */}
            {example && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedLevel(isExpanded ? null : ml.level);
                }}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-400 hover:text-brand-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-500 dark:hover:text-brand-400"
                aria-label={`Example for ${MATURITY_I18N_KEYS[ml.name] ? t(MATURITY_I18N_KEYS[ml.name]) : ml.name} level`}
              >
                <InformationCircleIcon className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Expanded example popover */}
            {example && isExpanded && (
              <div className="absolute left-0 right-0 z-10 mt-2 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  What Level {ml.level} looks like:
                </p>
                <p className="leading-relaxed">{example.example}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
    </div>
  );
}
