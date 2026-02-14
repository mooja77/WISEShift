export interface AssessmentResults {
  assessmentId: string;
  organisationName: string;
  overallScore: number;
  overallMaturityLevel: string;
  domainScores: DomainScoreResult[];
  strengths: string[];
  weaknesses: string[];
  qualitativeSummary: QualitativeSummary[];
  completedAt: string;
}

export interface DomainScoreResult {
  domainKey: string;
  domainName: string;
  score: number;
  maturityLevel: string;
  quantitativeResponses: QuantitativeResponse[];
  qualitativeResponses: QualitativeResponse[];
}

export interface QuantitativeResponse {
  questionId: string;
  questionText: string;
  questionType: 'likert' | 'maturity';
  value: number;
}

export interface QualitativeResponse {
  questionId: string;
  questionText: string;
  text: string;
  tags: string[];
}

export interface QualitativeSummary {
  domainKey: string;
  domainName: string;
  narratives: {
    questionText: string;
    text: string;
    tags: string[];
  }[];
}

export interface BenchmarkData {
  sector: string;
  sampleSize: number;
  domainAverages: Record<string, number>;
  domainPercentiles: Record<string, { p25: number; p50: number; p75: number }>;
  overallAverage: number;
}

export interface BenchmarkComparison {
  assessmentId: string;
  organisationScore: DomainScoreResult[];
  benchmark: BenchmarkData;
  percentileRanking: Record<string, number>;
}

export interface ActionPlanItem {
  id: string;
  assessmentId: string;
  domainKey: string;
  domainName: string;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  timeframe: 'short' | 'medium' | 'long';
  currentLevel: string;
  targetLevel: string;
  status: 'not_started' | 'in_progress' | 'completed';
  notes?: string;
  completedAt?: string;
}

export interface ActionPlan {
  assessmentId: string;
  organisationName: string;
  generatedAt: string;
  items: ActionPlanItem[];
}

export interface DashboardOverview {
  totalAssessments: number;
  completedAssessments: number;
  averageOverallScore: number;
  domainAverages: Record<string, number>;
  maturityDistribution: Record<string, number>;
  sectorBreakdown: Record<string, number>;
  recentAssessments: {
    id: string;
    organisationName: string;
    overallScore: number;
    completedAt: string;
  }[];
}

export interface DashboardInsight {
  type: 'strength' | 'weakness' | 'trend' | 'recommendation';
  title: string;
  description: string;
  domainKey?: string;
  value?: number;
}

export interface InterviewQuestion {
  domainKey: string;
  domainName: string;
  type: 'development' | 'strength' | 'elaboration';
  question: string;
  rationale: string;
}

export interface InterviewGuide {
  assessmentId: string;
  questions: InterviewQuestion[];
}

export interface ReassessmentComparison {
  currentAssessmentId: string;
  previousAssessmentId: string;
  domains: {
    domainKey: string;
    domainName: string;
    currentScore: number;
    previousScore: number;
    delta: number;
    direction: 'improved' | 'declined' | 'unchanged';
  }[];
}

export interface AssessmentTimelineEntry {
  assessmentId: string;
  completedAt: string;
  overallScore: number;
  domainScores: Record<string, number>;
}

export interface CrossCaseComparison {
  label: string;
  assessmentId: string;
  overallScore: number;
  domainScores: {
    domainKey: string;
    domainName: string;
    score: number;
    maturityLevel: string;
  }[];
  qualitativeResponses: {
    domainKey: string;
    domainName: string;
    narratives: {
      questionText: string;
      text: string;
    }[];
  }[];
}
