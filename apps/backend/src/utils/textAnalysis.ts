/**
 * Text analysis utilities for Coding Canvas computed nodes.
 * All functions are pure — they take data arrays and return result objects.
 */

interface TranscriptData {
  id: string;
  title: string;
  content: string;
  caseId?: string | null;
}

interface CodingData {
  id: string;
  transcriptId: string;
  questionId: string;
  startOffset: number;
  endOffset: number;
  codedText: string;
}

interface QuestionData {
  id: string;
  text: string;
  color: string;
}

interface CaseData {
  id: string;
  name: string;
  attributes: Record<string, string>;
}

// ─── Stop words for English text analysis ───
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we',
  'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them',
  'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
  'not', 'no', 'nor', 'if', 'then', 'else', 'so', 'as', 'than', 'too',
  'very', 'just', 'about', 'above', 'after', 'again', 'all', 'also',
  'am', 'any', 'because', 'before', 'below', 'between', 'both', 'each',
  'few', 'get', 'got', 'here', 'into', 'more', 'most', 'much', 'must',
  'now', 'only', 'other', 'out', 'own', 'said', 'same', 'some', 'still',
  'such', 'take', 'there', 'through', 'under', 'up', 'us', 'well',
  'over', 'down', 'while', 'during', 'until', 'against', 'further',
  'once', 'upon', 'already', 'always', 'never', 'often', 'however',
  'although', 'since', 'within', 'without', 'like', 'even', 'also',
  'back', 'make', 'made', 'way', 'think', 'know', 'see', 'look',
  'come', 'go', 'going', 'went', 'really', 'thing', 'things',
]);

// ─── 1. Text Search ───

export function searchTranscripts(
  transcripts: TranscriptData[],
  pattern: string,
  mode: string,
  transcriptIds?: string[],
) {
  const contextWindow = 50;
  const matches: {
    transcriptId: string;
    transcriptTitle: string;
    offset: number;
    matchText: string;
    context: string;
  }[] = [];

  const filtered = transcriptIds?.length
    ? transcripts.filter(t => transcriptIds.includes(t.id))
    : transcripts;

  for (const t of filtered) {
    let regex: RegExp;
    try {
      if (mode === 'regex') {
        regex = new RegExp(pattern, 'gi');
      } else {
        regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      }
    } catch {
      continue;
    }

    let match: RegExpExecArray | null;
    while ((match = regex.exec(t.content)) !== null) {
      const start = Math.max(0, match.index - contextWindow);
      const end = Math.min(t.content.length, match.index + match[0].length + contextWindow);
      matches.push({
        transcriptId: t.id,
        transcriptTitle: t.title,
        offset: match.index,
        matchText: match[0],
        context: (start > 0 ? '...' : '') + t.content.slice(start, end) + (end < t.content.length ? '...' : ''),
      });
      // Prevent infinite loop on zero-length matches
      if (match[0].length === 0) regex.lastIndex++;
    }
  }

  return { matches };
}

// ─── 2. Co-occurrence ───

export function computeCooccurrence(
  codings: CodingData[],
  questionIds: string[],
  minOverlap?: number,
) {
  if (questionIds.length < 2) return { pairs: [] };

  const overlap = minOverlap ?? 1;

  // Group codings by transcript
  const byTranscript = new Map<string, CodingData[]>();
  for (const c of codings) {
    if (!questionIds.includes(c.questionId)) continue;
    const arr = byTranscript.get(c.transcriptId) || [];
    arr.push(c);
    byTranscript.set(c.transcriptId, arr);
  }

  // For each pair of question IDs, find overlapping ranges
  const pairMap = new Map<string, { questionIds: string[]; segments: any[]; }>();

  for (let i = 0; i < questionIds.length; i++) {
    for (let j = i + 1; j < questionIds.length; j++) {
      const qA = questionIds[i];
      const qB = questionIds[j];
      const key = `${qA}|${qB}`;
      const segments: any[] = [];

      for (const [tid, tCodings] of byTranscript) {
        const aCodes = tCodings.filter(c => c.questionId === qA);
        const bCodes = tCodings.filter(c => c.questionId === qB);

        for (const a of aCodes) {
          for (const b of bCodes) {
            const overlapStart = Math.max(a.startOffset, b.startOffset);
            const overlapEnd = Math.min(a.endOffset, b.endOffset);
            if (overlapEnd - overlapStart >= overlap) {
              segments.push({
                transcriptId: tid,
                text: a.codedText.slice(
                  Math.max(0, overlapStart - a.startOffset),
                  overlapEnd - a.startOffset,
                ),
                startOffset: overlapStart,
                endOffset: overlapEnd,
              });
            }
          }
        }
      }

      if (segments.length > 0) {
        pairMap.set(key, { questionIds: [qA, qB], segments });
      }
    }
  }

  return {
    pairs: Array.from(pairMap.values()).map(p => ({
      ...p,
      count: p.segments.length,
    })),
  };
}

// ─── 3. Framework Matrix ───

export function buildFrameworkMatrix(
  transcripts: TranscriptData[],
  questions: QuestionData[],
  codings: CodingData[],
  cases: CaseData[],
  questionIds?: string[],
  caseIds?: string[],
) {
  const filteredQuestions = questionIds?.length
    ? questions.filter(q => questionIds.includes(q.id))
    : questions;
  const filteredCases = caseIds?.length
    ? cases.filter(c => caseIds.includes(c.id))
    : cases;

  // Map transcript -> case
  const transcriptCaseMap = new Map<string, string>();
  for (const t of transcripts) {
    if (t.caseId) transcriptCaseMap.set(t.id, t.caseId);
  }

  const rows = filteredCases.map(cs => {
    // Get transcripts belonging to this case
    const caseTranscriptIds = transcripts
      .filter(t => t.caseId === cs.id)
      .map(t => t.id);

    const cells = filteredQuestions.map(q => {
      const cellCodings = codings.filter(
        c => c.questionId === q.id && caseTranscriptIds.includes(c.transcriptId),
      );
      return {
        questionId: q.id,
        excerpts: cellCodings.map(c => c.codedText).slice(0, 5),
        count: cellCodings.length,
      };
    });

    return { caseId: cs.id, caseName: cs.name, cells };
  });

  return { rows };
}

// ─── 4. Statistics ───

export function computeStats(
  codings: CodingData[],
  questions: QuestionData[],
  transcripts: TranscriptData[],
  groupBy: string,
  questionIds?: string[],
) {
  const filteredCodings = questionIds?.length
    ? codings.filter(c => questionIds.includes(c.questionId))
    : codings;

  const total = filteredCodings.length;

  if (groupBy === 'question') {
    const filteredQuestions = questionIds?.length
      ? questions.filter(q => questionIds.includes(q.id))
      : questions;

    const items = filteredQuestions.map(q => {
      const qCodings = filteredCodings.filter(c => c.questionId === q.id);
      const totalChars = qCodings.reduce((sum, c) => sum + (c.endOffset - c.startOffset), 0);
      const totalTranscriptChars = transcripts.reduce((sum, t) => sum + t.content.length, 0);
      return {
        id: q.id,
        label: q.text,
        count: qCodings.length,
        percentage: total > 0 ? Math.round((qCodings.length / total) * 100 * 10) / 10 : 0,
        coverage: totalTranscriptChars > 0 ? Math.round((totalChars / totalTranscriptChars) * 100 * 10) / 10 : 0,
      };
    });

    return { items, total };
  }

  // Group by transcript
  const items = transcripts.map(t => {
    const tCodings = filteredCodings.filter(c => c.transcriptId === t.id);
    const totalChars = tCodings.reduce((sum, c) => sum + (c.endOffset - c.startOffset), 0);
    return {
      id: t.id,
      label: t.title,
      count: tCodings.length,
      percentage: total > 0 ? Math.round((tCodings.length / total) * 100 * 10) / 10 : 0,
      coverage: t.content.length > 0 ? Math.round((totalChars / t.content.length) * 100 * 10) / 10 : 0,
    };
  });

  return { items, total };
}

// ─── 5. Comparison ───

export function computeComparison(
  codings: CodingData[],
  transcripts: TranscriptData[],
  questions: QuestionData[],
  transcriptIds: string[],
  questionIds?: string[],
) {
  const filteredTranscripts = transcriptIds.length
    ? transcripts.filter(t => transcriptIds.includes(t.id))
    : transcripts;
  const filteredQuestions = questionIds?.length
    ? questions.filter(q => questionIds.includes(q.id))
    : questions;

  const result = filteredTranscripts.map(t => {
    const profile = filteredQuestions.map(q => {
      const qCodings = codings.filter(c => c.transcriptId === t.id && c.questionId === q.id);
      const totalChars = qCodings.reduce((sum, c) => sum + (c.endOffset - c.startOffset), 0);
      return {
        questionId: q.id,
        count: qCodings.length,
        coverage: t.content.length > 0 ? Math.round((totalChars / t.content.length) * 100 * 10) / 10 : 0,
      };
    });
    return { id: t.id, title: t.title, profile };
  });

  return { transcripts: result };
}

// ─── 6. Word Frequency ───

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

export function computeWordFrequency(
  codings: CodingData[],
  questionId?: string,
  maxWords?: number,
  customStopWords?: string[],
) {
  const filtered = questionId
    ? codings.filter(c => c.questionId === questionId)
    : codings;

  const extraStops = new Set(customStopWords?.map(w => w.toLowerCase()) || []);
  const freq = new Map<string, number>();

  for (const c of filtered) {
    const tokens = tokenize(c.codedText);
    for (const token of tokens) {
      if (extraStops.has(token)) continue;
      freq.set(token, (freq.get(token) || 0) + 1);
    }
  }

  const words = Array.from(freq.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxWords || 100);

  return { words };
}

// ─── 7. Clustering (TF-IDF + K-Means) ───

function buildTfIdf(documents: string[][]): { vectors: number[][]; vocabulary: string[] } {
  // Build vocabulary
  const vocab = new Map<string, number>();
  const df = new Map<string, number>(); // document frequency

  for (const doc of documents) {
    const unique = new Set(doc);
    for (const term of unique) {
      df.set(term, (df.get(term) || 0) + 1);
    }
    for (const term of doc) {
      if (!vocab.has(term)) vocab.set(term, vocab.size);
    }
  }

  const vocabulary = Array.from(vocab.keys());
  const N = documents.length;

  // Build TF-IDF vectors
  const vectors = documents.map(doc => {
    const tf = new Map<string, number>();
    for (const term of doc) {
      tf.set(term, (tf.get(term) || 0) + 1);
    }
    return vocabulary.map(term => {
      const termFreq = (tf.get(term) || 0) / (doc.length || 1);
      const idf = Math.log((N + 1) / ((df.get(term) || 0) + 1)) + 1;
      return termFreq * idf;
    });
  });

  return { vectors, vocabulary };
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function kMeans(vectors: number[][], k: number, maxIter = 50): number[] {
  if (vectors.length === 0 || k <= 0) return [];
  const actualK = Math.min(k, vectors.length);
  const dim = vectors[0].length;

  let bestLabels: number[] = [];
  let bestScore = -Infinity;

  // 3 random restarts
  for (let restart = 0; restart < 3; restart++) {
    // Random initialization
    const indices = [...Array(vectors.length).keys()];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const centroids = indices.slice(0, actualK).map(i => [...vectors[i]]);
    const labels = new Array(vectors.length).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {
      // Assign
      let changed = false;
      for (let i = 0; i < vectors.length; i++) {
        let bestDist = -Infinity;
        let bestCluster = 0;
        for (let c = 0; c < actualK; c++) {
          const sim = cosineSimilarity(vectors[i], centroids[c]);
          if (sim > bestDist) {
            bestDist = sim;
            bestCluster = c;
          }
        }
        if (labels[i] !== bestCluster) {
          labels[i] = bestCluster;
          changed = true;
        }
      }
      if (!changed) break;

      // Update centroids
      for (let c = 0; c < actualK; c++) {
        const members = vectors.filter((_, i) => labels[i] === c);
        if (members.length === 0) continue;
        for (let d = 0; d < dim; d++) {
          centroids[c][d] = members.reduce((sum, v) => sum + v[d], 0) / members.length;
        }
      }
    }

    // Score: average intra-cluster similarity
    let totalSim = 0;
    for (let i = 0; i < vectors.length; i++) {
      totalSim += cosineSimilarity(vectors[i], centroids[labels[i]]);
    }
    const score = totalSim / vectors.length;

    if (score > bestScore) {
      bestScore = score;
      bestLabels = labels;
    }
  }

  return bestLabels;
}

export function computeClusters(
  codings: CodingData[],
  k: number,
  questionIds?: string[],
) {
  const filtered = questionIds?.length
    ? codings.filter(c => questionIds.includes(c.questionId))
    : codings;

  if (filtered.length === 0) return { clusters: [] };

  // Tokenize each coding
  const documents = filtered.map(c => tokenize(c.codedText));
  const { vectors, vocabulary } = buildTfIdf(documents);

  // Cluster
  const labels = kMeans(vectors, k);

  // Build cluster results
  const clusterMap = new Map<number, { segments: any[]; vectors: number[][] }>();
  for (let i = 0; i < filtered.length; i++) {
    const label = labels[i];
    if (!clusterMap.has(label)) clusterMap.set(label, { segments: [], vectors: [] });
    const cluster = clusterMap.get(label)!;
    cluster.segments.push({ codingId: filtered[i].id, text: filtered[i].codedText });
    cluster.vectors.push(vectors[i]);
  }

  const clusters = Array.from(clusterMap.entries()).map(([id, { segments, vectors: cvecs }]) => {
    // Top keywords: highest average TF-IDF scores in the cluster
    const avgVec = new Array(vocabulary.length).fill(0);
    for (const v of cvecs) {
      for (let d = 0; d < v.length; d++) avgVec[d] += v[d];
    }
    for (let d = 0; d < avgVec.length; d++) avgVec[d] /= cvecs.length;

    const keywords = avgVec
      .map((score, idx) => ({ word: vocabulary[idx], score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .filter(k => k.score > 0)
      .map(k => k.word);

    return {
      id,
      label: `Cluster ${id + 1}`,
      segments: segments.slice(0, 20), // Limit for display
      keywords,
    };
  });

  return { clusters };
}
