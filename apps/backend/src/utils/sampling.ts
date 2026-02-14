// ─── Sampling Algorithms ───
// 4 strategies for qualitative research case selection.

interface CaseData {
  assessmentId: string;
  label: string;
  overallScore: number;
  domainScores: Record<string, number>;
  context: string;
}

export interface SampledCase extends CaseData {
  justification: string;
}

export type SamplingMethod = 'maximum_variation' | 'extreme_deviant' | 'typical' | 'purposive';

function euclideanDistance(a: Record<string, number>, b: Record<string, number>, keys: string[]): number {
  let sum = 0;
  for (const k of keys) {
    sum += ((a[k] ?? 0) - (b[k] ?? 0)) ** 2;
  }
  return Math.sqrt(sum);
}

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}

/** Maximum variation: greedy selection maximising Euclidean distance in score-space */
export function maximumVariation(cases: CaseData[], n: number, domainKeys: string[]): SampledCase[] {
  if (cases.length <= n) return cases.map(c => ({ ...c, justification: 'All available cases selected' }));

  const selected: SampledCase[] = [];
  const remaining = [...cases];

  // Start with the case that has the highest overall score
  remaining.sort((a, b) => b.overallScore - a.overallScore);
  const first = remaining.shift()!;
  selected.push({ ...first, justification: 'Highest overall score — initial anchor for maximum variation' });

  while (selected.length < n && remaining.length > 0) {
    let maxMinDist = -1;
    let bestIdx = 0;

    for (let i = 0; i < remaining.length; i++) {
      const minDist = Math.min(
        ...selected.map(s => euclideanDistance(remaining[i].domainScores, s.domainScores, domainKeys))
      );
      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        bestIdx = i;
      }
    }

    const picked = remaining.splice(bestIdx, 1)[0];
    selected.push({
      ...picked,
      justification: `Maximises distance from existing selections (min Euclidean distance: ${maxMinDist.toFixed(2)})`,
    });
  }

  return selected;
}

/** Extreme/deviant: top N/2 + bottom N/2 by overall score */
export function extremeDeviant(cases: CaseData[], n: number): SampledCase[] {
  const sorted = [...cases].sort((a, b) => a.overallScore - b.overallScore);
  const half = Math.ceil(n / 2);
  const bottom = sorted.slice(0, half);
  const top = sorted.slice(-Math.floor(n / 2));

  return [
    ...bottom.map(c => ({ ...c, justification: `Low-scoring case (score: ${c.overallScore.toFixed(2)}) — bottom of distribution` })),
    ...top.map(c => ({ ...c, justification: `High-scoring case (score: ${c.overallScore.toFixed(2)}) — top of distribution` })),
  ].slice(0, n);
}

/** Typical: closest to mean score vector */
export function typicalCases(cases: CaseData[], n: number, domainKeys: string[]): SampledCase[] {
  const meanScores: Record<string, number> = {};
  for (const dk of domainKeys) {
    meanScores[dk] = mean(cases.map(c => c.domainScores[dk] ?? 0));
  }

  const withDist = cases.map(c => ({
    ...c,
    dist: euclideanDistance(c.domainScores, meanScores, domainKeys),
  }));

  withDist.sort((a, b) => a.dist - b.dist);

  return withDist.slice(0, n).map(c => ({
    ...c,
    justification: `Closest to mean score profile (distance: ${c.dist.toFixed(2)})`,
  }));
}

/** Purposive: filter by criteria then Fisher-Yates shuffle */
export function purposiveSampling(
  cases: CaseData[],
  n: number,
  criteria: { country?: string; sector?: string; size?: string },
  fullCases: { assessmentId: string; country: string; sector: string; size: string }[],
): SampledCase[] {
  const criteriaMap = new Map(fullCases.map(fc => [fc.assessmentId, fc]));

  let filtered = cases.filter(c => {
    const info = criteriaMap.get(c.assessmentId);
    if (!info) return false;
    if (criteria.country && info.country !== criteria.country) return false;
    if (criteria.sector && info.sector !== criteria.sector) return false;
    if (criteria.size && info.size !== criteria.size) return false;
    return true;
  });

  const criteriaStr = Object.entries(criteria).filter(([_, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ');
  filtered = shuffle(filtered);

  return filtered.slice(0, n).map(c => ({
    ...c,
    justification: `Randomly selected from cases matching criteria: ${criteriaStr}`,
  }));
}

/** Generate methodology text for the selected method */
export function generateMethodologyText(method: SamplingMethod, n: number, totalCases: number): string {
  switch (method) {
    case 'maximum_variation':
      return `Maximum variation sampling was employed to select ${n} cases from a pool of ${totalCases} completed assessments. Cases were iteratively selected to maximise Euclidean distance in the multi-dimensional score space across all ${8} assessment domains, ensuring the sample captures the widest possible range of organisational profiles and performance levels (Patton, 2015).`;
    case 'extreme_deviant':
      return `Extreme/deviant case sampling was used to identify ${n} cases from ${totalCases} completed assessments. The sample comprises the ${Math.ceil(n / 2)} lowest-scoring and ${Math.floor(n / 2)} highest-scoring organisations by overall assessment score, enabling analysis of factors differentiating high-performing WISEs from those in earlier stages of development (Flyvbjerg, 2006).`;
    case 'typical':
      return `Typical case sampling was applied to select ${n} cases from ${totalCases} completed assessments. Cases closest to the mean score profile across all domains were selected using Euclidean distance, providing a sample representative of the "typical" WISE in the dataset (Patton, 2015).`;
    case 'purposive':
      return `Purposive sampling was used to select ${n} cases from ${totalCases} completed assessments, filtered by specified criteria (country, sector, and/or organisation size). From the qualifying cases, a random subsample was drawn using Fisher-Yates shuffling to reduce selection bias within the purposive frame (Palinkas et al., 2015).`;
  }
}
