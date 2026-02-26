import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { CooccurrenceData, CooccurrenceDrilldownResult } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

// ─── Highlighted text renderer ───

interface HighlightSpan {
  start: number;
  end: number;
  color: string;
  label: string;
}

function renderHighlightedText(text: string, spans: HighlightSpan[]) {
  if (spans.length === 0) return <span>{text}</span>;

  // Sort by start offset
  const sorted = [...spans].sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const span of sorted) {
    const start = Math.max(span.start, cursor);
    const end = Math.min(span.end, text.length);
    if (start >= end) continue;

    // Text before this highlight
    if (cursor < start) {
      parts.push(<span key={`t-${cursor}`}>{text.slice(cursor, start)}</span>);
    }

    // Highlighted span
    parts.push(
      <mark
        key={`h-${span.start}-${span.end}-${span.label}`}
        className="rounded px-0.5"
        style={{ backgroundColor: span.color, color: '#1f2937' }}
        title={span.label}
      >
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  }

  // Remaining text
  if (cursor < text.length) {
    parts.push(<span key={`t-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return <>{parts}</>;
}

// ─── Drilldown Modal ───

interface DrilldownProps {
  tag1: { id: string; name: string; color: string };
  tag2: { id: string; name: string; color: string };
  onClose: () => void;
}

function CooccurrenceDrilldown({ tag1, tag2, onClose }: DrilldownProps) {
  const [results, setResults] = useState<CooccurrenceDrilldownResult[]>([]);
  const [loading, setLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    researchApi.getCooccurrenceDrilldown(tag1.id, tag2.id)
      .then(res => setResults(res.data.data))
      .catch(() => toast.error('Failed to load co-occurrence passages'))
      .finally(() => setLoading(false));
  }, [tag1.id, tag2.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Co-occurring Passages
            </h3>
            <p className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: tag1.color }} />
              <span className="font-medium">{tag1.name}</span>
              <span>+</span>
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: tag2.color }} />
              <span className="font-medium">{tag2.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[65vh] overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No co-occurring passages found.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing {results.length} response{results.length !== 1 ? 's' : ''} where both themes appear
              </p>
              {results.map(r => {
                const spans: HighlightSpan[] = [
                  ...r.tag1Highlights.map(h => ({
                    start: h.startOffset,
                    end: h.endOffset,
                    color: `${tag1.color}40`,
                    label: tag1.name,
                  })),
                  ...r.tag2Highlights.map(h => ({
                    start: h.startOffset,
                    end: h.endOffset,
                    color: `${tag2.color}40`,
                    label: tag2.name,
                  })),
                ];

                return (
                  <div
                    key={r.responseId}
                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {r.questionText}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                      {r.anonymisedContext}
                    </p>
                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {renderHighlightedText(r.textValue, spans)}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Level Toggle ───

interface LevelToggleProps {
  level: 'response' | 'passage';
  onChange: (level: 'response' | 'passage') => void;
}

function LevelToggle({ level, onChange }: LevelToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-0.5">
      <button
        onClick={() => onChange('response')}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          level === 'response'
            ? 'bg-white text-brand-700 shadow-sm dark:bg-gray-700 dark:text-brand-400'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
        }`}
        title="Two themes co-occur if they both appear anywhere in the same response. Broader, more inclusive."
      >
        Response level (broader)
      </button>
      <button
        onClick={() => onChange('passage')}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          level === 'passage'
            ? 'bg-white text-brand-700 shadow-sm dark:bg-gray-700 dark:text-brand-400'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
        }`}
        title="Two themes co-occur only if their highlighted text ranges physically overlap. More precise."
      >
        Passage level (precise)
      </button>
    </div>
  );
}

// ─── Intensity Legend ───

function IntensityLegend({ maxCount }: { maxCount: number }) {
  const steps = 5;
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <span>0</span>
      <div className="flex gap-0.5">
        {Array.from({ length: steps }, (_, i) => {
          const opacity = (i + 1) / steps;
          return (
            <div
              key={i}
              className="h-4 w-6 rounded-sm"
              style={{ backgroundColor: `rgba(30, 64, 175, ${opacity})` }}
            />
          );
        })}
      </div>
      <span>{maxCount}</span>
    </div>
  );
}

// ─── Main Component ───

export default function CooccurrenceMatrix() {
  const [data, setData] = useState<CooccurrenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<'response' | 'passage'>('response');
  const [drilldown, setDrilldown] = useState<{
    tag1: { id: string; name: string; color: string };
    tag2: { id: string; name: string; color: string };
  } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ i: number; j: number } | null>(null);

  const fetchData = useCallback(async (lvl: 'response' | 'passage') => {
    setLoading(true);
    try {
      const res = await researchApi.getCooccurrence(lvl);
      setData(res.data.data);
    } catch {
      toast.error('Failed to load co-occurrence data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(level);
  }, [level, fetchData]);

  const handleLevelChange = useCallback((newLevel: 'response' | 'passage') => {
    setLevel(newLevel);
  }, []);

  const handleCellClick = useCallback((i: number, j: number) => {
    if (!data || i === j) return;
    const count = data.matrix[i][j];
    if (count === 0) return;
    setDrilldown({
      tag1: data.tags[i],
      tag2: data.tags[j],
    });
  }, [data]);

  // Pre-compute tooltip text for hovered cell
  const tooltipText = useMemo(() => {
    if (!hoveredCell || !data) return '';
    const { i, j } = hoveredCell;
    if (i === j) return `${data.tags[i].name} (self)`;
    const count = data.matrix[i][j];
    const levelLabel = data.level === 'response' ? 'responses' : 'passages';
    return `${data.tags[i].name} + ${data.tags[j].name}: appears together in ${count} ${levelLabel}`;
  }, [hoveredCell, data]);

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Empty state: fewer than 2 tags
  if (!data || data.tags.length < 2) {
    return (
      <div className="card p-8">
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
          </svg>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Add more themes and code narratives to see how they overlap.
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            You need at least two tags with coded highlights to build a co-occurrence matrix.
          </p>
        </div>
      </div>
    );
  }

  const { tags, matrix, maxCount } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Co-occurrence
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            See which themes appear together in your data
          </p>
        </div>
        <LevelToggle level={level} onChange={handleLevelChange} />
      </div>

      {/* Matrix */}
      <div className="card overflow-hidden dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {/* Corner cell */}
                <th className="sticky left-0 z-10 bg-white dark:bg-gray-800 min-w-[140px] p-2" />
                {/* Column headers */}
                {tags.map(tag => (
                  <th
                    key={tag.id}
                    className="p-2 text-center"
                    style={{ minWidth: '56px' }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span
                        className="text-xs font-medium text-gray-600 dark:text-gray-400 max-w-[80px] truncate writing-mode-horizontal"
                        title={tag.name}
                      >
                        {tag.name.length > 10 ? tag.name.slice(0, 9) + '\u2026' : tag.name}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tags.map((rowTag, i) => (
                <tr key={rowTag.id}>
                  {/* Row header */}
                  <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 p-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: rowTag.color }}
                      />
                      <span
                        className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]"
                        title={rowTag.name}
                      >
                        {rowTag.name}
                      </span>
                    </div>
                  </td>
                  {/* Cells */}
                  {tags.map((colTag, j) => {
                    const isDiagonal = i === j;
                    const count = matrix[i][j];
                    const opacity = maxCount > 0 ? count / maxCount : 0;
                    const isHovered = hoveredCell?.i === i && hoveredCell?.j === j;
                    const isClickable = !isDiagonal && count > 0;

                    return (
                      <td
                        key={colTag.id}
                        className={`relative p-0 text-center ${
                          isClickable ? 'cursor-pointer' : ''
                        }`}
                        onMouseEnter={() => setHoveredCell({ i, j })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => isClickable && handleCellClick(i, j)}
                        title={
                          isDiagonal
                            ? `${rowTag.name} (self)`
                            : `${rowTag.name} + ${colTag.name}: ${count} co-occurrence${count !== 1 ? 's' : ''}`
                        }
                      >
                        <div
                          className={`flex h-12 w-full items-center justify-center text-xs font-medium transition-all ${
                            isDiagonal
                              ? 'bg-gray-100 dark:bg-gray-700/50'
                              : isHovered && isClickable
                              ? 'ring-2 ring-inset ring-brand-400'
                              : ''
                          }`}
                          style={
                            isDiagonal
                              ? undefined
                              : {
                                  backgroundColor: count > 0
                                    ? `rgba(30, 64, 175, ${opacity})`
                                    : undefined,
                                  color: count > 0 && opacity > 0.5 ? '#ffffff' : undefined,
                                }
                          }
                        >
                          {isDiagonal ? (
                            <span className="text-gray-400 dark:text-gray-500">&mdash;</span>
                          ) : count > 0 ? (
                            count
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">0</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tooltip bar */}
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2 flex items-center justify-between min-h-[40px]">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {tooltipText || 'Hover over a cell to see details. Click a non-zero cell to view passages.'}
          </p>
          <IntensityLegend maxCount={maxCount} />
        </div>
      </div>

      {/* Level explanation */}
      <p className="text-xs text-gray-400 dark:text-gray-500 italic">
        {level === 'response'
          ? 'Response level: two themes co-occur when both are coded anywhere within the same narrative response.'
          : 'Passage level: two themes co-occur only when their highlighted text ranges physically overlap within a response.'}
      </p>

      {/* Drilldown Modal */}
      {drilldown && (
        <CooccurrenceDrilldown
          tag1={drilldown.tag1}
          tag2={drilldown.tag2}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}
