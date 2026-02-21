import { useCallback, useRef, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useCanvasStore } from '../../../stores/canvasStore';
import CodingStripesOverlay from '../panels/CodingStripesOverlay';
import type { CanvasTextCoding, CanvasQuestion, CanvasCase } from '@wiseshift/shared';

export interface TranscriptNodeData {
  transcriptId: string;
  title: string;
  content: string;
  caseId?: string | null;
  [key: string]: unknown;
}

// Compute overlapping highlight segments from codings
function computeOverlappingSegments(
  text: string,
  codings: CanvasTextCoding[],
  colorMap: Map<string, string>,
) {
  if (codings.length === 0) return [{ start: 0, end: text.length, questionColors: [] as string[] }];

  // Collect all boundary points
  const boundaries = new Set<number>();
  boundaries.add(0);
  boundaries.add(text.length);
  for (const c of codings) {
    const start = Math.max(0, Math.min(c.startOffset, text.length));
    const end = Math.max(0, Math.min(c.endOffset, text.length));
    boundaries.add(start);
    boundaries.add(end);
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const segments: { start: number; end: number; questionColors: string[] }[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start >= end) continue;

    // Find which codings cover this segment
    const colors: string[] = [];
    for (const c of codings) {
      const cStart = Math.max(0, Math.min(c.startOffset, text.length));
      const cEnd = Math.max(0, Math.min(c.endOffset, text.length));
      if (cStart <= start && cEnd >= end) {
        const color = colorMap.get(c.questionId) || '#3B82F6';
        if (!colors.includes(color)) colors.push(color);
      }
    }

    segments.push({ start, end, questionColors: colors });
  }

  return segments;
}

function HighlightedTranscript({
  text,
  codings,
  questions,
}: {
  text: string;
  codings: CanvasTextCoding[];
  questions: { id: string; color: string }[];
}) {
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    questions.forEach(q => map.set(q.id, q.color));
    return map;
  }, [questions]);

  const segments = useMemo(
    () => computeOverlappingSegments(text, codings, colorMap),
    [text, codings, colorMap],
  );

  return (
    <>
      {segments.map((seg, i) => {
        const slice = text.slice(seg.start, seg.end);
        if (seg.questionColors.length === 0) {
          return <span key={i}>{slice}</span>;
        }

        // Layer multiple background colors with reduced opacity
        const layerCount = seg.questionColors.length;
        const opacity = Math.max(0.12, 0.3 / layerCount);

        return (
          <span
            key={i}
            className="rounded-sm relative"
            title={`Coded by ${layerCount} question${layerCount > 1 ? 's' : ''}`}
          >
            {/* Background layers */}
            {seg.questionColors.map((color, ci) => (
              <span
                key={ci}
                className="absolute inset-0 rounded-sm"
                style={{
                  backgroundColor: color,
                  opacity: opacity,
                  zIndex: ci,
                }}
              />
            ))}
            <span className="relative" style={{ zIndex: layerCount }}>
              {slice}
            </span>
          </span>
        );
      })}
    </>
  );
}

export default function TranscriptNode({ data, id }: NodeProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const { activeCanvas, pendingSelection, setPendingSelection, deleteTranscript, showCodingStripes } = useCanvasStore();
  const nodeData = data as unknown as TranscriptNodeData;

  const codings = useMemo(
    () => (activeCanvas?.codings ?? []).filter((c: CanvasTextCoding) => c.transcriptId === nodeData.transcriptId),
    [activeCanvas?.codings, nodeData.transcriptId],
  );

  const questions = useMemo(
    () => (activeCanvas?.questions ?? []).map((q: CanvasQuestion) => ({ id: q.id, color: q.color })),
    [activeCanvas?.questions],
  );

  const transcript = useMemo(
    () => activeCanvas?.transcripts.find(t => t.id === nodeData.transcriptId),
    [activeCanvas?.transcripts, nodeData.transcriptId],
  );

  const caseName = useMemo(() => {
    const caseId = transcript?.caseId;
    if (!caseId) return null;
    return activeCanvas?.cases?.find((c: CanvasCase) => c.id === caseId)?.name;
  }, [transcript?.caseId, activeCanvas?.cases]);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !textRef.current) {
      return;
    }

    const selText = sel.toString().trim();
    if (!selText) return;

    // Calculate offsets relative to the raw content
    const raw = nodeData.content;
    const startIdx = raw.indexOf(selText);
    if (startIdx === -1) return;

    setPendingSelection({
      transcriptId: nodeData.transcriptId,
      startOffset: startIdx,
      endOffset: startIdx + selText.length,
      codedText: selText,
    });
  }, [nodeData.content, nodeData.transcriptId, setPendingSelection]);

  const hasSelection = pendingSelection?.transcriptId === nodeData.transcriptId;

  return (
    <div className="w-[400px] rounded-lg border border-blue-200 bg-white shadow-md dark:border-blue-800 dark:bg-gray-800">
      {/* Drag handle header */}
      <div className="drag-handle flex items-center justify-between rounded-t-lg bg-blue-50 px-3 py-2 cursor-grab dark:bg-blue-900/30">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200 truncate">{nodeData.title}</span>
          {caseName && (
            <span className="shrink-0 rounded-full bg-teal-100 px-1.5 py-0.5 text-[9px] font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
              {caseName}
            </span>
          )}
        </div>
        <button
          onClick={() => deleteTranscript(nodeData.transcriptId)}
          className="rounded p-0.5 text-blue-400 hover:bg-blue-100 hover:text-red-600 dark:hover:bg-blue-800 dark:hover:text-red-400"
          title="Delete transcript"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable text body with optional coding stripes */}
      <div className="relative">
        {showCodingStripes && codings.length > 0 && (
          <CodingStripesOverlay
            contentLength={nodeData.content.length}
            codings={codings}
            questions={questions}
            containerHeight={300}
          />
        )}
        <div
          ref={textRef}
          className="nodrag nowheel max-h-[300px] overflow-y-auto px-3 py-2"
          style={showCodingStripes && codings.length > 0 ? { paddingLeft: `${([...new Set(codings.map(c => c.questionId))].length * 6) + 12}px` } : undefined}
          onMouseUp={handleMouseUp}
        >
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 dark:text-gray-300 select-text">
            <HighlightedTranscript text={nodeData.content} codings={codings} questions={questions} />
          </p>
        </div>
      </div>

      {/* Coding count footer */}
      {codings.length > 0 && (
        <div className="border-t border-blue-100 px-3 py-1.5 dark:border-blue-800">
          <span className="text-[10px] text-blue-500 dark:text-blue-400">
            {codings.length} coded segment{codings.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Source handle — visible when there's a pending selection */}
      <Handle
        type="source"
        position={Position.Right}
        id={`transcript-source-${id}`}
        className={`!h-4 !w-4 !border-2 !border-blue-500 transition-opacity ${hasSelection ? '!bg-blue-500 opacity-100' : '!bg-blue-200 opacity-50'}`}
        style={{ top: '50%' }}
      />
    </div>
  );
}
