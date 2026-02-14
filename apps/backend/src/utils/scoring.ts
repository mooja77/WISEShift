import { DOMAINS, getMaturityLevel } from '@wiseshift/shared';
import type { Response as PrismaResponse } from '@prisma/client';

export interface DomainScoreCalc {
  domainKey: string;
  domainName: string;
  score: number;
  maturityLevel: string;
}

export function calculateDomainScore(
  domainKey: string,
  responses: PrismaResponse[]
): DomainScoreCalc | null {
  const domain = DOMAINS.find(d => d.key === domainKey);
  if (!domain) return null;

  const domainResponses = responses.filter(r => r.domainKey === domainKey);
  const quantitativeResponses = domainResponses.filter(
    r => (r.questionType === 'likert' || r.questionType === 'maturity') && r.numericValue != null
  );

  if (quantitativeResponses.length === 0) {
    return {
      domainKey,
      domainName: domain.name,
      score: 0,
      maturityLevel: 'Not assessed',
    };
  }

  // Weighted average: maturity questions get 1.5x weight, likert 1.0x
  let totalWeight = 0;
  let weightedSum = 0;

  for (const resp of quantitativeResponses) {
    const question = domain.questions.find(q => q.id === resp.questionId);
    const weight = question?.weight || 1.0;
    weightedSum += (resp.numericValue || 0) * weight;
    totalWeight += weight;
  }

  const score = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const roundedScore = Math.round(score * 100) / 100;
  const maturity = getMaturityLevel(roundedScore);

  return {
    domainKey,
    domainName: domain.name,
    score: roundedScore,
    maturityLevel: maturity.name,
  };
}

export function calculateOverallScore(domainScores: DomainScoreCalc[]): number {
  const scored = domainScores.filter(d => d.score > 0);
  if (scored.length === 0) return 0;
  const sum = scored.reduce((acc, d) => acc + d.score, 0);
  return Math.round((sum / scored.length) * 100) / 100;
}

export function identifyStrengths(domainScores: DomainScoreCalc[]): string[] {
  return domainScores
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(d => d.domainName);
}

export function identifyWeaknesses(domainScores: DomainScoreCalc[]): string[] {
  return domainScores
    .filter(d => d.score > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(d => d.domainName);
}
