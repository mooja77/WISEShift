import type { OrganisationInput, ResponseInput, Assessment, Response } from './assessment.types';
import type { AssessmentResults, BenchmarkComparison, ActionPlan, DashboardOverview, DashboardInsight } from './results.types';

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Assessment endpoints
export interface CreateAssessmentRequest {
  organisation: OrganisationInput;
}

export interface CreateAssessmentResponse {
  assessment: Assessment;
  accessCode: string;
}

export interface ResumeAssessmentResponse {
  assessment: Assessment;
  responses: Response[];
}

export interface UpdateResponsesRequest {
  responses: ResponseInput[];
}

export interface CompleteAssessmentResponse {
  assessment: Assessment;
  results: AssessmentResults;
}

// Results endpoints
export type GetResultsResponse = AssessmentResults;

// Benchmark endpoints
export type GetBenchmarkResponse = BenchmarkComparison;

// Action Plan endpoints
export type GetActionPlanResponse = ActionPlan;

// Dashboard endpoints
export interface DashboardAuthRequest {
  accessCode: string;
}

export interface DashboardAuthResponse {
  token: string;
  expiresAt: string;
}

export type GetDashboardOverviewResponse = DashboardOverview;

export type GetDashboardInsightsResponse = DashboardInsight[];

// PDF report
export interface GenerateReportRequest {
  includeQualitative?: boolean;
  includeActionPlan?: boolean;
  includeBenchmarks?: boolean;
}
