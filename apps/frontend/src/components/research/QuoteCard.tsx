import type { QuotePin } from '@wiseshift/shared';
import toast from 'react-hot-toast';

interface Props {
  quote: QuotePin;
  onDelete: (id: string) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export default function QuoteCard({ quote, onDelete, draggable, onDragStart, onDragOver, onDrop }: Props) {
  // Strip existing surrounding quotes to avoid double-wrapping
  const cleanText = quote.quoteText.replace(/^["\u201C\u201D]+/, '').replace(/["\u201C\u201D]+$/, '').trim();

  const copyForPaper = () => {
    const text = `"${cleanText}" (${quote.anonymisedContext || 'Organisation'}, ${quote.domainName || 'Unknown domain'}, score: ${quote.domainScore !== null && quote.domainScore !== undefined ? `${quote.domainScore.toFixed(1)}/5` : 'N/A'})`;
    navigator.clipboard.writeText(text);
    toast.success('Copied for paper');
  };

  return (
    <div
      className={`card relative ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Drag handle */}
      {draggable && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </div>
      )}

      <div className={draggable ? 'pl-6' : ''}>
        {/* Quote text */}
        <blockquote className="text-sm text-gray-700 italic leading-relaxed">
          &ldquo;{cleanText}&rdquo;
        </blockquote>

        {/* Context note */}
        {quote.contextNote && (
          <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
            {quote.contextNote}
          </p>
        )}

        {/* Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
          <span>{quote.anonymisedContext || 'Organisation'}</span>
          {quote.domainName && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{quote.domainName}</span>
          )}
          {quote.domainScore !== null && quote.domainScore !== undefined && (
            <span>{quote.domainScore.toFixed(1)}/5</span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-2 flex gap-3 border-t border-gray-100 pt-2">
          <button onClick={copyForPaper} className="text-xs text-gray-500 hover:text-brand-600">
            Copy for Paper
          </button>
          <button onClick={() => onDelete(quote.id)} className="text-xs text-red-500 hover:text-red-700">
            Unpin
          </button>
        </div>
      </div>
    </div>
  );
}
