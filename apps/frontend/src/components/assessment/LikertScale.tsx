import React, { useId } from 'react';
import HelpTooltip from '../common/HelpTooltip';

const DEFAULT_LABELS = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree',
];

interface LikertScaleProps {
  value: number | undefined;
  onChange: (value: number) => void;
  labels?: string[];
  disabled?: boolean;
}

export default function LikertScale({
  value,
  onChange,
  labels = DEFAULT_LABELS,
  disabled = false,
}: LikertScaleProps) {
  const groupId = useId();

  return (
    <div
      role="radiogroup"
      aria-label="Likert scale rating"
      className="flex flex-col gap-2"
    >
      {/* Button row — wraps on small screens for larger touch targets */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {[1, 2, 3, 4, 5].map((level) => {
          const isSelected = value === level;
          const label = labels[level - 1] ?? `Level ${level}`;

          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${level} - ${label}`}
              id={`${groupId}-option-${level}`}
              disabled={disabled}
              onClick={() => onChange(level)}
              className={`
                flex flex-col items-center justify-center gap-1
                rounded-lg border-2 px-3 py-4 sm:py-3 text-center min-h-[56px]
                transition-all duration-150 select-none
                focus-visible:outline focus-visible:outline-2
                focus-visible:outline-offset-2 focus-visible:outline-brand-600
                ${
                  isSelected
                    ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span
                className={`text-lg font-bold ${
                  isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {level}
              </span>
              <span className="text-xs leading-tight">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Scale anchors for extra clarity */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-gray-400">{labels[0]}</span>
        <HelpTooltip tooltipKey="help.likertScale" />
        <span className="text-xs text-gray-400">{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}
