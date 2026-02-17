export type QuestionType = 'likert' | 'maturity' | 'narrative';

export interface Question {
  id: string;
  domainKey: string;
  text: string;
  type: QuestionType;
  description?: string;
  required: boolean;
  weight: number; // 1.0 for likert, 1.5 for maturity, 0 for narrative
  placeholder?: string;
  tags?: string[];
  /** i18n key for translating question text, e.g. 'domains.governance.questions.q1.text' */
  i18nKey?: string;
}

export interface Domain {
  key: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  questions: Question[];
}

export type AssessmentStatus = 'in_progress' | 'completed';

export interface Organisation {
  id: string;
  name: string;
  accessCode: string;
  country?: string;
  region?: string;
  sector?: string;
  size?: string;
  legalStructure?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  organisationId: string;
  status: AssessmentStatus;
  overallScore?: number;
  previousAssessmentId?: string;
  collaborators?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  organisation?: Organisation;
  responses?: Response[];
  domainScores?: DomainScore[];
}

export interface Response {
  id: string;
  assessmentId: string;
  domainKey: string;
  questionId: string;
  questionType: QuestionType;
  numericValue?: number;
  textValue?: string;
  tags?: string[];
  claimedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Collaborator {
  name: string;
  email?: string;
  domains: string[];
}

export interface DomainScore {
  id: string;
  assessmentId: string;
  domainKey: string;
  score: number;
  maturityLevel: string;
  createdAt: string;
}

export interface OrganisationInput {
  name: string;
  country?: string;
  region?: string;
  sector?: string;
  size?: string;
  legalStructure?: string;
}

export interface ResponseInput {
  domainKey: string;
  questionId: string;
  questionType: QuestionType;
  numericValue?: number;
  textValue?: string;
  tags?: string[];
}
