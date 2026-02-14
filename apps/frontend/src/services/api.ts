import axios from 'axios';
import type {
  NarrativeSearchParams,
  CreateTagInput,
  CreateHighlightInput,
  UpsertNoteInput,
  CreateQuotePinInput,
} from '@wiseshift/shared';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Research API instance — injects x-dashboard-code from localStorage
const researchClient = axios.create({
  baseURL: '/api/research',
  headers: { 'Content-Type': 'application/json' },
});

researchClient.interceptors.request.use(config => {
  try {
    const stored = localStorage.getItem('wiseshift-research');
    if (stored) {
      const parsed = JSON.parse(stored);
      const code = parsed?.state?.dashboardCode;
      if (code) {
        config.headers['x-dashboard-code'] = code;
      }
    }
  } catch { /* ignore */ }
  return config;
});

// Assessment API
export const assessmentApi = {
  create: (organisation: {
    name: string;
    country?: string;
    region?: string;
    sector?: string;
    size?: string;
    legalStructure?: string;
  }) => api.post('/assessments', { organisation }),

  resume: (accessCode: string) =>
    api.get(`/assessments/resume/${accessCode}`),

  update: (id: string, data: { status?: string }) =>
    api.put(`/assessments/${id}`, data),

  complete: (id: string) =>
    api.post(`/assessments/${id}/complete`),

  saveResponses: (id: string, responses: any[]) =>
    api.put(`/assessments/${id}/responses`, { responses }),

  getResponses: (id: string) =>
    api.get(`/assessments/${id}/responses`),

  deleteAssessment: (id: string, accessCode: string) =>
    api.delete(`/assessments/${id}`, { headers: { 'x-access-code': accessCode } }),

  anonymiseData: (id: string, accessCode: string) =>
    api.delete(`/assessments/${id}/data`, { headers: { 'x-access-code': accessCode } }),
};

// Results API
export const resultsApi = {
  getResults: (id: string) =>
    api.get(`/assessments/${id}/results`),

  calculateResults: (id: string) =>
    api.post(`/assessments/${id}/results/calculate`),

  getTimeline: (id: string) =>
    api.get(`/assessments/${id}/timeline`),

  getExemplars: (id: string, domainKey: string) =>
    api.get(`/assessments/${id}/exemplars?domainKey=${encodeURIComponent(domainKey)}`),
};

// Benchmark API
export const benchmarkApi = {
  getAll: () => api.get('/benchmarks'),
  getBySector: (sector: string) => api.get(`/benchmarks/${encodeURIComponent(sector)}`),
};

// Action Plan API
export const actionPlanApi = {
  get: (id: string) =>
    api.get(`/assessments/${id}/action-plan`),

  generate: (id: string) =>
    api.post(`/assessments/${id}/action-plan/generate`),

  updateItem: (assessmentId: string, planId: string, data: { status?: string; notes?: string }) =>
    api.put(`/assessments/${assessmentId}/action-plan/${planId}`, data),

  getProgress: (id: string) =>
    api.get(`/assessments/${id}/action-plan/progress`),
};

// Report API
export const reportApi = {
  getReportData: (id: string) =>
    api.get(`/assessments/${id}/report/pdf`),
};

// Dashboard API
export const dashboardApi = {
  auth: (accessCode: string) =>
    api.post('/dashboard/auth', { accessCode }),

  getOverview: () =>
    api.get('/dashboard/overview'),

  getInsights: () =>
    api.get('/dashboard/insights'),
};

// Export API
export const exportApi = {
  qualitativeCsv: (id: string) =>
    api.get(`/assessments/${id}/export/qualitative?format=csv`, { responseType: 'blob' }),

  qualitativeXlsx: (id: string) =>
    api.get(`/assessments/${id}/export/qualitative?format=xlsx`, { responseType: 'blob' }),

  docx: (id: string) =>
    api.get(`/assessments/${id}/export/docx`, { responseType: 'blob' }),

  json: (id: string) =>
    api.get(`/assessments/${id}/export/json`, { responseType: 'blob' }),

  csv: (id: string) =>
    api.get(`/assessments/${id}/export/csv`, { responseType: 'blob' }),
};

// Word Cloud API
export const wordCloudApi = {
  getForAssessment: (id: string) =>
    api.get(`/assessments/${id}/word-frequencies`),

  getForDashboard: () =>
    api.get('/dashboard/word-frequencies'),
};

// Reassessment API
export const reassessmentApi = {
  startReassessment: (id: string) =>
    api.post(`/assessments/${id}/reassess`),

  getComparison: (id: string) =>
    api.get(`/assessments/${id}/comparison`),
};

// Interview Guide API
export const interviewGuideApi = {
  get: (id: string) =>
    api.get(`/assessments/${id}/interview-guide`),

  getDocx: (id: string) =>
    api.get(`/assessments/${id}/interview-guide/docx`, { responseType: 'blob' }),
};

// Comparison API
export const comparisonApi = {
  compare: (assessmentIds: string[]) =>
    api.post('/dashboard/compare', { assessmentIds }),
};

// Collaboration API
export const collaborationApi = {
  addCollaborator: (id: string, data: { name: string; email?: string; domains: string[] }) =>
    api.post(`/assessments/${id}/collaborators`, data),

  getCollaborators: (id: string) =>
    api.get(`/assessments/${id}/collaborators`),

  getStatus: (id: string) =>
    api.get(`/assessments/${id}/status`),
};

// ─── Research Workspace API ───
export const researchApi = {
  // Phase A: Narrative Explorer
  searchNarratives: (params: Partial<NarrativeSearchParams>) =>
    researchClient.post('/narratives/search', { page: 1, pageSize: 20, ...params }),

  getFilterOptions: () =>
    researchClient.get('/narratives/filter-options'),

  // Phase B: Tags
  getTags: () =>
    researchClient.get('/tags'),

  createTag: (data: CreateTagInput) =>
    researchClient.post('/tags', data),

  updateTag: (id: string, data: Partial<CreateTagInput>) =>
    researchClient.put(`/tags/${id}`, data),

  deleteTag: (id: string) =>
    researchClient.delete(`/tags/${id}`),

  seedDefaultTags: () =>
    researchClient.post('/tags/seed-defaults'),

  // Phase B: Highlights
  getHighlights: (responseId: string) =>
    researchClient.get(`/highlights/${responseId}`),

  getHighlightsBatch: (responseIds: string[]) =>
    researchClient.post('/highlights/batch', { responseIds }),

  createHighlight: (data: CreateHighlightInput) =>
    researchClient.post('/highlights', data),

  deleteHighlight: (id: string) =>
    researchClient.delete(`/highlights/${id}`),

  // Phase B: Notes
  getNotes: () =>
    researchClient.get('/notes'),

  getNote: (responseId: string) =>
    researchClient.get(`/notes/${responseId}`),

  upsertNote: (data: UpsertNoteInput) =>
    researchClient.put('/notes', data),

  deleteNote: (responseId: string) =>
    researchClient.delete(`/notes/${responseId}`),

  // Phase C: Heatmap
  getHeatmap: () =>
    researchClient.get('/heatmap'),

  getHeatmapDrilldown: (tagId: string, domainKey: string) =>
    researchClient.get(`/heatmap/drilldown?tagId=${encodeURIComponent(tagId)}&domainKey=${encodeURIComponent(domainKey)}`),

  // Phase C: Quotes
  getQuotes: () =>
    researchClient.get('/quotes'),

  createQuote: (data: CreateQuotePinInput) =>
    researchClient.post('/quotes', data),

  deleteQuote: (id: string) =>
    researchClient.delete(`/quotes/${id}`),

  reorderQuotes: (pinIds: string[]) =>
    researchClient.put('/quotes/reorder', { pinIds }),

  exportQuotesDocx: () =>
    researchClient.get('/quotes/export/docx', { responseType: 'blob' }),

  // Phase C: Codebook
  exportCodebook: () =>
    researchClient.get('/export/codebook', { responseType: 'blob' }),

  // Phase 4A: Cross-Case Comparison
  getAssessments: () =>
    researchClient.get('/assessments'),

  compareAssessments: (assessmentIds: string[]) =>
    researchClient.post('/compare', { assessmentIds }),

  // Phase 4B: Statistics
  getStatistics: () =>
    researchClient.get('/statistics'),

  getStatisticsGroups: (groupBy: string, domainKey?: string) =>
    researchClient.get(`/statistics/groups?groupBy=${encodeURIComponent(groupBy)}${domainKey ? `&domainKey=${encodeURIComponent(domainKey)}` : ''}`),

  // Phase 5A: Sampling
  runSampling: (data: { method: string; count: number; criteria?: Record<string, string> }) =>
    researchClient.post('/sampling', data),

  // Phase 5B: Inter-Rater Reliability
  calculateIRR: (otherDashboardCode: string) =>
    researchClient.post('/irr', { otherDashboardCode }),

  // Phase 6A: Trends
  getTrends: (granularity: string) =>
    researchClient.get(`/trends?granularity=${encodeURIComponent(granularity)}`),

  // Phase 6B: Exports
  exportDataset: (format: 'csv' | 'json') =>
    researchClient.get(`/export/dataset?format=${format}`, { responseType: format === 'csv' ? 'blob' : 'json' }),

  exportDataDictionary: () =>
    researchClient.get('/export/data-dictionary'),

  exportEnhancedCodebook: () =>
    researchClient.get('/export/enhanced-codebook', { responseType: 'blob' }),

  getCitation: (format: string) =>
    researchClient.get(`/citation?format=${encodeURIComponent(format)}`),

  // Phase 6C: Annotation Layers
  getLayers: () =>
    researchClient.get('/layers'),

  createLayer: (name: string, description?: string) =>
    researchClient.post('/layers', { name, description }),

  updateLayer: (id: string, data: { name?: string; description?: string }) =>
    researchClient.put(`/layers/${id}`, data),

  deleteLayer: (id: string) =>
    researchClient.delete(`/layers/${id}`),

  activateLayer: (id: string) =>
    researchClient.put(`/layers/${id}/activate`),

  getLayerHighlights: (layerId: string) =>
    researchClient.get(`/layers/${layerId}/highlights`),

  createLayerHighlight: (layerId: string, data: { responseId: string; tagId: string; startOffset: number; endOffset: number; highlightedText: string }) =>
    researchClient.post(`/layers/${layerId}/highlights`, data),

  deleteLayerHighlight: (layerId: string, highlightId: string) =>
    researchClient.delete(`/layers/${layerId}/highlights/${highlightId}`),

  shareLayer: (layerId: string, dashboardCode: string, permission = 'read') =>
    researchClient.post(`/layers/${layerId}/share`, { dashboardCode, permission }),

  compareLayers: (layerId1: string, layerId2: string) =>
    researchClient.post('/layers/compare', { layerId1, layerId2 }),
};

export default api;
