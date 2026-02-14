import type { TextHighlight } from '@wiseshift/shared';

interface Props {
  text: string;
  highlights: TextHighlight[];
  searchTerm?: string;
  onRemoveHighlight?: (id: string) => void;
}

// Utility: highlight search term with <mark>
function highlightSearch(text: string, term: string): (string | JSX.Element)[] {
  if (!term) return [text];
  const parts: (string | JSX.Element)[] = [];
  const lower = text.toLowerCase();
  const termLower = term.toLowerCase();
  let lastIdx = 0;

  let idx = lower.indexOf(termLower, lastIdx);
  while (idx !== -1) {
    if (idx > lastIdx) parts.push(text.slice(lastIdx, idx));
    parts.push(
      <mark key={`search-${idx}`} className="bg-yellow-200 rounded-sm px-0.5">
        {text.slice(idx, idx + term.length)}
      </mark>
    );
    lastIdx = idx + term.length;
    idx = lower.indexOf(termLower, lastIdx);
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

export default function HighlightedText({ text, highlights, searchTerm, onRemoveHighlight }: Props) {
  if (!text) return null;

  // Sort highlights by startOffset
  const sorted = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

  // Build segments
  const segments: { start: number; end: number; highlight?: TextHighlight }[] = [];
  let cursor = 0;

  for (const hl of sorted) {
    // Clamp to text bounds
    const start = Math.max(0, Math.min(hl.startOffset, text.length));
    const end = Math.max(0, Math.min(hl.endOffset, text.length));
    if (start >= end) continue;

    if (cursor < start) {
      segments.push({ start: cursor, end: start });
    }
    segments.push({ start, end, highlight: hl });
    cursor = Math.max(cursor, end);
  }

  if (cursor < text.length) {
    segments.push({ start: cursor, end: text.length });
  }

  // If no segments (no highlights), render whole text
  if (segments.length === 0) {
    return (
      <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
        {highlightSearch(text, searchTerm || '')}
      </p>
    );
  }

  return (
    <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
      {segments.map((seg, i) => {
        const slice = text.slice(seg.start, seg.end);
        if (seg.highlight) {
          const tag = seg.highlight.tag;
          const bgColor = tag?.color ? `${tag.color}30` : '#fef08a';
          return (
            <span
              key={i}
              className="relative inline rounded-sm group cursor-help"
              style={{ backgroundColor: bgColor }}
              title={`Tag: ${tag?.name || 'Unknown'}${onRemoveHighlight ? ' (click to remove)' : ''}`}
              onClick={onRemoveHighlight ? () => onRemoveHighlight(seg.highlight!.id) : undefined}
            >
              {highlightSearch(slice, searchTerm || '')}
              {tag && (
                <span
                  className="absolute -top-5 left-0 hidden whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow group-hover:block"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              )}
            </span>
          );
        }
        return <span key={i}>{highlightSearch(slice, searchTerm || '')}</span>;
      })}
    </p>
  );
}
