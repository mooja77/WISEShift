import { create } from 'zustand';
import type {
  CodingCanvas,
  CanvasDetail,
  CanvasTranscript,
  CanvasQuestion,
  CanvasMemo,
  CanvasTextCoding,
  CanvasNodePosition,
  CanvasCase,
  CanvasRelation,
  CanvasComputedNode,
  ComputedNodeType,
} from '@wiseshift/shared';
import { researchApi } from '../services/api';

interface PendingSelection {
  transcriptId: string;
  startOffset: number;
  endOffset: number;
  codedText: string;
}

interface CanvasState {
  // Canvas list
  canvases: (CodingCanvas & { _count?: { transcripts: number; questions: number; codings: number } })[];
  loading: boolean;
  error: string | null;

  // Active canvas
  activeCanvasId: string | null;
  activeCanvas: CanvasDetail | null;

  // Text selection for coding
  pendingSelection: PendingSelection | null;

  // Detail panel
  selectedQuestionId: string | null;

  // UI toggles
  showCodingStripes: boolean;

  // Actions
  fetchCanvases: () => Promise<void>;
  createCanvas: (name: string, description?: string) => Promise<CodingCanvas>;
  deleteCanvas: (id: string) => Promise<void>;
  openCanvas: (id: string) => Promise<void>;
  closeCanvas: () => void;
  refreshCanvas: () => Promise<void>;

  // Canvas item actions
  addTranscript: (title: string, content: string) => Promise<CanvasTranscript>;
  updateTranscript: (tid: string, data: { title?: string; content?: string; caseId?: string | null }) => Promise<void>;
  deleteTranscript: (tid: string) => Promise<void>;

  addQuestion: (text: string, color?: string) => Promise<CanvasQuestion>;
  updateQuestion: (qid: string, data: { text?: string; color?: string; parentQuestionId?: string | null }) => Promise<void>;
  deleteQuestion: (qid: string) => Promise<void>;

  addMemo: (content: string, title?: string, color?: string) => Promise<CanvasMemo>;
  updateMemo: (mid: string, data: { title?: string; content?: string; color?: string }) => Promise<void>;
  deleteMemo: (mid: string) => Promise<void>;

  // Coding
  setPendingSelection: (selection: PendingSelection | null) => void;
  createCoding: (transcriptId: string, questionId: string, startOffset: number, endOffset: number, codedText: string) => Promise<CanvasTextCoding>;
  deleteCoding: (codingId: string) => Promise<void>;
  updateCodingAnnotation: (codingId: string, annotation: string | null) => Promise<void>;

  // Layout
  saveLayout: (positions: CanvasNodePosition[]) => Promise<void>;

  // Detail panel
  setSelectedQuestionId: (id: string | null) => void;

  // Cases
  addCase: (name: string, attributes?: Record<string, string>) => Promise<CanvasCase>;
  updateCase: (caseId: string, data: { name?: string; attributes?: Record<string, string> }) => Promise<void>;
  deleteCase: (caseId: string) => Promise<void>;

  // Relations
  addRelation: (fromType: 'case' | 'question', fromId: string, toType: 'case' | 'question', toId: string, label: string) => Promise<CanvasRelation>;
  deleteRelation: (relId: string) => Promise<void>;

  // Computed Nodes
  addComputedNode: (nodeType: ComputedNodeType, label: string, config?: Record<string, unknown>) => Promise<CanvasComputedNode>;
  updateComputedNode: (nodeId: string, data: { label?: string; config?: Record<string, unknown> }) => Promise<void>;
  deleteComputedNode: (nodeId: string) => Promise<void>;
  runComputedNode: (nodeId: string) => Promise<CanvasComputedNode>;

  // Auto-Code
  autoCode: (questionId: string, pattern: string, mode: 'keyword' | 'regex', transcriptIds?: string[]) => Promise<{ created: number }>;

  // UI toggles
  toggleCodingStripes: () => void;
}

export const useCanvasStore = create<CanvasState>()((set, get) => ({
  canvases: [],
  loading: false,
  error: null,
  activeCanvasId: null,
  activeCanvas: null,
  pendingSelection: null,
  selectedQuestionId: null,
  showCodingStripes: false,

  fetchCanvases: async () => {
    set({ loading: true, error: null });
    try {
      const res = await researchApi.getCanvases();
      set({ canvases: res.data.data, loading: false });
    } catch {
      set({ error: 'Failed to load canvases', loading: false });
    }
  },

  createCanvas: async (name, description) => {
    const res = await researchApi.createCanvas({ name, description });
    const canvas = res.data.data;
    set(s => ({ canvases: [canvas, ...s.canvases] }));
    return canvas;
  },

  deleteCanvas: async (id) => {
    await researchApi.deleteCanvas(id);
    set(s => ({
      canvases: s.canvases.filter(c => c.id !== id),
      activeCanvasId: s.activeCanvasId === id ? null : s.activeCanvasId,
      activeCanvas: s.activeCanvasId === id ? null : s.activeCanvas,
    }));
  },

  openCanvas: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await researchApi.getCanvas(id);
      set({ activeCanvasId: id, activeCanvas: res.data.data, loading: false });
    } catch {
      set({ error: 'Failed to open canvas', loading: false });
    }
  },

  closeCanvas: () => {
    set({ activeCanvasId: null, activeCanvas: null, pendingSelection: null, selectedQuestionId: null });
  },

  refreshCanvas: async () => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    try {
      const res = await researchApi.getCanvas(activeCanvasId);
      set({ activeCanvas: res.data.data });
    } catch { /* silent */ }
  },

  addTranscript: async (title, content) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) throw new Error('No canvas open');
    const res = await researchApi.addTranscript(activeCanvasId, { title, content });
    const transcript = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, transcripts: [...s.activeCanvas.transcripts, transcript] }
        : null,
    }));
    return transcript;
  },

  updateTranscript: async (tid, data) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    const res = await researchApi.updateTranscript(activeCanvasId, tid, data);
    const updated = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, transcripts: s.activeCanvas.transcripts.map((t: CanvasTranscript) => t.id === tid ? { ...t, ...updated } : t) }
        : null,
    }));
  },

  deleteTranscript: async (tid) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    await researchApi.deleteTranscript(activeCanvasId, tid);
    set(s => ({
      activeCanvas: s.activeCanvas
        ? {
            ...s.activeCanvas,
            transcripts: s.activeCanvas.transcripts.filter((t: CanvasTranscript) => t.id !== tid),
            codings: s.activeCanvas.codings.filter((c: CanvasTextCoding) => c.transcriptId !== tid),
          }
        : null,
    }));
  },

  addQuestion: async (text, color) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) throw new Error('No canvas open');
    const res = await researchApi.addQuestion(activeCanvasId, { text, color });
    const question = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, questions: [...s.activeCanvas.questions, question] }
        : null,
    }));
    return question;
  },

  updateQuestion: async (qid, data) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    const res = await researchApi.updateQuestion(activeCanvasId, qid, data);
    const updated = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, questions: s.activeCanvas.questions.map((q: CanvasQuestion) => q.id === qid ? { ...q, ...updated } : q) }
        : null,
    }));
  },

  deleteQuestion: async (qid) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    await researchApi.deleteQuestion(activeCanvasId, qid);
    set(s => ({
      activeCanvas: s.activeCanvas
        ? {
            ...s.activeCanvas,
            questions: s.activeCanvas.questions.filter((q: CanvasQuestion) => q.id !== qid),
            codings: s.activeCanvas.codings.filter((c: CanvasTextCoding) => c.questionId !== qid),
          }
        : null,
    }));
  },

  addMemo: async (content, title, color) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) throw new Error('No canvas open');
    const res = await researchApi.addMemo(activeCanvasId, { content, title, color });
    const memo = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, memos: [...s.activeCanvas.memos, memo] }
        : null,
    }));
    return memo;
  },

  updateMemo: async (mid, data) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    const res = await researchApi.updateMemo(activeCanvasId, mid, data);
    const updated = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, memos: s.activeCanvas.memos.map((m: CanvasMemo) => m.id === mid ? { ...m, ...updated } : m) }
        : null,
    }));
  },

  deleteMemo: async (mid) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    await researchApi.deleteMemo(activeCanvasId, mid);
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, memos: s.activeCanvas.memos.filter((m: CanvasMemo) => m.id !== mid) }
        : null,
    }));
  },

  setPendingSelection: (selection) => set({ pendingSelection: selection }),

  createCoding: async (transcriptId, questionId, startOffset, endOffset, codedText) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) throw new Error('No canvas open');
    const res = await researchApi.createCoding(activeCanvasId, {
      transcriptId, questionId, startOffset, endOffset, codedText,
    });
    const coding = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, codings: [...s.activeCanvas.codings, coding] }
        : null,
      pendingSelection: null,
    }));
    return coding;
  },

  deleteCoding: async (codingId) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    await researchApi.deleteCoding(activeCanvasId, codingId);
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, codings: s.activeCanvas.codings.filter((c: CanvasTextCoding) => c.id !== codingId) }
        : null,
    }));
  },

  updateCodingAnnotation: async (codingId, annotation) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    const res = await researchApi.updateCoding(activeCanvasId, codingId, { annotation: annotation ?? undefined });
    const updated = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, codings: s.activeCanvas.codings.map((c: CanvasTextCoding) => c.id === codingId ? { ...c, ...updated } : c) }
        : null,
    }));
  },

  saveLayout: async (positions) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    await researchApi.saveLayout(activeCanvasId, {
      positions: positions.map(p => ({
        nodeId: p.nodeId,
        nodeType: p.nodeType,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
      })),
    });
  },

  setSelectedQuestionId: (id) => set({ selectedQuestionId: id }),

  // ─── Cases ───

  addCase: async (name, attributes) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) throw new Error('No canvas open');
    const res = await researchApi.createCase(activeCanvasId, { name, attributes });
    const caseRecord = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, cases: [...s.activeCanvas.cases, caseRecord] }
        : null,
    }));
    return caseRecord;
  },

  updateCase: async (caseId, data) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    const res = await researchApi.updateCase(activeCanvasId, caseId, data);
    const updated = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, cases: s.activeCanvas.cases.map((c: CanvasCase) => c.id === caseId ? { ...c, ...updated } : c) }
        : null,
    }));
  },

  deleteCase: async (caseId) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    await researchApi.deleteCase(activeCanvasId, caseId);
    set(s => ({
      activeCanvas: s.activeCanvas
        ? {
            ...s.activeCanvas,
            cases: s.activeCanvas.cases.filter((c: CanvasCase) => c.id !== caseId),
            transcripts: s.activeCanvas.transcripts.map((t: CanvasTranscript) =>
              t.caseId === caseId ? { ...t, caseId: null } : t
            ),
          }
        : null,
    }));
  },

  // ─── Relations ───

  addRelation: async (fromType, fromId, toType, toId, label) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) throw new Error('No canvas open');
    const res = await researchApi.createRelation(activeCanvasId, { fromType, fromId, toType, toId, label });
    const relation = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, relations: [...s.activeCanvas.relations, relation] }
        : null,
    }));
    return relation;
  },

  deleteRelation: async (relId) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    await researchApi.deleteRelation(activeCanvasId, relId);
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, relations: s.activeCanvas.relations.filter((r: CanvasRelation) => r.id !== relId) }
        : null,
    }));
  },

  // ─── Computed Nodes ───

  addComputedNode: async (nodeType, label, config) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) throw new Error('No canvas open');
    const res = await researchApi.createComputedNode(activeCanvasId, { nodeType, label, config });
    const node = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, computedNodes: [...s.activeCanvas.computedNodes, node] }
        : null,
    }));
    return node;
  },

  updateComputedNode: async (nodeId, data) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    const res = await researchApi.updateComputedNode(activeCanvasId, nodeId, data);
    const updated = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, computedNodes: s.activeCanvas.computedNodes.map((n: CanvasComputedNode) => n.id === nodeId ? { ...n, ...updated } : n) }
        : null,
    }));
  },

  deleteComputedNode: async (nodeId) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) return;
    await researchApi.deleteComputedNode(activeCanvasId, nodeId);
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, computedNodes: s.activeCanvas.computedNodes.filter((n: CanvasComputedNode) => n.id !== nodeId) }
        : null,
    }));
  },

  runComputedNode: async (nodeId) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) throw new Error('No canvas open');
    const res = await researchApi.runComputedNode(activeCanvasId, nodeId);
    const updated = res.data.data;
    set(s => ({
      activeCanvas: s.activeCanvas
        ? { ...s.activeCanvas, computedNodes: s.activeCanvas.computedNodes.map((n: CanvasComputedNode) => n.id === nodeId ? { ...n, ...updated } : n) }
        : null,
    }));
    return updated;
  },

  // ─── Auto-Code ───

  autoCode: async (questionId, pattern, mode, transcriptIds) => {
    const { activeCanvasId } = get();
    if (!activeCanvasId) throw new Error('No canvas open');
    const res = await researchApi.autoCode(activeCanvasId, { questionId, pattern, mode, transcriptIds });
    const { created, codings } = res.data.data;
    if (codings?.length) {
      set(s => ({
        activeCanvas: s.activeCanvas
          ? { ...s.activeCanvas, codings: [...s.activeCanvas.codings, ...codings] }
          : null,
      }));
    }
    return { created };
  },

  // ─── UI toggles ───

  toggleCodingStripes: () => set(s => ({ showCodingStripes: !s.showCodingStripes })),
}));
