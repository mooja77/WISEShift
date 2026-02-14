// ─── Research Workspace Types ───

export interface ResearchTag {
  id: string;
  dashboardAccessId: string;
  name: string;
  color: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TextHighlight {
  id: string;
  dashboardAccessId: string;
  responseId: string;
  tagId: string;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
  createdAt: string;
  tag?: ResearchTag;
}

export interface ResearchNote {
  id: string;
  dashboardAccessId: string;
  responseId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotePin {
  id: string;
  dashboardAccessId: string;
  responseId: string;
  quoteText: string;
  contextNote?: string;
  sortOrder: number;
  createdAt: string;
  // Populated by API:
  domainKey?: string;
  domainName?: string;
  domainScore?: number;
  anonymisedContext?: string;
}

// ─── API Request/Response types ───

export interface NarrativeSearchParams {
  search?: string;
  domainKeys?: string[];
  countries?: string[];
  sectors?: string[];
  sizes?: string[];
  scoreMin?: number;
  scoreMax?: number;
  page: number;
  pageSize: number;
}

export interface NarrativeResult {
  responseId: string;
  questionText: string;
  textValue: string;
  domainKey: string;
  domainName: string;
  domainScore: number | null;
  anonymisedContext: string;
  highlightCount: number;
  noteExists: boolean;
}

export interface NarrativeSearchResponse {
  results: NarrativeResult[];
  total: number;
  page: number;
  pageSize: number;
  domainCounts: Record<string, number>;
}

export interface FilterOptions {
  countries: string[];
  sectors: string[];
  sizes: string[];
}

export interface HeatmapCell {
  tagId: string;
  tagName: string;
  tagColor: string;
  domainKey: string;
  domainName: string;
  count: number;
}

export interface HeatmapData {
  cells: HeatmapCell[];
  tags: { id: string; name: string; color: string }[];
  domains: { key: string; name: string }[];
  maxCount: number;
}

export interface HeatmapDrilldownResult {
  highlightId: string;
  highlightedText: string;
  responseId: string;
  fullText: string;
  questionText: string;
  anonymisedContext: string;
  domainScore: number | null;
}

export interface CreateTagInput {
  name: string;
  color: string;
  description?: string;
}

export interface CreateHighlightInput {
  responseId: string;
  tagId: string;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
}

export interface UpsertNoteInput {
  responseId: string;
  text: string;
}

export interface CreateQuotePinInput {
  responseId: string;
  quoteText: string;
  contextNote?: string;
}

// ─── Default WISE Research Tags ───

export interface DefaultTagDef {
  name: string;
  color: string;
  description: string;
}

export const DEFAULT_RESEARCH_TAGS: DefaultTagDef[] = [
  { name: 'Funding dependency', color: '#EF4444', description: 'Reliance on grants, subsidies, or single funding sources' },
  { name: 'Mission drift', color: '#F97316', description: 'Tension between social mission and commercial pressures' },
  { name: 'Regulatory barriers', color: '#EAB308', description: 'Legal and regulatory challenges faced by WISEs' },
  { name: 'Participant autonomy', color: '#22C55E', description: 'Degree of agency and self-determination for participants' },
  { name: 'Stakeholder tension', color: '#14B8A6', description: 'Conflicts or trade-offs between stakeholder groups' },
  { name: 'Skills transferability', color: '#3B82F6', description: 'Portability of skills to open labour market' },
  { name: 'Democratic governance gaps', color: '#6366F1', description: 'Gaps between governance ideals and practice' },
  { name: 'Social inclusion', color: '#8B5CF6', description: 'Practices promoting inclusion of marginalised groups' },
  { name: 'Community engagement', color: '#EC4899', description: 'Connections with and impact on local community' },
  { name: 'Workforce development', color: '#06B6D4', description: 'Training, mentoring, and career progression support' },
];

// 12 preset tag colours for the colour picker
export const TAG_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#06B6D4', '#78716C', '#1E293B',
];

// ─── Phase 4: Cross-Case Comparison & Statistics ───

export interface ResearchAssessmentSummary {
  assessmentId: string;
  anonymisedLabel: string;
  country?: string;
  sector?: string;
  size?: string;
  overallScore: number;
  domainScores: Record<string, number>;
  completedAt: string;
}

export interface ResearchCrossCase {
  assessmentId: string;
  anonymisedLabel: string;
  overallScore: number;
  domainScores: { domainKey: string; domainName: string; score: number; maturityLevel: string }[];
  qualitativeResponses: { domainKey: string; domainName: string; narratives: { questionText: string; text: string }[] }[];
}

export interface ResearchComparisonResult {
  cases: ResearchCrossCase[];
}

export interface DomainStatistics {
  domainKey: string;
  domainName: string;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  n: number;
}

export interface CorrelationMatrix {
  domains: string[];
  matrix: number[][]; // domains.length x domains.length
}

export interface DomainDistribution {
  domainKey: string;
  domainName: string;
  bins: { label: string; min: number; max: number; count: number }[];
}

export interface GroupComparison {
  groupBy: string;
  domainKey: string;
  domainName: string;
  groups: { label: string; mean: number; stdDev: number; n: number }[];
}

export interface StatisticalDashboardData {
  descriptive: DomainStatistics[];
  correlations: CorrelationMatrix;
  distributions: DomainDistribution[];
}

// ─── Phase 5: Sampling & IRR ───

export type SamplingMethod = 'maximum_variation' | 'extreme_deviant' | 'typical' | 'purposive';

export interface SamplingRequest {
  method: SamplingMethod;
  n: number;
  criteria?: {
    countries?: string[];
    sectors?: string[];
    sizes?: string[];
  };
}

export interface SampledCase {
  assessmentId: string;
  anonymisedLabel: string;
  overallScore: number;
  domainScores: Record<string, number>;
  justification: string;
}

export interface SamplingResult {
  method: SamplingMethod;
  cases: SampledCase[];
  methodologyText: string;
}

export interface IRRRequest {
  otherDashboardCode: string;
}

export interface TagAgreement {
  tagName: string;
  agreementCount: number;
  disagreementCount: number;
  kappa: number;
  interpretation: string;
}

export interface IRRResult {
  overallKappa: number;
  overallInterpretation: string;
  percentageAgreement: number;
  perTagAgreement: TagAgreement[];
  totalComparisons: number;
}

// ─── Phase 6: Trends, Layers, Exports ───

export interface TrendDataPoint {
  period: string;      // e.g. "2025-Q3"
  domainKey: string;
  domainName: string;
  mean: number;
  n: number;
}

export interface ChangeDetection {
  domainKey: string;
  domainName: string;
  previousPeriod: string;
  currentPeriod: string;
  previousMean: number;
  currentMean: number;
  delta: number;
}

export interface TrendsData {
  dataPoints: TrendDataPoint[];
  changes: ChangeDetection[];
  granularity: 'month' | 'quarter' | 'year';
}

export interface CodingLayer {
  id: string;
  dashboardAccessId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  highlightCount?: number;
}

export interface LayerShareInfo {
  id: string;
  codingLayerId: string;
  sharedWithId: string;
  sharedWithName: string;
  permission: 'read' | 'write';
  createdAt: string;
}

export interface DataDictionaryEntry {
  variable: string;
  type: string;
  description: string;
  values?: string;
}

export type CitationFormat = 'apa' | 'harvard' | 'chicago';

export interface CitationResult {
  format: CitationFormat;
  citation: string;
}
