import React, { useId } from 'react';
import { MATURITY_LEVELS } from '@wiseshift/shared';
import HelpTooltip from '../common/HelpTooltip';

interface MaturitySelectorProps {
  value: number | undefined;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function MaturitySelector({
  value,
  onChange,
  disabled = false,
}: MaturitySelectorProps) {
  const groupId = useId();

  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <span className="text-xs font-medium text-gray-500">Select a maturity level</span>
        <HelpTooltip tooltipKey="help.maturitySelector" />
      </div>
      <div
        role="radiogroup"
        aria-label="Maturity level selector"
        className="grid grid-cols-1 gap-3 sm:grid-cols-5"
      >
      {MATURITY_LEVELS.map((ml) => {
        const isSelected = value === ml.level;

        return (
          <button
            key={ml.level}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Level ${ml.level} - ${ml.name}: ${ml.shortDescription}`}
            id={`${groupId}-maturity-${ml.level}`}
            disabled={disabled}
            onClick={() => onChange(ml.level)}
            className={`
              relative flex flex-col items-center gap-1.5
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
              {ml.name}
            </span>

            {/* Short description */}
            <span className="text-xs leading-tight text-gray-500">
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
        );
      })}
    </div>
    </div>
  );
}
