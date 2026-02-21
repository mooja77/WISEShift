import { useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useCanvasStore } from '../../../stores/canvasStore';

export interface MemoNodeData {
  memoId: string;
  title?: string;
  content: string;
  color: string;
  [key: string]: unknown;
}

export default function MemoNode({ data }: NodeProps) {
  const nodeData = data as unknown as MemoNodeData;
  const { updateMemo, deleteMemo } = useCanvasStore();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(nodeData.content);

  const handleSave = () => {
    if (editContent.trim() !== nodeData.content) {
      updateMemo(nodeData.memoId, { content: editContent.trim() });
    }
    setEditing(false);
  };

  return (
    <div
      className="w-[220px] rounded-lg shadow-md"
      style={{ backgroundColor: nodeData.color }}
    >
      {/* Drag handle */}
      <div className="drag-handle flex items-center justify-between px-3 py-1.5 cursor-grab">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-600/70">
          {nodeData.title || 'Memo'}
        </span>
        <button
          onClick={() => deleteMemo(nodeData.memoId)}
          className="rounded p-0.5 text-gray-500/50 hover:text-red-600"
          title="Delete memo"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Memo body */}
      <div className="px-3 pb-3">
        {editing ? (
          <div className="nodrag">
            <textarea
              className="w-full resize-none rounded border border-gray-300/50 bg-white/50 p-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onBlur={handleSave}
              rows={4}
              autoFocus
            />
          </div>
        ) : (
          <p
            className="whitespace-pre-wrap text-xs text-gray-700 cursor-text nodrag"
            onDoubleClick={() => { setEditContent(nodeData.content); setEditing(true); }}
            title="Double-click to edit"
          >
            {nodeData.content}
          </p>
        )}
      </div>
    </div>
  );
}
