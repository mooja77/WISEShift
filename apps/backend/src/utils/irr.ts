// ─── Inter-Rater Reliability (Cohen's Kappa) ───
// No npm dependency — pure math.

export interface TagAgreement {
  tagName: string;
  observed: number; // proportion of agreement
  expected: number; // expected agreement by chance
  kappa: number;
  interpretation: string;
  rater1Count: number;
  rater2Count: number;
  bothCount: number;
  totalResponses: number;
}

export interface IRRResult {
  overallKappa: number;
  overallInterpretation: string;
  percentageAgreement: number;
  totalSharedResponses: number;
  perTag: TagAgreement[];
}

function interpretKappa(kappa: number): string {
  if (kappa < 0) return 'Poor';
  if (kappa < 0.21) return 'Slight';
  if (kappa < 0.41) return 'Fair';
  if (kappa < 0.61) return 'Moderate';
  if (kappa < 0.81) return 'Substantial';
  return 'Almost Perfect';
}

/**
 * Compute Cohen's kappa for binary coding decisions.
 * For each response, each rater either applied a tag (1) or didn't (0).
 */
function cohensKappa(
  rater1: boolean[],
  rater2: boolean[],
): { observed: number; expected: number; kappa: number } {
  const n = rater1.length;
  if (n === 0) return { observed: 0, expected: 0, kappa: 0 };

  let a = 0; // both yes
  let b = 0; // rater1 yes, rater2 no
  let c = 0; // rater1 no, rater2 yes
  let d = 0; // both no

  for (let i = 0; i < n; i++) {
    if (rater1[i] && rater2[i]) a++;
    else if (rater1[i] && !rater2[i]) b++;
    else if (!rater1[i] && rater2[i]) c++;
    else d++;
  }

  const observed = (a + d) / n;
  const pYes1 = (a + b) / n;
  const pYes2 = (a + c) / n;
  const pNo1 = (c + d) / n;
  const pNo2 = (b + d) / n;
  const expected = (pYes1 * pYes2) + (pNo1 * pNo2);

  const kappa = expected === 1 ? 1 : (observed - expected) / (1 - expected);

  return { observed, expected, kappa: Math.round(kappa * 100) / 100 };
}

export function calculateIRR(
  sharedResponseIds: string[],
  rater1Tags: Map<string, Set<string>>, // responseId -> Set<tagName>
  rater2Tags: Map<string, Set<string>>,
  allTagNames: string[],
): IRRResult {
  const perTag: TagAgreement[] = [];
  let totalAgreed = 0;
  let totalDecisions = 0;

  for (const tagName of allTagNames) {
    const r1Decisions = sharedResponseIds.map(rid => rater1Tags.get(rid)?.has(tagName) ?? false);
    const r2Decisions = sharedResponseIds.map(rid => rater2Tags.get(rid)?.has(tagName) ?? false);

    const { observed, expected, kappa } = cohensKappa(r1Decisions, r2Decisions);

    const rater1Count = r1Decisions.filter(Boolean).length;
    const rater2Count = r2Decisions.filter(Boolean).length;
    const bothCount = r1Decisions.filter((v, i) => v && r2Decisions[i]).length;

    perTag.push({
      tagName,
      observed: Math.round(observed * 100) / 100,
      expected: Math.round(expected * 100) / 100,
      kappa,
      interpretation: interpretKappa(kappa),
      rater1Count,
      rater2Count,
      bothCount,
      totalResponses: sharedResponseIds.length,
    });

    // For overall calculation
    totalAgreed += r1Decisions.filter((v, i) => v === r2Decisions[i]).length;
    totalDecisions += sharedResponseIds.length;
  }

  const percentageAgreement = totalDecisions > 0
    ? Math.round((totalAgreed / totalDecisions) * 100)
    : 0;

  // Overall kappa = mean of per-tag kappas (weighted equally)
  const validKappas = perTag.filter(t => !isNaN(t.kappa)).map(t => t.kappa);
  const overallKappa = validKappas.length > 0
    ? Math.round((validKappas.reduce((s, k) => s + k, 0) / validKappas.length) * 100) / 100
    : 0;

  return {
    overallKappa,
    overallInterpretation: interpretKappa(overallKappa),
    percentageAgreement,
    totalSharedResponses: sharedResponseIds.length,
    perTag,
  };
}
