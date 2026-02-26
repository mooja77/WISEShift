import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  type Node,
  type Edge,
  type OnConnect,
  type NodeTypes,
  type EdgeTypes,
  type NodeProps,
  type EdgeProps,
  Handle,
  Position,
  getBezierPath,
  EdgeLabelRenderer,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';

// ─── Relationship label suggestions ───
const LABEL_SUGGESTIONS = ['causes', 'enables', 'contradicts', 'part of', 'leads to', 'influences', 'requires', 'supports'];

// ─── Types for tag dropdown ───
interface TagOption {
  id: string;
  name: string;
  color: string;
  highlightCount: number;
}

// ═══════════════════════════════════════════════════════════
// ─── Custom Node: ThemeNode ──────────────────────────────
// ═══════════════════════════════════════════════════════════

type ThemeNodeData = {
  label: string;
  tagId?: string;
  color?: string;
  highlightCount?: number;
};

const ThemeNode = memo(({ data, selected }: NodeProps<Node<ThemeNodeData>>) => {
  const color = data.color || '#6366F1';

  return (
    <div
      className={`min-w-[120px] rounded-lg border bg-white shadow-sm dark:bg-gray-800 ${
        selected
          ? 'border-brand-500 ring-2 ring-brand-300 dark:ring-brand-600'
          : 'border-gray-200 dark:border-gray-700'
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-gray-400 dark:!border-gray-800 dark:!bg-gray-500" />
      <div className="px-3 py-2">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.label}</div>
        {data.highlightCount !== undefined && data.highlightCount > 0 && (
          <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {data.highlightCount} highlight{data.highlightCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-gray-400 dark:!border-gray-800 dark:!bg-gray-500" />
    </div>
  );
});
ThemeNode.displayName = 'ThemeNode';

// ═══════════════════════════════════════════════════════════
// ─── Custom Node: MemoNode ───────────────────────────────
// ═══════════════════════════════════════════════════════════

type MemoNodeData = {
  label: string;
  content?: string;
};

const MemoNode = memo(({ data, selected, id }: NodeProps<Node<MemoNodeData>>) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.content || data.label);
  const { setNodes } = useReactFlow();

  const handleDoubleClick = () => setEditing(true);

  const handleBlur = () => {
    setEditing(false);
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, label: text, content: text } } : n
      )
    );
  };

  return (
    <div
      className={`max-w-[200px] rounded-lg border bg-amber-50 shadow-sm dark:bg-amber-900/30 ${
        selected
          ? 'border-brand-500 ring-2 ring-brand-300 dark:ring-brand-600'
          : 'border-amber-200 dark:border-amber-700'
      }`}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-amber-50 !bg-amber-400 dark:!border-amber-900 dark:!bg-amber-500" />
      <div className="px-3 py-2">
        {editing ? (
          <textarea
            className="w-full resize-none rounded border border-amber-300 bg-amber-50 p-1 text-xs text-gray-800 focus:outline-none dark:border-amber-600 dark:bg-amber-900/50 dark:text-gray-200"
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            rows={3}
          />
        ) : (
          <p className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
            {text || 'Double-click to edit...'}
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-amber-50 !bg-amber-400 dark:!border-amber-900 dark:!bg-amber-500" />
    </div>
  );
});
MemoNode.displayName = 'MemoNode';

// ═══════════════════════════════════════════════════════════
// ─── Custom Edge: RelationshipEdge ───────────────────────
// ═══════════════════════════════════════════════════════════

type RelationshipEdgeData = {
  label?: string;
  style?: 'solid' | 'dashed' | 'thick';
};

function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<Edge<RelationshipEdgeData>>) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data?.label || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeStyle = data?.style || 'solid';
  const strokeWidth = edgeStyle === 'thick' ? 3 : 1.5;
  const strokeDasharray = edgeStyle === 'dashed' ? '6 3' : undefined;

  const handleLabelDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setShowSuggestions(true);
  };

  const commitLabel = (newLabel: string) => {
    setLabel(newLabel);
    setEditing(false);
    setShowSuggestions(false);
    setEdges(eds =>
      eds.map(e =>
        e.id === id ? { ...e, data: { ...e.data, label: newLabel } } : e
      )
    );
  };

  const handleBlur = () => {
    commitLabel(label);
  };

  return (
    <>
      <path
        id={id}
        className={`react-flow__edge-path ${selected ? 'stroke-brand-500' : 'stroke-gray-400 dark:stroke-gray-500'}`}
        d={edgePath}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        fill="none"
        markerEnd="url(#arrowhead)"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
          onDoubleClick={handleLabelDoubleClick}
        >
          {editing ? (
            <div className="relative">
              <input
                className="w-24 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-800 shadow-sm focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                value={label}
                onChange={e => setLabel(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitLabel(label);
                  if (e.key === 'Escape') { setEditing(false); setShowSuggestions(false); }
                }}
                autoFocus
              />
              {showSuggestions && (
                <div className="absolute left-0 top-full z-50 mt-1 w-28 rounded border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {LABEL_SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      className="block w-full px-2 py-1 text-left text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      onMouseDown={e => { e.preventDefault(); commitLabel(s); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            label && (
              <span className="cursor-pointer rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-gray-600 shadow-sm dark:bg-gray-800/90 dark:text-gray-400">
                {label}
              </span>
            )
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── Inner Flow Component (needs ReactFlowProvider above) ─
// ═══════════════════════════════════════════════════════════

const nodeTypes: NodeTypes = { theme: ThemeNode, memo: MemoNode } as NodeTypes;
const edgeTypes: EdgeTypes = { relationship: RelationshipEdge } as EdgeTypes;

function ConceptMapInner() {
  // ─── State ───
  const [maps, setMaps] = useState<ConceptMapData[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<TagOption[]>([]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showNewMapInput, setShowNewMapInput] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const { getViewport } = useReactFlow();

  // ─── Derived active map ───
  const activeMap = useMemo(
    () => maps.find(m => m.id === activeMapId) || null,
    [maps, activeMapId]
  );

  // ─── Fetch maps + tags on mount ───
  const fetchMaps = useCallback(async () => {
    try {
      const res = await researchApi.getConceptMaps();
      const data: ConceptMapData[] = res.data.data;
      setMaps(data);
      if (data.length > 0 && !activeMapId) {
        setActiveMapId(data[0].id);
      }
    } catch {
      toast.error('Failed to load concept maps');
    } finally {
      setLoading(false);
    }
  }, [activeMapId]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await researchApi.getTags();
      const data = res.data.data || res.data;
      setTags(
        (Array.isArray(data) ? data : []).map((t: any) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          highlightCount: t._count?.highlights ?? t.highlightCount ?? 0,
        }))
      );
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchMaps();
    fetchTags();
  }, [fetchMaps, fetchTags]);

  // ─── Load nodes/edges when activeMap changes ───
  useEffect(() => {
    if (!activeMap) {
      setNodes([]);
      setEdges([]);
      lastSavedRef.current = '';
      return;
    }
    const rfNodes: Node[] = activeMap.nodes.map((n: ConceptMapNode) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    }));
    const rfEdges: Edge[] = activeMap.edges.map((e: ConceptMapEdge) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'relationship',
      data: { label: e.label || '', style: e.style || 'solid' },
    }));
    setNodes(rfNodes);
    setEdges(rfEdges);
    lastSavedRef.current = JSON.stringify({ nodes: activeMap.nodes, edges: activeMap.edges });
  }, [activeMap, setNodes, setEdges]);

  // ─── Debounced auto-save ───
  const triggerSave = useCallback(() => {
    if (!activeMapId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      // Convert current ReactFlow state to storage format
      const storageNodes: ConceptMapNode[] = nodes.map(n => ({
        id: n.id,
        type: (n.type as 'theme' | 'memo') || 'theme',
        position: n.position,
        data: n.data as ConceptMapNode['data'],
      }));
      const storageEdges: ConceptMapEdge[] = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: (e.data as any)?.label || '',
        style: (e.data as any)?.style || 'solid',
      }));

      const snapshot = JSON.stringify({ nodes: storageNodes, edges: storageEdges });
      if (snapshot === lastSavedRef.current) return;

      setSavingStatus('saving');
      try {
        const viewport = getViewport();
        await researchApi.updateConceptMap(activeMapId, {
          nodes: storageNodes,
          edges: storageEdges,
          viewport,
        });
        lastSavedRef.current = snapshot;
        // Update local maps cache
        setMaps(prev =>
          prev.map(m =>
            m.id === activeMapId
              ? { ...m, nodes: storageNodes, edges: storageEdges, updatedAt: new Date().toISOString() }
              : m
          )
        );
        setSavingStatus('saved');
        setTimeout(() => setSavingStatus('idle'), 2000);
      } catch {
        toast.error('Failed to save map');
        setSavingStatus('idle');
      }
    }, 2000);
  }, [activeMapId, nodes, edges, getViewport]);

  // Trigger save when nodes or edges change
  useEffect(() => {
    if (activeMapId && nodes.length + edges.length > 0) {
      triggerSave();
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [nodes, edges, activeMapId, triggerSave]);

  // ─── Handlers ───
  const onConnect: OnConnect = useCallback(
    (params) => {
      const newEdge: Edge = {
        ...params,
        id: `edge-${Date.now()}`,
        type: 'relationship',
        data: { label: '', style: 'solid' },
      } as Edge;
      setEdges(eds => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const handleCreateMap = async () => {
    if (!newMapName.trim()) return;
    try {
      const res = await researchApi.createConceptMap(newMapName.trim());
      const created = res.data.data;
      setMaps(prev => [created, ...prev]);
      setActiveMapId(created.id);
      setNewMapName('');
      setShowNewMapInput(false);
      toast.success('Map created');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to create map';
      toast.error(msg);
    }
  };

  const handleDeleteMap = async () => {
    if (!deleteTarget) return;
    try {
      await researchApi.deleteConceptMap(deleteTarget);
      setMaps(prev => prev.filter(m => m.id !== deleteTarget));
      if (activeMapId === deleteTarget) {
        const remaining = maps.filter(m => m.id !== deleteTarget);
        setActiveMapId(remaining.length > 0 ? remaining[0].id : null);
      }
      setDeleteTarget(null);
      toast.success('Map deleted');
    } catch {
      toast.error('Failed to delete map');
    }
  };

  const handleAutoGenerate = async () => {
    try {
      const res = await researchApi.autoGenerateConceptMap();
      const { nodes: genNodes, edges: genEdges } = res.data.data;

      if (!activeMapId) {
        // Create a new map first
        const createRes = await researchApi.createConceptMap('Auto-generated map');
        const created = createRes.data.data;
        setMaps(prev => [{ ...created, nodes: genNodes, edges: genEdges }, ...prev]);
        setActiveMapId(created.id);
      }

      const rfNodes: Node[] = genNodes.map((n: ConceptMapNode) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      }));
      const rfEdges: Edge[] = genEdges.map((e: ConceptMapEdge) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'relationship',
        data: { label: e.label || '', style: e.style || 'solid' },
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
      toast.success(`Generated ${rfNodes.length} themes and ${rfEdges.length} connections`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to auto-generate map';
      toast.error(msg);
    }
  };

  const handleStartFromScratch = async () => {
    try {
      const res = await researchApi.createConceptMap('Untitled map');
      const created = res.data.data;
      setMaps(prev => [created, ...prev]);
      setActiveMapId(created.id);
      toast.success('New map created');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to create map';
      toast.error(msg);
    }
  };

  const handleAddTheme = (tag: TagOption) => {
    // Check if this tag is already on the canvas
    const exists = nodes.some(n => n.data?.tagId === tag.id);
    if (exists) {
      toast.error(`"${tag.name}" is already on the canvas`);
      setShowTagDropdown(false);
      return;
    }

    const viewport = getViewport();
    const centerX = (-viewport.x + 400) / viewport.zoom;
    const centerY = (-viewport.y + 300) / viewport.zoom;

    const newNode: Node = {
      id: `theme-${tag.id}`,
      type: 'theme',
      position: { x: centerX + Math.random() * 50 - 25, y: centerY + Math.random() * 50 - 25 },
      data: {
        label: tag.name,
        tagId: tag.id,
        color: tag.color,
        highlightCount: tag.highlightCount,
      },
    };
    setNodes(nds => [...nds, newNode]);
    setShowTagDropdown(false);
  };

  const handleAddMemo = () => {
    const viewport = getViewport();
    const centerX = (-viewport.x + 400) / viewport.zoom;
    const centerY = (-viewport.y + 300) / viewport.zoom;

    const newNode: Node = {
      id: `memo-${Date.now()}`,
      type: 'memo',
      position: { x: centerX, y: centerY },
      data: {
        label: 'New memo',
        content: '',
      },
    };
    setNodes(nds => [...nds, newNode]);
  };

  const handleManualSave = async () => {
    if (!activeMapId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    const storageNodes: ConceptMapNode[] = nodes.map(n => ({
      id: n.id,
      type: (n.type as 'theme' | 'memo') || 'theme',
      position: n.position,
      data: n.data as ConceptMapNode['data'],
    }));
    const storageEdges: ConceptMapEdge[] = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: (e.data as any)?.label || '',
      style: (e.data as any)?.style || 'solid',
    }));

    setSavingStatus('saving');
    try {
      const viewport = getViewport();
      await researchApi.updateConceptMap(activeMapId, {
        nodes: storageNodes,
        edges: storageEdges,
        viewport,
      });
      lastSavedRef.current = JSON.stringify({ nodes: storageNodes, edges: storageEdges });
      setMaps(prev =>
        prev.map(m =>
          m.id === activeMapId
            ? { ...m, nodes: storageNodes, edges: storageEdges, updatedAt: new Date().toISOString() }
            : m
        )
      );
      setSavingStatus('saved');
      toast.success('Map saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch {
      toast.error('Failed to save map');
      setSavingStatus('idle');
    }
  };

  const handleExportPng = () => {
    const flowEl = document.querySelector('.react-flow') as HTMLElement | null;
    if (!flowEl) return;

    // Use the built-in approach: grab the SVG viewport
    const svgEl = flowEl.querySelector('.react-flow__viewport') as SVGElement | null;
    if (!svgEl) {
      toast.error('Could not find canvas element for export');
      return;
    }

    // Create a canvas from the SVG
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 1200;
      canvas.height = img.height || 800;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          if (blob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `concept-map-${activeMap?.name || 'export'}.png`;
            a.click();
            URL.revokeObjectURL(a.href);
          }
        }, 'image/png');
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      toast.error('PNG export failed');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleDeleteKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.filter(n => n.selected);
        const selectedEdges = edges.filter(e => e.selected);
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
          setNodes(nds => nds.filter(n => !n.selected));
          setEdges(eds =>
            eds.filter(
              e => !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)
            )
          );
        }
      }
    },
    [nodes, edges, setNodes, setEdges]
  );

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  // ─── Empty state: no maps exist ───
  if (maps.length === 0 && !showNewMapInput) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
            <svg className="h-8 w-8 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Start building your theory map
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Connect your themes to visualise how they relate to each other.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleAutoGenerate}
              className="btn-primary"
            >
              Auto-generate from my themes
            </button>
            <button
              onClick={handleStartFromScratch}
              className="btn-secondary"
            >
              Start from scratch
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main canvas view ───
  return (
    <div className="relative h-[calc(100vh-280px)] min-h-[500px] w-full rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" onKeyDown={handleDeleteKeyDown} tabIndex={0}>
      {/* SVG defs for arrow markers */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
          </marker>
        </defs>
      </svg>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'relationship' }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="dark:bg-gray-900"
        deleteKeyCode={null}
      >
        {/* ─── Top panel: Map selector + toolbar ─── */}
        <Panel position="top-center" className="!m-0 !p-0">
          <div className="flex items-center gap-2 rounded-b-lg border border-t-0 border-gray-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
            {/* Map selector */}
            <select
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              value={activeMapId || ''}
              onChange={e => setActiveMapId(e.target.value || null)}
            >
              {maps.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* New map */}
            {showNewMapInput ? (
              <div className="flex items-center gap-1">
                <input
                  className="w-32 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  placeholder="Map name..."
                  value={newMapName}
                  onChange={e => setNewMapName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateMap(); if (e.key === 'Escape') setShowNewMapInput(false); }}
                  autoFocus
                />
                <button onClick={handleCreateMap} className="rounded bg-brand-600 px-2 py-1 text-xs text-white hover:bg-brand-700">
                  Create
                </button>
                <button onClick={() => setShowNewMapInput(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewMapInput(true)}
                className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                title="New Map"
              >
                + New
              </button>
            )}

            <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" />

            {/* Add theme node */}
            <div className="relative">
              <button
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                title="Add theme node"
              >
                + Theme
              </button>
              {showTagDropdown && (
                <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {tags.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-500">No tags found. Create tags in the Explorer tab first.</p>
                  ) : (
                    tags.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleAddTheme(t)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                        <span className="truncate">{t.name}</span>
                        <span className="ml-auto text-xs text-gray-400">{t.highlightCount}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Add memo node */}
            <button
              onClick={handleAddMemo}
              className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
              title="Add memo sticky note"
            >
              + Memo
            </button>

            <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" />

            {/* Auto-generate */}
            <button
              onClick={handleAutoGenerate}
              className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              title="Auto-generate from theme co-occurrences"
            >
              Auto-layout
            </button>

            {/* Save */}
            <button
              onClick={handleManualSave}
              className="rounded bg-brand-100 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-900/60"
              title="Save map"
            >
              {savingStatus === 'saving' ? 'Saving...' : savingStatus === 'saved' ? 'Saved' : 'Save'}
            </button>

            {/* Export PNG */}
            <button
              onClick={handleExportPng}
              className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              title="Export as PNG"
            >
              PNG
            </button>

            {/* Delete map */}
            {activeMapId && (
              <button
                onClick={() => setDeleteTarget(activeMapId)}
                className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
                title="Delete this map"
              >
                Delete
              </button>
            )}
          </div>
        </Panel>

        <Controls className="!bottom-4 !left-4" />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="dark:!bg-gray-900" />
        <MiniMap
          className="!bottom-4 !right-4"
          nodeColor={(n) => {
            if (n.type === 'memo') return '#fbbf24';
            return (n.data as any)?.color || '#6366f1';
          }}
          maskColor="rgba(0,0,0,0.1)"
        />
      </ReactFlow>

      {/* Close tag dropdown when clicking elsewhere */}
      {showTagDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowTagDropdown(false)} />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete concept map"
        message="Are you sure you want to delete this concept map? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteMap}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── Wrapper with ReactFlowProvider ──────────────────────
// ═══════════════════════════════════════════════════════════

export default function ConceptMapView() {
  return (
    <ReactFlowProvider>
      <ConceptMapInner />
    </ReactFlowProvider>
  );
}
