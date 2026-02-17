// ─── EU Policy Alignment Mapping ───
// Maps WISE assessment domain scores to EU policy frameworks.

export type AlignmentStrength = 'strong' | 'moderate' | 'weak';

export interface PolicyObjective {
  id: string;
  name: string;
  description: string;
  domainMappings: {
    domainKey: string;
    strength: AlignmentStrength;
    weight: number; // 1.0 for strong, 0.6 for moderate, 0.3 for weak
  }[];
}

export interface PolicyFramework {
  key: string;
  name: string;
  shortName: string;
  description: string;
  url: string;
  objectives: PolicyObjective[];
}

export const POLICY_FRAMEWORKS: PolicyFramework[] = [
  // ─── 1. European Pillar of Social Rights (EPSR) ───
  {
    key: 'epsr',
    name: 'European Pillar of Social Rights',
    shortName: 'EPSR',
    description: 'The European Pillar of Social Rights sets out 20 key principles for a fair and social Europe. WISEs contribute directly to several principles related to employment, skills, and social protection.',
    url: 'https://ec.europa.eu/social/main.jsp?catId=1607&langId=en',
    objectives: [
      {
        id: 'epsr-1',
        name: 'Principle 1: Education, training and lifelong learning',
        description: 'Everyone has the right to quality and inclusive education, training and lifelong learning.',
        domainMappings: [
          { domainKey: 'employment', strength: 'strong', weight: 1.0 },
          { domainKey: 'support', strength: 'moderate', weight: 0.6 },
          { domainKey: 'environmental-sustainability', strength: 'weak', weight: 0.3 },
        ],
      },
      {
        id: 'epsr-3',
        name: 'Principle 3: Equal opportunities',
        description: 'Regardless of gender, racial or ethnic origin, religion or belief, disability, age or sexual orientation, everyone has the right to equal treatment and opportunities.',
        domainMappings: [
          { domainKey: 'culture', strength: 'strong', weight: 1.0 },
          { domainKey: 'social-mission', strength: 'strong', weight: 1.0 },
          { domainKey: 'governance', strength: 'moderate', weight: 0.6 },
        ],
      },
      {
        id: 'epsr-4',
        name: 'Principle 4: Active support to employment',
        description: 'Everyone has the right to timely and tailor-made assistance to improve employment or self-employment prospects.',
        domainMappings: [
          { domainKey: 'employment', strength: 'strong', weight: 1.0 },
          { domainKey: 'support', strength: 'strong', weight: 1.0 },
          { domainKey: 'social-mission', strength: 'moderate', weight: 0.6 },
        ],
      },
      {
        id: 'epsr-5',
        name: 'Principle 5: Secure and adaptable employment',
        description: 'Workers have the right to fair and equal treatment regarding working conditions and access to social protection.',
        domainMappings: [
          { domainKey: 'employment', strength: 'strong', weight: 1.0 },
          { domainKey: 'economic', strength: 'moderate', weight: 0.6 },
          { domainKey: 'culture', strength: 'moderate', weight: 0.6 },
        ],
      },
      {
        id: 'epsr-17',
        name: 'Principle 17: Inclusion of people with disabilities',
        description: 'People with disabilities have the right to income support, services, and reasonable accommodation at the workplace.',
        domainMappings: [
          { domainKey: 'support', strength: 'strong', weight: 1.0 },
          { domainKey: 'culture', strength: 'strong', weight: 1.0 },
          { domainKey: 'employment', strength: 'moderate', weight: 0.6 },
        ],
      },
      {
        id: 'epsr-20',
        name: 'Principle 20: Access to essential services',
        description: 'Everyone has the right to access essential services of good quality.',
        domainMappings: [
          { domainKey: 'support', strength: 'strong', weight: 1.0 },
          { domainKey: 'stakeholders', strength: 'moderate', weight: 0.6 },
        ],
      },
    ],
  },

  // ─── 2. UN Sustainable Development Goals (SDGs) ───
  {
    key: 'sdgs',
    name: 'United Nations Sustainable Development Goals',
    shortName: 'UN SDGs',
    description: 'The 17 UN SDGs provide a shared blueprint for peace and prosperity. WISEs align strongly with goals related to poverty, employment, inequality, responsible consumption, and climate action.',
    url: 'https://sdgs.un.org/goals',
    objectives: [
      {
        id: 'sdg-1',
        name: 'SDG 1: No Poverty',
        description: 'End poverty in all its forms everywhere.',
        domainMappings: [
          { domainKey: 'social-mission', strength: 'strong', weight: 1.0 },
          { domainKey: 'employment', strength: 'strong', weight: 1.0 },
          { domainKey: 'economic', strength: 'moderate', weight: 0.6 },
        ],
      },
      {
        id: 'sdg-8',
        name: 'SDG 8: Decent Work and Economic Growth',
        description: 'Promote sustained, inclusive economic growth, full and productive employment and decent work for all.',
        domainMappings: [
          { domainKey: 'employment', strength: 'strong', weight: 1.0 },
          { domainKey: 'economic', strength: 'strong', weight: 1.0 },
          { domainKey: 'culture', strength: 'moderate', weight: 0.6 },
          { domainKey: 'support', strength: 'moderate', weight: 0.6 },
        ],
      },
      {
        id: 'sdg-10',
        name: 'SDG 10: Reduced Inequalities',
        description: 'Reduce inequality within and among countries.',
        domainMappings: [
          { domainKey: 'social-mission', strength: 'strong', weight: 1.0 },
          { domainKey: 'culture', strength: 'strong', weight: 1.0 },
          { domainKey: 'governance', strength: 'moderate', weight: 0.6 },
        ],
      },
      {
        id: 'sdg-11',
        name: 'SDG 11: Sustainable Cities and Communities',
        description: 'Make cities and human settlements inclusive, safe, resilient and sustainable.',
        domainMappings: [
          { domainKey: 'stakeholders', strength: 'strong', weight: 1.0 },
          { domainKey: 'social-mission', strength: 'moderate', weight: 0.6 },
          { domainKey: 'environmental-sustainability', strength: 'moderate', weight: 0.6 },
        ],
      },
      {
        id: 'sdg-12',
        name: 'SDG 12: Responsible Consumption and Production',
        description: 'Ensure sustainable consumption and production patterns.',
        domainMappings: [
          { domainKey: 'environmental-sustainability', strength: 'strong', weight: 1.0 },
          { domainKey: 'economic', strength: 'moderate', weight: 0.6 },
        ],
      },
      {
        id: 'sdg-13',
        name: 'SDG 13: Climate Action',
        description: 'Take urgent action to combat climate change and its impacts.',
        domainMappings: [
          { domainKey: 'environmental-sustainability', strength: 'strong', weight: 1.0 },
        ],
      },
      {
        id: 'sdg-16',
        name: 'SDG 16: Peace, Justice and Strong Institutions',
        description: 'Promote peaceful and inclusive societies, provide access to justice for all and build effective, accountable and inclusive institutions.',
        domainMappings: [
          { domainKey: 'governance', strength: 'strong', weight: 1.0 },
          { domainKey: 'impact-measurement', strength: 'moderate', weight: 0.6 },
        ],
      },
    ],
  },

  // ─── 3. EU Social Economy Action Plan (SEAP) ───
  {
    key: 'seap',
    name: 'EU Social Economy Action Plan',
    shortName: 'SEAP',
    description: 'The 2021 EU Social Economy Action Plan outlines 38 concrete actions to support the social economy. WISEs are explicitly recognised as key actors in delivering social inclusion and sustainable economic models.',
    url: 'https://ec.europa.eu/social/main.jsp?catId=1537&langId=en',
    objectives: [
      {
        id: 'seap-1',
        name: 'Creating the right framework conditions',
        description: 'Establishing legal, fiscal, and institutional frameworks that support social economy organisations.',
        domainMappings: [
          { domainKey: 'governance', strength: 'strong', weight: 1.0 },
          { domainKey: 'economic', strength: 'strong', weight: 1.0 },
        ],
      },
      {
        id: 'seap-2',
        name: 'Opening up opportunities and markets',
        description: 'Supporting social economy organisations to access markets, funding, and public procurement opportunities.',
        domainMappings: [
          { domainKey: 'economic', strength: 'strong', weight: 1.0 },
          { domainKey: 'stakeholders', strength: 'strong', weight: 1.0 },
          { domainKey: 'employment', strength: 'moderate', weight: 0.6 },
        ],
      },
      {
        id: 'seap-3',
        name: 'Supporting capacity building and innovation',
        description: 'Strengthening the capacity of social economy organisations through skills development, digital transformation, and innovation.',
        domainMappings: [
          { domainKey: 'impact-measurement', strength: 'strong', weight: 1.0 },
          { domainKey: 'support', strength: 'moderate', weight: 0.6 },
          { domainKey: 'environmental-sustainability', strength: 'moderate', weight: 0.6 },
        ],
      },
      {
        id: 'seap-4',
        name: 'Ensuring recognition and visibility',
        description: 'Increasing the visibility and recognition of social economy organisations through data collection, research, and policy dialogue.',
        domainMappings: [
          { domainKey: 'impact-measurement', strength: 'strong', weight: 1.0 },
          { domainKey: 'stakeholders', strength: 'moderate', weight: 0.6 },
          { domainKey: 'social-mission', strength: 'moderate', weight: 0.6 },
        ],
      },
    ],
  },
];

/** Calculate alignment score for a single policy objective given domain scores */
export function calculateObjectiveAlignment(
  objective: PolicyObjective,
  domainScores: Record<string, number>
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const mapping of objective.domainMappings) {
    const score = domainScores[mapping.domainKey];
    if (score !== undefined && score > 0) {
      weightedSum += score * mapping.weight;
      totalWeight += mapping.weight;
    }
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
}

/** Calculate overall framework alignment score */
export function calculateFrameworkAlignment(
  framework: PolicyFramework,
  domainScores: Record<string, number>
): { overallScore: number; objectiveScores: { id: string; name: string; score: number }[] } {
  const objectiveScores = framework.objectives.map(obj => ({
    id: obj.id,
    name: obj.name,
    score: calculateObjectiveAlignment(obj, domainScores),
  }));

  const scoredObjectives = objectiveScores.filter(o => o.score > 0);
  const overallScore = scoredObjectives.length > 0
    ? Math.round((scoredObjectives.reduce((sum, o) => sum + o.score, 0) / scoredObjectives.length) * 100) / 100
    : 0;

  return { overallScore, objectiveScores };
}

/** Get top N aligned objectives across all frameworks */
export function getTopAlignedObjectives(
  domainScores: Record<string, number>,
  count: number = 5
): { framework: string; objective: string; score: number }[] {
  const all: { framework: string; objective: string; score: number }[] = [];

  for (const fw of POLICY_FRAMEWORKS) {
    for (const obj of fw.objectives) {
      const score = calculateObjectiveAlignment(obj, domainScores);
      if (score > 0) {
        all.push({ framework: fw.shortName, objective: obj.name, score });
      }
    }
  }

  return all.sort((a, b) => b.score - a.score).slice(0, count);
}
