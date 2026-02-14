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
};

// Results API
export const resultsApi = {
  getResults: (id: string) =>
    api.get(`/assessments/${id}/results`),

  calculateResults: (id: string) =>
    api.post(`/assessments/${id}/results/calculate`),
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
};

export default api;
