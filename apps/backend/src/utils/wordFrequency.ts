// Comprehensive English stop words + assessment-specific words to exclude
const STOP_WORDS = new Set([
  // English stop words
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does',
  'doing', 'don', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'get', 'got', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'isn', 'it', 'its', 'itself', 'just', 'let', 'll', 'may', 'me', 'might',
  'more', 'most', 'must', 'my', 'myself', 'need', 'no', 'nor', 'not', 'now',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves',
  'out', 'over', 'own', 'quite', 're', 's', 'same', 'shall', 'she', 'should',
  'so', 'some', 'such', 't', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'us', 've', 'very', 'was', 'wasn', 'we',
  'were', 'weren', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'will', 'with', 'won', 'would', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'also', 'like', 'well', 'one', 'two', 'three', 'much', 'many',
  'still', 'really', 'even', 'yes', 'however', 'already', 'often', 'always',

  // Assessment-specific words
  'describe', 'organisation', 'organization', 'please', 'explain', 'example',
  'provide', 'assessment', 'question', 'response', 'answer', 'comment',
  'currently', 'approach', 'ways', 'way', 'use', 'used', 'using', 'make',
  'made', 'think', 'feel', 'know', 'work', 'working', 'works', 'etc',
]);

/**
 * Extracts word frequencies from an array of text strings.
 * Lowercases, strips punctuation, removes stop words.
 * Returns top N words sorted by frequency.
 */
export function extractWordFrequencies(
  texts: string[],
  topN = 80
): { text: string; value: number }[] {
  const freq = new Map<string, number>();

  for (const text of texts) {
    if (!text) continue;

    const words = text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([text, value]) => ({ text, value }));
}
