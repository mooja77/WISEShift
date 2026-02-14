import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResponseInput, OrganisationInput } from '@wiseshift/shared';

interface Collaborator {
  name: string;
  email?: string;
  domains: string[];
}

interface AssessmentState {
  // Assessment data
  assessmentId: string | null;
  accessCode: string | null;
  organisationId: string | null;
  organisationInfo: OrganisationInput | null;
  status: 'idle' | 'in_progress' | 'completed';
  currentDomainIndex: number;
  responses: Record<string, ResponseInput>; // keyed by questionId
  collaboratorName: string | null;
  collaborators: Collaborator[];

  // Actions
  startAssessment: (id: string, accessCode: string, orgId: string, orgInfo: OrganisationInput) => void;
  resumeAssessment: (id: string, accessCode: string, orgId: string, orgInfo: OrganisationInput, responses: any[]) => void;
  setResponse: (questionId: string, response: ResponseInput) => void;
  setCurrentDomain: (index: number) => void;
  setCollaboratorName: (name: string | null) => void;
  setCollaborators: (collaborators: Collaborator[]) => void;
  completeAssessment: () => void;
  reset: () => void;
  getResponsesArray: () => ResponseInput[];
  getDomainResponses: (domainKey: string) => ResponseInput[];
}

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      assessmentId: null,
      accessCode: null,
      organisationId: null,
      organisationInfo: null,
      status: 'idle',
      currentDomainIndex: 0,
      responses: {},
      collaboratorName: null,
      collaborators: [],

      startAssessment: (id, accessCode, orgId, orgInfo) => {
        set({
          assessmentId: id,
          accessCode,
          organisationId: orgId,
          organisationInfo: orgInfo,
          status: 'in_progress',
          currentDomainIndex: 0,
          responses: {},
        });
      },

      resumeAssessment: (id, accessCode, orgId, orgInfo, responses) => {
        const responsesMap: Record<string, ResponseInput> = {};
        for (const r of responses) {
          responsesMap[r.questionId] = {
            domainKey: r.domainKey,
            questionId: r.questionId,
            questionType: r.questionType,
            numericValue: r.numericValue ?? undefined,
            textValue: r.textValue ?? undefined,
            tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : undefined,
          };
        }
        set({
          assessmentId: id,
          accessCode,
          organisationId: orgId,
          organisationInfo: orgInfo,
          status: 'in_progress',
          responses: responsesMap,
        });
      },

      setResponse: (questionId, response) => {
        set(state => ({
          responses: {
            ...state.responses,
            [questionId]: response,
          },
        }));
      },

      setCurrentDomain: (index) => {
        set({ currentDomainIndex: index });
      },

      setCollaboratorName: (name) => {
        set({ collaboratorName: name });
      },

      setCollaborators: (collaborators) => {
        set({ collaborators });
      },

      completeAssessment: () => {
        set({ status: 'completed' });
      },

      reset: () => {
        set({
          assessmentId: null,
          accessCode: null,
          organisationId: null,
          organisationInfo: null,
          status: 'idle',
          currentDomainIndex: 0,
          responses: {},
          collaboratorName: null,
          collaborators: [],
        });
      },

      getResponsesArray: () => {
        return Object.values(get().responses);
      },

      getDomainResponses: (domainKey) => {
        return Object.values(get().responses).filter(r => r.domainKey === domainKey);
      },
    }),
    {
      name: 'wiseshift-assessment',
    }
  )
);
