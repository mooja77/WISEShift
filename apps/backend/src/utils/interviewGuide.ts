import { DOMAINS } from '@wiseshift/shared';

interface DomainScoreRecord {
  domainKey: string;
  score: number;
  maturityLevel: string;
}

interface ResponseRecord {
  domainKey: string;
  questionType: string;
  textValue: string | null;
}

export interface InterviewQuestion {
  domainKey: string;
  domainName: string;
  type: 'development' | 'strength' | 'elaboration';
  question: string;
  rationale: string;
}

/**
 * Generates follow-up interview questions based on assessment scores and narrative responses.
 * - Low-score domains (<2.5): probing barrier questions + resource-needs questions
 * - High-score domains (>=3.5): "what works" questions
 * - Thin narratives (<150 avg chars): elaboration requests
 */
export function generateInterviewGuide(
  domainScores: DomainScoreRecord[],
  responses: ResponseRecord[]
): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];

  for (const domain of DOMAINS) {
    const ds = domainScores.find((s) => s.domainKey === domain.key);
    const score = ds?.score || 0;

    const narratives = responses.filter(
      (r) =>
        r.domainKey === domain.key &&
        r.questionType === 'narrative' &&
        r.textValue
    );

    const avgNarrativeLength =
      narratives.length > 0
        ? narratives.reduce((sum, r) => sum + (r.textValue?.length || 0), 0) /
          narratives.length
        : 0;

    // Low-score domains: barrier + resource questions
    if (score > 0 && score < 2.5) {
      questions.push({
        domainKey: domain.key,
        domainName: domain.name,
        type: 'development',
        question: `Your assessment indicates ${domain.name} is an area for development (score: ${score.toFixed(1)}/5). What do you see as the main barriers to strengthening this area?`,
        rationale: `Score below 2.5 suggests systemic challenges. Understanding barriers helps identify structural vs. resource-based constraints.`,
      });

      questions.push({
        domainKey: domain.key,
        domainName: domain.name,
        type: 'development',
        question: `What resources or support would help your organisation improve in ${domain.name}?`,
        rationale: `Low-scoring domains often reflect resource gaps. This question helps map the support infrastructure needed.`,
      });
    }

    // High-score domains: "what works" questions
    if (score >= 3.5) {
      questions.push({
        domainKey: domain.key,
        domainName: domain.name,
        type: 'strength',
        question: `${domain.name} is one of your stronger areas (score: ${score.toFixed(1)}/5). What specific practices or structures have contributed most to this strength?`,
        rationale: `High scores indicate effective practices worth documenting. Understanding success factors supports knowledge transfer across the sector.`,
      });

      questions.push({
        domainKey: domain.key,
        domainName: domain.name,
        type: 'strength',
        question: `How has your approach to ${domain.name} evolved over time? What key decisions or turning points shaped it?`,
        rationale: `Longitudinal perspective reveals how WISEs develop capabilities over time, valuable for developmental research.`,
      });
    }

    // Thin narratives: elaboration requests
    if (narratives.length > 0 && avgNarrativeLength < 150) {
      questions.push({
        domainKey: domain.key,
        domainName: domain.name,
        type: 'elaboration',
        question: `Your written responses for ${domain.name} were brief. Could you elaborate on your organisation's practices in this area with specific examples?`,
        rationale: `Short narrative responses may indicate time constraints during self-assessment. Follow-up interviews can capture richer qualitative data.`,
      });
    }
  }

  return questions;
}
