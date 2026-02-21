import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnConnect,
  type NodeChange,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TranscriptNode from './nodes/TranscriptNode';
import QuestionNode from './nodes/QuestionNode';
import MemoNode from './nodes/MemoNode';
import CaseNode from './nodes/CaseNode';
import SearchResultNode from './nodes/SearchResultNode';
import CooccurrenceNode from './nodes/CooccurrenceNode';
import MatrixNode from './nodes/MatrixNode';
import StatsNode from './nodes/StatsNode';
import ComparisonNode from './nodes/ComparisonNode';
import WordCloudNode from './nodes/WordCloudNode';
import ClusterNode from './nodes/ClusterNode';
import CodingEdge from './edges/CodingEdge';
import RelationEdge from './edges/RelationEdge';
import CanvasToolbar from './panels/CanvasToolbar';
import CodingDetailPanel from './panels/CodingDetailPanel';
import { useCanvasStore } from '../../stores/canvasStore';
import type {
  CanvasTranscript,
  CanvasQuestion,
  CanvasMemo,
  CanvasTextCoding,
  CanvasNodePosition,
  CanvasCase,
  CanvasRelation,
  CanvasComputedNode,
} from '@wiseshift/shared';
import toast from 'react-hot-toast';

const nodeTypes = {
  transcript: TranscriptNode,
  question: QuestionNode,
  memo: MemoNode,
  case: CaseNode,
  search: SearchResultNode,
  cooccurrence: CooccurrenceNode,
  matrix: MatrixNode,
  stats: StatsNode,
  comparison: ComparisonNode,
  wordcloud: WordCloudNode,
  cluster: ClusterNode,
};

const edgeTypes = {
  coding: CodingEdge,
  relation: RelationEdge,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export default function CanvasWorkspace() {
  const {
    activeCanvas,
    pendingSelection,
    setPendingSelection,
    createCoding,
    saveLayout,
    selectedQuestionId,
    addRelation,
  } = useCanvasStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [relationLabel, setRelationLabel] = useState<{ show: boolean; source: string; target: string }>({ show: false, source: '', target: '' });

  // Build nodes from canvas data
  const buildNodes = useCallback((): Node[] => {
    if (!activeCanvas) return [];
    const posMap = new Map<string, { x: number; y: number }>();
    activeCanvas.nodePositions.forEach((p: CanvasNodePosition) => posMap.set(p.nodeId, { x: p.x, y: p.y }));

    const result: Node[] = [];

    activeCanvas.transcripts.forEach((t: CanvasTranscript, i: number) => {
      const nodeId = `transcript-${t.id}`;
      const pos = posMap.get(nodeId) || { x: 50, y: 50 + i * 400 };
      result.push({
        id: nodeId,
        type: 'transcript',
        position: pos,
        dragHandle: '.drag-handle',
        data: {
          transcriptId: t.id,
          title: t.title,
          content: t.content,
          caseId: t.caseId,
        },
      });
    });

    activeCanvas.questions.forEach((q: CanvasQuestion, i: number) => {
      const nodeId = `question-${q.id}`;
      const pos = posMap.get(nodeId) || { x: 550, y: 50 + i * 200 };
      result.push({
        id: nodeId,
        type: 'question',
        position: pos,
        dragHandle: '.drag-handle',
        data: {
          questionId: q.id,
          text: q.text,
          color: q.color,
        },
      });
    });

    activeCanvas.memos.forEach((m: CanvasMemo, i: number) => {
      const nodeId = `memo-${m.id}`;
      const pos = posMap.get(nodeId) || { x: 900, y: 50 + i * 250 };
      result.push({
        id: nodeId,
        type: 'memo',
        position: pos,
        dragHandle: '.drag-handle',
        data: {
          memoId: m.id,
          title: m.title,
          content: m.content,
          color: m.color,
        },
      });
    });

    // Case nodes
    (activeCanvas.cases ?? []).forEach((c: CanvasCase, i: number) => {
      const nodeId = `case-${c.id}`;
      const pos = posMap.get(nodeId) || { x: -350, y: 50 + i * 250 };
      result.push({
        id: nodeId,
        type: 'case',
        position: pos,
        dragHandle: '.drag-handle',
        data: { caseId: c.id },
      });
    });

    // Computed nodes
    (activeCanvas.computedNodes ?? []).forEach((cn: CanvasComputedNode, i: number) => {
      const nodeId = `computed-${cn.id}`;
      const pos = posMap.get(nodeId) || { x: 1200, y: 50 + i * 350 };
      result.push({
        id: nodeId,
        type: cn.nodeType,
        position: pos,
        dragHandle: '.drag-handle',
        data: { computedNodeId: cn.id },
      });
    });

    return result;
  }, [activeCanvas]);

  // Build edges from codings and relations
  const buildEdges = useCallback((): Edge[] => {
    if (!activeCanvas) return [];
    const questionColorMap = new Map<string, string>();
    activeCanvas.questions.forEach((q: CanvasQuestion) => questionColorMap.set(q.id, q.color));

    const codingEdges: Edge[] = activeCanvas.codings.map((c: CanvasTextCoding) => ({
      id: `coding-${c.id}`,
      source: `transcript-${c.transcriptId}`,
      target: `question-${c.questionId}`,
      type: 'coding',
      data: {
        codingId: c.id,
        codedText: c.codedText,
        questionColor: questionColorMap.get(c.questionId) || '#3B82F6',
      },
    }));

    // Relation edges
    const relationEdges: Edge[] = (activeCanvas.relations ?? []).map((r: CanvasRelation) => ({
      id: `relation-${r.id}`,
      source: `${r.fromType}-${r.fromId}`,
      target: `${r.toType}-${r.toId}`,
      type: 'relation',
      data: {
        relationId: r.id,
        label: r.label,
      },
    }));

    return [...codingEdges, ...relationEdges];
  }, [activeCanvas]);

  // Sync when canvas data changes
  useEffect(() => {
    setNodes(buildNodes());
    setEdges(buildEdges());
  }, [activeCanvas, buildNodes, buildEdges, setNodes, setEdges]);

  // Handle connection: create coding or relation
  const onConnect: OnConnect = useCallback(
    async (connection) => {
      const sourceId = connection.source;
      const targetId = connection.target;

      if (!sourceId || !targetId) return;

      // Transcript -> Question: create coding
      if (sourceId.startsWith('transcript-') && targetId.startsWith('question-')) {
        if (!pendingSelection) {
          toast.error('Select text in the transcript first, then drag to a question');
          return;
        }

        const transcriptId = sourceId.replace('transcript-', '');
        const questionId = targetId.replace('question-', '');

        if (pendingSelection.transcriptId !== transcriptId) {
          toast.error('Selection is from a different transcript');
          setPendingSelection(null);
          return;
        }

        try {
          await createCoding(
            transcriptId,
            questionId,
            pendingSelection.startOffset,
            pendingSelection.endOffset,
            pendingSelection.codedText,
          );
          window.getSelection()?.removeAllRanges();
          toast.success('Text coded successfully');
        } catch {
          toast.error('Failed to create coding');
        }
        return;
      }

      // Case-to-Case, Question-to-Question, or Question-to-Case: create relation
      const validRelationSources = ['case-', 'question-'];
      const isValidSource = validRelationSources.some(prefix => sourceId.startsWith(prefix));
      const isValidTarget = validRelationSources.some(prefix => targetId.startsWith(prefix));

      if (isValidSource && isValidTarget) {
        setRelationLabel({ show: true, source: sourceId, target: targetId });
        return;
      }

      toast.error('Invalid connection. Drag from transcript to question, or between cases/questions.');
    },
    [pendingSelection, createCoding, setPendingSelection],
  );

  const handleCreateRelation = async (label: string) => {
    const { source, target } = relationLabel;
    const fromType = source.startsWith('case-') ? 'case' : 'question';
    const fromId = source.replace(/^(case|question)-/, '');
    const toType = target.startsWith('case-') ? 'case' : 'question';
    const toId = target.replace(/^(case|question)-/, '');

    try {
      await addRelation(fromType as 'case' | 'question', fromId, toType as 'case' | 'question', toId, label);
      toast.success('Relation created');
    } catch {
      toast.error('Failed to create relation');
    }
    setRelationLabel({ show: false, source: '', target: '' });
  };

  // Debounced layout save on node position change
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      // Check if any drag ended
      const hasDrag = changes.some(
        (c: NodeChange) => c.type === 'position' && 'dragging' in c && c.dragging === false,
      );
      if (hasDrag) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          setNodes((currentNodes: Node[]) => {
            const positions = currentNodes.map((n: Node) => ({
              id: '',
              canvasId: '',
              nodeId: n.id,
              nodeType: n.type || 'unknown',
              x: n.position.x,
              y: n.position.y,
            }));
            saveLayout(positions).catch(() => {});
            return currentNodes;
          });
        }, 500);
      }
    },
    [onNodesChange, saveLayout, setNodes],
  );

  // Minimap color
  const minimapColor = useCallback((node: Node) => {
    switch (node.type) {
      case 'transcript': return '#3B82F6';
      case 'question': return '#8B5CF6';
      case 'memo': return '#F59E0B';
      case 'case': return '#14B8A6';
      case 'search': return '#059669';
      case 'cooccurrence': return '#7C3AED';
      case 'matrix': return '#D97706';
      case 'stats': return '#3B82F6';
      case 'comparison': return '#EC4899';
      case 'wordcloud': return '#6366F1';
      case 'cluster': return '#14B8A6';
      default: return '#6B7280';
    }
  }, []);

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <CanvasToolbar />
        <div data-tour="canvas-flow-area" className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            className="bg-gray-50 dark:bg-gray-900"
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" />
            <Controls className="!bg-white !shadow-md dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700" />
            <MiniMap
              nodeColor={minimapColor}
              maskColor="rgba(0,0,0,0.1)"
              className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700"
            />
          </ReactFlow>

          {/* Empty state overlay */}
          {activeCanvas && activeCanvas.transcripts.length === 0 && activeCanvas.questions.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg text-gray-400 dark:text-gray-500">Empty canvas</p>
                <p className="mt-1 text-sm text-gray-300 dark:text-gray-600">
                  Add a transcript and research questions using the toolbar above
                </p>
              </div>
            </div>
          )}

          {/* Relation label prompt */}
          {relationLabel.show && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
              <RelationLabelPrompt
                onSubmit={handleCreateRelation}
                onCancel={() => setRelationLabel({ show: false, source: '', target: '' })}
              />
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedQuestionId && <CodingDetailPanel />}
    </div>
  );
}

// Small inline component for the relation label prompt
function RelationLabelPrompt({
  onSubmit,
  onCancel,
}: {
  onSubmit: (label: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const presets = ['influences', 'contradicts', 'supports', 'causes', 'is-part-of'];

  return (
    <div className="rounded-lg bg-white p-4 shadow-xl dark:bg-gray-800 w-72">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Relationship Label</h4>
      <div className="flex flex-wrap gap-1 mb-2">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => onSubmit(p)}
            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="input h-8 flex-1 text-xs"
          placeholder="Custom label..."
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && label.trim()) onSubmit(label.trim()); }}
          autoFocus
        />
        <button onClick={() => label.trim() && onSubmit(label.trim())} disabled={!label.trim()} className="btn-primary h-8 px-3 text-xs disabled:opacity-50">
          Add
        </button>
      </div>
      <button onClick={onCancel} className="mt-2 text-xs text-gray-400 hover:text-gray-600">Cancel</button>
    </div>
  );
}
