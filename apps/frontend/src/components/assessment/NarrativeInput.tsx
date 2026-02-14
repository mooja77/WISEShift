import React, { useRef, useEffect, useCallback } from 'react';

interface NarrativeInputProps {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  questionDescription?: string;
  questionTags?: string[];
}

/** Generate 2-3 suggested prompt chips from a question description */
function generatePromptChips(description?: string, tags?: string[]): string[] {
  const chips: string[] = [];

  if (tags && tags.length > 0) {
    chips.push(`Describe your approach to ${tags[0].toLowerCase()}`);
    if (tags.length > 1) {
      chips.push(`What challenges do you face with ${tags[1].toLowerCase()}?`);
    }
  }

  if (description) {
    const words = description.split(/\s+/);
    if (words.length > 4) {
      chips.push('Give a specific example from your organisation');
    }
  }

  if (chips.length === 0) {
    chips.push('Describe your current practice');
    chips.push('Give a specific example');
  }

  return chips.slice(0, 3);
}

/** Returns a depth milestone message and colour based on character count */
function getDepthMilestone(count: number): { message: string; color: string } | null {
  if (count >= 1800) return { message: 'Approaching limit', color: 'text-amber-500' };
  if (count >= 500) return { message: 'Excellent depth', color: 'text-green-600' };
  if (count >= 300) return { message: 'Great detail \u2014 this helps researchers understand your context', color: 'text-green-500' };
  if (count >= 100) return { message: 'Good start!', color: 'text-green-500' };
  return null;
}

export default function NarrativeInput({
  value,
  onChange,
  placeholder = 'Enter your response...',
  maxLength = 2000,
  disabled = false,
  questionDescription,
  questionTags,
}: NarrativeInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentValue = value ?? '';
  const charCount = currentValue.length;
  const isNearLimit = charCount >= maxLength * 0.9;
  const isAtLimit = charCount >= maxLength;

  const promptChips = generatePromptChips(questionDescription, questionTags);
  const milestone = getDepthMilestone(charCount);

  // Auto-grow the textarea to fit content
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const minHeight = 6 * 16; // 6rem in px
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [currentValue, adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  const handleChipClick = (chip: string) => {
    if (disabled) return;
    const prefix = currentValue.length > 0 ? `${currentValue}\n\n` : '';
    const newValue = `${prefix}${chip}: `;
    if (newValue.length <= maxLength) {
      onChange(newValue);
      // Focus textarea after inserting chip
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Suggested prompt chips */}
      {currentValue.length === 0 && promptChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {promptChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
              disabled={disabled}
              className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={currentValue}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        rows={4}
        aria-label="Narrative response"
        aria-describedby="char-count"
        className={`
          input resize-none overflow-hidden
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}
          ${isAtLimit ? 'ring-amber-500 focus:ring-amber-500' : ''}
        `}
      />

      {/* Depth milestones + char count */}
      <div id="char-count" className="flex items-center justify-between">
        <div>
          {milestone && (
            <span className={`text-xs font-medium ${milestone.color}`}>
              {milestone.message}
            </span>
          )}
        </div>
        <span
          className={`text-xs ${
            isAtLimit
              ? 'font-medium text-amber-600'
              : isNearLimit
                ? 'text-amber-500'
                : 'text-gray-400'
          }`}
        >
          {charCount.toLocaleString()} / {maxLength.toLocaleString()} characters
        </span>
      </div>

      {/* Markdown hint */}
      <p className="text-[10px] text-gray-400">
        Tip: Use <code className="rounded bg-gray-100 px-1">**bold**</code> and{' '}
        <code className="rounded bg-gray-100 px-1">-</code> for bullet lists
      </p>
    </div>
  );
}
