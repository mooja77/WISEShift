import { useMemo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { CanvasTextCoding, CanvasQuestion } from '@wiseshift/shared';

export interface QuestionNodeData {
  questionId: string;
  text: string;
  color: string;
  [key: string]: unknown;
}

export default function QuestionNode({ data, id }: NodeProps) {
  const nodeData = data as unknown as QuestionNodeData;
  const { activeCanvas, deleteQuestion, updateQuestion, setSelectedQuestionId, selectedQuestionId } = useCanvasStore();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(nodeData.text);

  const codingCount = useMemo(
    () => (activeCanvas?.codings ?? []).filter((c: CanvasTextCoding) => c.questionId === nodeData.questionId).length,
    [activeCanvas?.codings, nodeData.questionId],
  );

  const question = useMemo(
    () => activeCanvas?.questions.find((q: CanvasQuestion) => q.id === nodeData.questionId),
    [activeCanvas?.questions, nodeData.questionId],
  );

  const parentQuestion = useMemo(() => {
    if (!question?.parentQuestionId) return null;
    return activeCanvas?.questions.find((q: CanvasQuestion) => q.id === question.parentQuestionId);
  }, [question?.parentQuestionId, activeCanvas?.questions]);

  const childCount = useMemo(
    () => (activeCanvas?.questions ?? []).filter((q: CanvasQuestion) => q.parentQuestionId === nodeData.questionId).length,
    [activeCanvas?.questions, nodeData.questionId],
  );

  const isSelected = selectedQuestionId === nodeData.questionId;

  const handleSaveEdit = () => {
    if (editText.trim() && editText.trim() !== nodeData.text) {
      updateQuestion(nodeData.questionId, { text: editText.trim() });
    }
    setEditing(false);
  };

  return (
    <div
      className={`w-[280px] rounded-lg border-2 shadow-md transition-shadow ${isSelected ? 'ring-2 ring-offset-2' : ''}`}
      style={{
        borderColor: nodeData.color,
        ...(isSelected ? { ringColor: nodeData.color } : {}),
      }}
    >
      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Left}
        id={`question-target-${id}`}
        className="!h-4 !w-4 !border-2"
        style={{ borderColor: nodeData.color, backgroundColor: nodeData.color, top: '50%' }}
      />
      {/* Source handle for relations */}
      <Handle
        type="source"
        position={Position.Right}
        id={`question-source-${id}`}
        className="!h-3 !w-3 !border-2"
        style={{ borderColor: nodeData.color, backgroundColor: nodeData.color, top: '50%' }}
      />

      {/* Drag handle header */}
      <div
        className="drag-handle flex items-center justify-between rounded-t-md px-3 py-2 cursor-grab"
        style={{ backgroundColor: `${nodeData.color}15` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: nodeData.color }} />
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
            Research Question
          </span>
          {childCount > 0 && (
            <span className="rounded-full bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 text-[9px] font-medium text-gray-600 dark:text-gray-300">
              {childCount} child{childCount !== 1 ? 'ren' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedQuestionId(isSelected ? null : nodeData.questionId)}
            className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="View coded segments"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          <button
            onClick={() => deleteQuestion(nodeData.questionId)}
            className="rounded p-0.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            title="Delete question"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Question body */}
      <div className="bg-white px-3 py-2 dark:bg-gray-800 rounded-b-md">
        {/* Parent breadcrumb */}
        {parentQuestion && (
          <div className="flex items-center gap-1 mb-1.5 text-[10px] text-gray-400">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: parentQuestion.color }} />
            <span className="truncate">{parentQuestion.text}</span>
            <span>{'>'}</span>
          </div>
        )}

        {editing ? (
          <div className="nodrag">
            <textarea
              className="input text-sm w-full resize-none"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } }}
              rows={3}
              autoFocus
            />
          </div>
        ) : (
          <p
            className="text-sm text-gray-800 dark:text-gray-200 cursor-text nodrag"
            onDoubleClick={() => { setEditText(nodeData.text); setEditing(true); }}
            title="Double-click to edit"
          >
            {nodeData.text}
          </p>
        )}

        {/* Coding count */}
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
            style={{ backgroundColor: nodeData.color }}
          >
            {codingCount} coding{codingCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
