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

  saveResponses: (id: string, responses: { domainKey: string; questionId: string; questionType: string; numericValue?: number; textValue?: string; tags?: string[]; claimedBy?: string }[]) =>
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

// Export API — requires x-access-code header
function getAccessCodeHeader(): Record<string, string> {
  try {
    const stored = localStorage.getItem('wiseshift-assessment');
    if (stored) {
      const parsed = JSON.parse(stored);
      const code = parsed?.state?.accessCode;
      if (code) return { 'x-access-code': code };
    }
  } catch { /* ignore */ }
  return {};
}

export const exportApi = {
  qualitativeCsv: (id: string, accessCode?: string) =>
    api.get(`/assessments/${id}/export/qualitative?format=csv`, {
      responseType: 'blob',
      headers: accessCode ? { 'x-access-code': accessCode } : getAccessCodeHeader(),
    }),

  qualitativeXlsx: (id: string, accessCode?: string) =>
    api.get(`/assessments/${id}/export/qualitative?format=xlsx`, {
      responseType: 'blob',
      headers: accessCode ? { 'x-access-code': accessCode } : getAccessCodeHeader(),
    }),

  docx: (id: string, accessCode?: string) =>
    api.get(`/assessments/${id}/export/docx`, {
      responseType: 'blob',
      headers: accessCode ? { 'x-access-code': accessCode } : getAccessCodeHeader(),
    }),

  json: (id: string, accessCode?: string) =>
    api.get(`/assessments/${id}/export/json`, {
      responseType: 'blob',
      headers: accessCode ? { 'x-access-code': accessCode } : getAccessCodeHeader(),
    }),

  csv: (id: string, accessCode?: string) =>
    api.get(`/assessments/${id}/export/csv`, {
      responseType: 'blob',
      headers: accessCode ? { 'x-access-code': accessCode } : getAccessCodeHeader(),
    }),

  caseStudyDocx: (id: string, accessCode?: string) =>
    api.get(`/assessments/${id}/export/case-study?format=docx`, {
      responseType: 'blob',
      headers: accessCode ? { 'x-access-code': accessCode } : getAccessCodeHeader(),
    }),

  caseStudyJson: (id: string, accessCode?: string) =>
    api.get(`/assessments/${id}/export/case-study?format=json`, {
      responseType: 'blob',
      headers: accessCode ? { 'x-access-code': accessCode } : getAccessCodeHeader(),
    }),
};

// Word Cloud API
export const wordCloudApi = {
  getForAssessment: (id: string) =>
    api.get(`/assessments/${id}/word-frequencies`),

  getForDashboard: () =>
    api.get('/dashboard/word-frequencies'),
};

// Sector API
export const sectorApi = {
  getQuestions: (id: string) =>
    api.get(`/assessments/${id}/sector-questions`),

  getResults: (id: string) =>
    api.get(`/assessments/${id}/sector-results`),
};

// Policy Alignment API
export const policyAlignmentApi = {
  get: (id: string) =>
    api.get(`/assessments/${id}/policy-alignment`),
};

// Public Open Data API
export const publicDataApi = {
  getOverview: () => api.get('/v1/public/overview'),
  getStatistics: () => api.get('/v1/public/statistics'),
  getBenchmarks: () => api.get('/v1/public/benchmarks'),
  getAssessments: () => api.get('/v1/public/assessments'),
};

// Progress API
export const progressApi = {
  getProgress: (id: string) =>
    api.get(`/assessments/${id}/progress`),

  getGoals: (id: string) =>
    api.get(`/assessments/${id}/goals`),

  setGoals: (id: string, goals: Record<string, { targetScore: number; targetDate?: string; notes?: string }>) =>
    api.put(`/assessments/${id}/goals`, { goals }),
};

// Registry API
export const registryApi = {
  list: (params?: { country?: string; sector?: string; page?: number; limit?: number }) =>
    api.get('/registry', { params }),

  getProfile: (slug: string) =>
    api.get(`/registry/${slug}`),

  optIn: (data: { bio?: string; website?: string; foundingYear?: number; targetPopulations?: string[] }, accessCode: string) =>
    api.post('/registry/opt-in', data, { headers: { 'x-access-code': accessCode } }),

  updateProfile: (slug: string, data: { bio?: string; website?: string; foundingYear?: number; targetPopulations?: string[] }, accessCode: string) =>
    api.put(`/registry/${slug}`, data, { headers: { 'x-access-code': accessCode } }),
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

  // Memos (Reflexivity Journal)
  getMemos: (params?: { type?: string; search?: string }) =>
    researchClient.get('/memos', { params }),

  createMemo: (data: { title: string; content: string; type?: string; linkedResponseId?: string; linkedTagId?: string; linkedLayerId?: string }) =>
    researchClient.post('/memos', data),

  updateMemo: (id: string, data: { title?: string; content?: string; type?: string }) =>
    researchClient.put(`/memos/${id}`, data),

  deleteMemo: (id: string) =>
    researchClient.delete(`/memos/${id}`),

  exportMemos: () =>
    researchClient.get('/memos/export', { responseType: 'blob' }),

  // Codebook Snapshots (Versioning)
  getCodebookSnapshots: () =>
    researchClient.get('/codebook-snapshots'),

  createCodebookSnapshot: (label: string) =>
    researchClient.post('/codebook-snapshots', { label }),

  compareCodebookSnapshots: (v1: number, v2: number) =>
    researchClient.get(`/codebook-snapshots/compare?v1=${v1}&v2=${v2}`),

  // Saturation Tracker
  getSaturation: () =>
    researchClient.get('/saturation'),

  exportSaturationReport: () =>
    researchClient.get('/saturation/report', { responseType: 'blob' }),

  // IRR Report Export
  exportIRRReport: (otherDashboardCode: string) =>
    researchClient.post('/irr/report', { otherDashboardCode }, { responseType: 'blob' }),

  // Cross-Case Matrix
  getMatrix: () =>
    researchClient.get('/matrix'),

  getMatrixCell: (assessmentId: string, tagId: string) =>
    researchClient.get(`/matrix/cell?assessmentId=${assessmentId}&tagId=${tagId}`),

  upsertMatrixCellSummary: (assessmentId: string, tagId: string, summary: string) =>
    researchClient.put('/matrix/cell-summary', { assessmentId, tagId, summary }),

  // Longitudinal Tracking
  getLongitudinal: () =>
    researchClient.get('/longitudinal'),

  getLongitudinalCase: (assessmentId: string) =>
    researchClient.get(`/longitudinal/${assessmentId}`),

  // Hierarchical Tags
  getTagTree: () =>
    researchClient.get('/tags/tree'),

  reorderTags: (items: { tagId: string; parentId: string | null; sortOrder: number }[]) =>
    researchClient.put('/tags/reorder', { items }),

  // In-Vivo Coding
  createInVivoCode: (data: { responseId: string; startOffset: number; endOffset: number; highlightedText: string; color?: string; parentId?: string }) =>
    researchClient.post('/tags/in-vivo', data),

  // Code Merge & Split
  mergeTags: (data: { sourceTagIds: string[]; targetName: string; targetColor: string; targetDescription?: string }) =>
    researchClient.post('/tags/merge', data),

  splitTag: (data: { sourceTagId: string; newTags: { name: string; color: string; highlightIds: string[] }[] }) =>
    researchClient.post('/tags/split', data),

  getTagOperations: () =>
    researchClient.get('/tags/operations'),

  undoTagOperation: (id: string) =>
    researchClient.post(`/tags/operations/${id}/undo`),

  // Co-occurrence Matrix
  getCooccurrence: (level: 'response' | 'passage' = 'response') =>
    researchClient.get(`/cooccurrence?level=${level}`),

  getCooccurrenceDrilldown: (tag1: string, tag2: string) =>
    researchClient.get(`/cooccurrence/drilldown?tag1=${encodeURIComponent(tag1)}&tag2=${encodeURIComponent(tag2)}`),

  // Word Frequency
  getWordFrequency: (params?: { minLength?: number; minCount?: number; domainKey?: string; limit?: number }) =>
    researchClient.get('/word-frequency', { params }),

  getWordFrequencyByTag: (tagId: string) =>
    researchClient.get(`/word-frequency/by-tag?tagId=${encodeURIComponent(tagId)}`),

  // Boolean / Compound Queries
  executeQuery: (query: object, page?: number, pageSize?: number) =>
    researchClient.post('/queries/execute', { query, page: page || 1, pageSize: pageSize || 20 }),

  saveQuery: (name: string, query: object) =>
    researchClient.post('/queries/save', { name, query }),

  getSavedQueries: () =>
    researchClient.get('/queries'),

  deleteQuery: (id: string) =>
    researchClient.delete(`/queries/${id}`),

  // REFI-QDA Export
  exportRefiQda: () =>
    researchClient.get('/export/refi-qda', { responseType: 'blob' }),

  // Concept Maps
  getConceptMaps: () =>
    researchClient.get('/concept-maps'),

  createConceptMap: (name: string) =>
    researchClient.post('/concept-maps', { name }),

  updateConceptMap: (id: string, data: { nodes?: object[]; edges?: object[]; viewport?: object }) =>
    researchClient.put(`/concept-maps/${id}`, data),

  deleteConceptMap: (id: string) =>
    researchClient.delete(`/concept-maps/${id}`),

  autoGenerateConceptMap: () =>
    researchClient.post('/concept-maps/auto-generate'),

  // AI-Assisted Coding
  getAIStatus: () =>
    researchClient.get('/ai/status'),

  requestAISuggestions: (responseIds: string[]) =>
    researchClient.post('/ai/suggest', { responseIds }),

  getAISuggestions: (params?: { status?: string; responseId?: string }) =>
    researchClient.get('/ai/suggestions', { params }),

  acceptSuggestion: (id: string) =>
    researchClient.put(`/ai/suggestions/${id}`, { status: 'accepted' }),

  rejectSuggestion: (id: string) =>
    researchClient.put(`/ai/suggestions/${id}`, { status: 'rejected' }),

  bulkAcceptSuggestions: (ids: string[]) =>
    researchClient.post('/ai/suggestions/bulk-accept', { suggestionIds: ids }),

  clearAISuggestions: () =>
    researchClient.delete('/ai/suggestions/clear'),
};

// Researcher Portal API
const researcherClient = axios.create({
  baseURL: '/api/researchers',
  headers: { 'Content-Type': 'application/json' },
});

researcherClient.interceptors.request.use(config => {
  try {
    const token = localStorage.getItem('wiseshift-researcher-token');
    if (token) {
      config.headers['x-researcher-token'] = token;
    }
  } catch { /* ignore */ }
  return config;
});

export const researcherApi = {
  register: (data: { email: string; name: string; institution: string }) =>
    researcherClient.post('/register', data),

  verify: (data: { email: string; verificationCode: string }) =>
    researcherClient.post('/verify', data),

  getProfile: () =>
    researcherClient.get('/profile'),

  requestAccess: (data: { ethicsApproval?: string; justification?: string }) =>
    researcherClient.post('/request-access', data),

  query: (params: {
    country?: string;
    sector?: string;
    size?: string;
    minScore?: number;
    maxScore?: number;
    dateFrom?: string;
    dateTo?: string;
    domainKey?: string;
    page?: number;
    limit?: number;
  }) => researcherClient.get('/query', { params }),

  batchDownload: (caseIds: string[], format: 'csv' | 'json') =>
    researcherClient.post('/batch-download', { caseIds, format }, { responseType: 'blob' }),

  getAccessLog: () =>
    researcherClient.get('/access-log'),
};

// Working Group API
export const workingGroupApi = {
  create: (data: { name: string; description?: string; sector?: string }, accessCode: string) =>
    api.post('/working-groups', data, { headers: { 'x-access-code': accessCode } }),

  list: (accessCode: string) =>
    api.get('/working-groups', { headers: { 'x-access-code': accessCode } }),

  get: (id: string, accessCode: string) =>
    api.get(`/working-groups/${id}`, { headers: { 'x-access-code': accessCode } }),

  getDashboard: (id: string, accessCode: string) =>
    api.get(`/working-groups/${id}/dashboard`, { headers: { 'x-access-code': accessCode } }),

  addMember: (id: string, data: { accessCode: string; displayName: string; role?: string }, callerCode: string) =>
    api.post(`/working-groups/${id}/members`, data, { headers: { 'x-access-code': callerCode } }),

  removeMember: (id: string, memberId: string, accessCode: string) =>
    api.delete(`/working-groups/${id}/members/${memberId}`, { headers: { 'x-access-code': accessCode } }),

  addAssignment: (id: string, assessmentId: string, accessCode: string) =>
    api.post(`/working-groups/${id}/assignments`, { assessmentId }, { headers: { 'x-access-code': accessCode } }),

  removeAssignment: (id: string, assignmentId: string, accessCode: string) =>
    api.delete(`/working-groups/${id}/assignments/${assignmentId}`, { headers: { 'x-access-code': accessCode } }),

  getDiscussions: (id: string, accessCode: string) =>
    api.get(`/working-groups/${id}/discussions`, { headers: { 'x-access-code': accessCode } }),

  postDiscussion: (id: string, data: { title?: string; content: string; parentId?: string }, accessCode: string) =>
    api.post(`/working-groups/${id}/discussions`, data, { headers: { 'x-access-code': accessCode } }),

  addDocument: (id: string, data: { title: string; url: string; description?: string }, accessCode: string) =>
    api.post(`/working-groups/${id}/documents`, data, { headers: { 'x-access-code': accessCode } }),

  removeDocument: (id: string, docId: string, accessCode: string) =>
    api.delete(`/working-groups/${id}/documents/${docId}`, { headers: { 'x-access-code': accessCode } }),

  getActivities: (id: string, accessCode: string) =>
    api.get(`/working-groups/${id}/activities`, { headers: { 'x-access-code': accessCode } }),
};

export default api;
