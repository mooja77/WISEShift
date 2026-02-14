import { useState, useCallback, useRef } from 'react';
import type { NarrativeResult, TextHighlight as THighlight, ResearchTag } from '@wiseshift/shared';
import HighlightedText from './HighlightedText';
import HighlightPopover from './HighlightPopover';
import NotePopover from './NotePopover';
import { researchApi } from '../../services/api';

interface Props {
  result: NarrativeResult;
  searchTerm?: string;
  tags: ResearchTag[];
  highlights: THighlight[];
  onHighlightChange: () => void;
  onPinQuote?: (responseId: string, quoteText: string) => void;
}

export default function NarrativeCard({ result, searchTerm, tags, highlights, onHighlightChange, onPinQuote }: Props) {
  const [showHighlightPopover, setShowHighlightPopover] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const textRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !textRef.current) {
      setShowHighlightPopover(false);
      return;
    }

    const selText = sel.toString().trim();
    if (!selText) {
      setShowHighlightPopover(false);
      return;
    }

    // Calculate offsets relative to the raw textValue
    const raw = result.textValue;
    const startIdx = raw.indexOf(selText);
    if (startIdx === -1) {
      setShowHighlightPopover(false);
      return;
    }

    // Position popover near selection
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = textRef.current.getBoundingClientRect();

    setSelection({ start: startIdx, end: startIdx + selText.length, text: selText });
    setPopoverPos({ x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top - 8 });
    setShowHighlightPopover(true);
  }, [result.textValue]);

  const handleTagSelect = async (tagId: string) => {
    if (!selection) return;
    try {
      await researchApi.createHighlight({
        responseId: result.responseId,
        tagId,
        startOffset: selection.start,
        endOffset: selection.end,
        highlightedText: selection.text,
      });
      setShowHighlightPopover(false);
      window.getSelection()?.removeAllRanges();
      onHighlightChange();
    } catch {
      // silently fail
    }
  };

  const handleRemoveHighlight = async (highlightId: string) => {
    try {
      await researchApi.deleteHighlight(highlightId);
      onHighlightChange();
    } catch {
      // silently fail
    }
  };

  const scoreColor = result.domainScore !== null
    ? result.domainScore >= 4 ? 'bg-green-100 text-green-800'
    : result.domainScore >= 3 ? 'bg-yellow-100 text-yellow-800'
    : 'bg-red-100 text-red-800'
    : 'bg-gray-100 text-gray-600';

  return (
    <div className="card relative">
      {/* Header */}
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{result.questionText}</p>
          <p className="mt-0.5 text-xs text-gray-500">{result.anonymisedContext}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scoreColor}`}>
            {result.domainScore !== null ? `${result.domainScore.toFixed(1)}/5` : 'N/A'}
          </span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            {result.domainName}
          </span>
        </div>
      </div>

      {/* Narrative text with highlights */}
      <div ref={textRef} className="relative" onMouseUp={handleMouseUp}>
        <HighlightedText
          text={result.textValue}
          highlights={highlights}
          searchTerm={searchTerm}
          onRemoveHighlight={handleRemoveHighlight}
        />
        {showHighlightPopover && selection && (
          <HighlightPopover
            tags={tags}
            position={popoverPos}
            onSelect={handleTagSelect}
            onClose={() => setShowHighlightPopover(false)}
          />
        )}
      </div>

      {/* Footer actions */}
      <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-2">
        <NotePopover responseId={result.responseId} hasNote={result.noteExists} />
        {onPinQuote && (
          <button
            onClick={() => {
              const sel = window.getSelection()?.toString().trim();
              const text = sel || result.textValue.substring(0, 200);
              onPinQuote(result.responseId, text);
            }}
            className="text-xs text-gray-500 hover:text-brand-600"
            title="Pin quote"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
            Pin Quote
          </button>
        )}
        {result.highlightCount > 0 && (
          <span className="text-xs text-gray-400">{result.highlightCount} highlight{result.highlightCount !== 1 ? 's' : ''}</span>
        )}
      </div>
    </div>
  );
}
