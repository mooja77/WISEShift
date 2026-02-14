// ─── Statistical Utilities ───
// Pure math functions — no npm dependencies.

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(v => (v - avg) ** 2);
  return Math.sqrt(squareDiffs.reduce((s, v) => s + v, 0) / (values.length - 1));
}

export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));

  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denom = Math.sqrt(sumX2 * sumY2);
  return denom === 0 ? 0 : sumXY / denom;
}

export function correlationMatrix(domainScoresByAssessment: Record<string, number>[], domainKeys: string[]): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  for (const dk1 of domainKeys) {
    matrix[dk1] = {};
    for (const dk2 of domainKeys) {
      const x = domainScoresByAssessment.map(a => a[dk1] ?? 0);
      const y = domainScoresByAssessment.map(a => a[dk2] ?? 0);
      matrix[dk1][dk2] = Math.round(pearsonCorrelation(x, y) * 100) / 100;
    }
  }
  return matrix;
}

export function histogram(values: number[], bins: number = 5, min: number = 0, max: number = 5): { binStart: number; binEnd: number; count: number }[] {
  const binWidth = (max - min) / bins;
  const result = Array.from({ length: bins }, (_, i) => ({
    binStart: Math.round((min + i * binWidth) * 100) / 100,
    binEnd: Math.round((min + (i + 1) * binWidth) * 100) / 100,
    count: 0,
  }));

  for (const v of values) {
    const binIdx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    if (binIdx >= 0 && binIdx < bins) {
      result[binIdx].count++;
    }
  }

  return result;
}
