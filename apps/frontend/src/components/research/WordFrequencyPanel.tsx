import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DOMAINS } from '@wiseshift/shared';
import type { WordFrequencyEntry } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import { useResearchStore } from '../../stores/researchStore';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Wordcloud } from '@visx/wordcloud';
import { Text } from '@visx/text';
import toast from 'react-hot-toast';

type ViewMode = 'cloud' | 'table';
type SortField = 'count' | 'text' | 'percentage';
type SortDir = 'asc' | 'desc';

interface WordDatum {
  text: string;
  count: number;
  percentage: number;
}

const CLOUD_HEIGHT = 400;
const FONT_MIN = 12;
const FONT_MAX = 60;

export default function WordFrequencyPanel() {
  const searchInExplorer = useResearchStore(s => s.searchInExplorer);

  const [view, setView] = useState<ViewMode>('cloud');
  const [domainKey, setDomainKey] = useState('');
  const [minLength, setMinLength] = useState(3);
  const [words, setWords] = useState<WordFrequencyEntry[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [uniqueWords, setUniqueWords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [tooltip, setTooltip] = useState<{ word: string; count: number; percentage: number; x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(700);

  // Observe container width for responsive cloud
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(Math.floor(entry.contentRect.width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch data
  useEffect(() => {
    loadData();
  }, [domainKey, minLength]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await researchApi.getWordFrequency({
        minLength,
        minCount: 2,
        domainKey: domainKey || undefined,
        limit: 200,
      });
      const data = res.data.data;
      setWords(data.words);
      setTotalWords(data.totalWords);
      setUniqueWords(data.uniqueWords);
    } catch {
      toast.error('Failed to load word frequency data');
    } finally {
      setLoading(false);
    }
  };

  // Font size scale
  const fontScale = useMemo(() => {
    if (words.length === 0) return () => FONT_MIN;
    const maxCount = Math.max(...words.map(w => w.count));
    const minCount = Math.min(...words.map(w => w.count));
    const range = maxCount - minCount || 1;
    return (count: number) =>
      FONT_MIN + ((count - minCount) / range) * (FONT_MAX - FONT_MIN);
  }, [words]);

  // Color scale: brand-400 (low) to brand-700 (high), with dark mode variants
  const colorScale = useMemo(() => {
    if (words.length === 0) return () => '#7c3aed';
    const maxCount = Math.max(...words.map(w => w.count));
    const minCount = Math.min(...words.map(w => w.count));
    const range = maxCount - minCount || 1;

    // Check dark mode
    const isDark = document.documentElement.classList.contains('dark');

    // Light mode: brand-400 (#a78bfa) -> brand-700 (#6d28d9)
    // Dark mode: brand-300 (#c4b5fd) -> brand-500 (#8b5cf6)
    const lightStart = [167, 139, 250]; // brand-400
    const lightEnd = [109, 40, 217];    // brand-700
    const darkStart = [196, 181, 253];  // brand-300
    const darkEnd = [139, 92, 246];     // brand-500

    const start = isDark ? darkStart : lightStart;
    const end = isDark ? darkEnd : lightEnd;

    return (count: number) => {
      const t = (count - minCount) / range;
      const r = Math.round(start[0] + t * (end[0] - start[0]));
      const g = Math.round(start[1] + t * (end[1] - start[1]));
      const b = Math.round(start[2] + t * (end[2] - start[2]));
      return `rgb(${r},${g},${b})`;
    };
  }, [words]);

  // Rotation: 0 or 90 degrees only
  const getRotation = useCallback(() => {
    return Math.random() > 0.7 ? 90 : 0;
  }, []);

  // Sorted words for table view
  const sortedWords = useMemo(() => {
    const sorted = [...words];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'text') {
        cmp = a.text.localeCompare(b.text);
      } else if (sortField === 'count') {
        cmp = a.count - b.count;
      } else {
        cmp = a.percentage - b.percentage;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [words, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'text' ? 'asc' : 'desc');
    }
  };

  const handleWordClick = (word: string) => {
    searchInExplorer(word);
  };

  const handleExportCsv = () => {
    if (words.length === 0) return;
    const rows = [['Rank', 'Word', 'Count', 'Percentage'].join(',')];
    sortedWords.forEach((w, i) => {
      rows.push([i + 1, `"${w.text}"`, w.count, `${w.percentage}%`].join(','));
    });
    const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `word-frequencies-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortArrow = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Words</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              See which words appear most often across all responses
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <button
              onClick={() => setView('cloud')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                view === 'cloud'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Cloud
            </button>
            <button
              onClick={() => setView('table')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                view === 'table'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Table
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <label htmlFor="wf-domain" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Domain:
            </label>
            <select
              id="wf-domain"
              value={domainKey}
              onChange={e => setDomainKey(e.target.value)}
              className="input w-48 py-1 text-sm"
            >
              <option value="">All domains</option>
              {DOMAINS.map(d => (
                <option key={d.key} value={d.key}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="wf-minlen" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Min length:
            </label>
            <input
              id="wf-minlen"
              type="range"
              min={2}
              max={8}
              value={minLength}
              onChange={e => setMinLength(parseInt(e.target.value, 10))}
              className="h-2 w-28 cursor-pointer accent-brand-600"
            />
            <span className="min-w-[2ch] text-sm font-mono text-gray-600 dark:text-gray-400">
              {minLength}
            </span>
          </div>

          {words.length > 0 && (
            <p className="ml-auto text-xs text-gray-500 dark:text-gray-400">
              {words.length} words shown &middot; {totalWords.toLocaleString()} total tokens &middot; {uniqueWords.toLocaleString()} unique
            </p>
          )}
        </div>
      </div>

      {/* Empty state */}
      {words.length === 0 && !loading && (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <svg className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Complete some assessments with narrative responses to see word patterns.
          </p>
        </div>
      )}

      {/* Cloud View */}
      {view === 'cloud' && words.length > 0 && (
        <div className="card relative" ref={containerRef}>
          <div
            className="relative overflow-hidden"
            style={{ height: CLOUD_HEIGHT }}
            onMouseLeave={() => setTooltip(null)}
          >
            <Wordcloud<WordDatum>
              words={words.map(w => ({ text: w.text, count: w.count, percentage: w.percentage }))}
              width={containerWidth - 48}
              height={CLOUD_HEIGHT}
              fontSize={(d) => fontScale(d.count)}
              font="Inter, system-ui, sans-serif"
              fontWeight={600}
              padding={2}
              rotate={getRotation}
              spiral="archimedean"
              random={() => 0.5}
            >
              {cloudWords =>
                cloudWords.map((w, i) => {
                  const datum = words.find(wd => wd.text === w.text);
                  const count = datum?.count ?? 0;
                  const percentage = datum?.percentage ?? 0;
                  return (
                    <Text
                      key={`${w.text}-${i}`}
                      textAnchor="middle"
                      verticalAnchor="middle"
                      x={w.x}
                      y={w.y}
                      fontSize={w.size}
                      fontFamily={w.font}
                      fontWeight={w.weight}
                      fill={colorScale(count)}
                      style={{
                        cursor: 'pointer',
                        transition: 'opacity 150ms',
                      }}
                      transform={`rotate(${w.rotate})`}
                      onClick={() => handleWordClick(w.text ?? '')}
                      onMouseMove={(e) => {
                        const rect = (e.currentTarget as unknown as SVGElement).closest('svg')?.getBoundingClientRect();
                        if (rect) {
                          setTooltip({
                            word: w.text ?? '',
                            count,
                            percentage,
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                          });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {w.text}
                    </Text>
                  );
                })
              }
            </Wordcloud>

            {/* Tooltip */}
            {tooltip && (
              <div
                className="pointer-events-none absolute z-50 rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg dark:bg-gray-700"
                style={{
                  left: tooltip.x + 12,
                  top: tooltip.y - 8,
                  transform: 'translateY(-100%)',
                }}
              >
                <span className="font-semibold">{tooltip.word}</span>: {tooltip.count.toLocaleString()} ({tooltip.percentage}%)
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
            Click any word to search for it in the Explorer
          </p>
        </div>
      )}

      {/* Table View */}
      {view === 'table' && words.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left dark:border-gray-700">
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-12">#</th>
                  <th
                    className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-200"
                    onClick={() => handleSort('text')}
                  >
                    Word{sortArrow('text')}
                  </th>
                  <th
                    className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-200 text-right"
                    onClick={() => handleSort('count')}
                  >
                    Count{sortArrow('count')}
                  </th>
                  <th
                    className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-200 text-right"
                    onClick={() => handleSort('percentage')}
                  >
                    % of Total{sortArrow('percentage')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedWords.map((w, i) => (
                  <tr
                    key={w.text}
                    className={`border-b border-gray-100 transition-colors hover:bg-brand-50 dark:border-gray-800 dark:hover:bg-brand-950 ${
                      i % 2 === 1 ? 'bg-gray-50 dark:bg-gray-900/50' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => handleWordClick(w.text)}
                        className="font-medium text-brand-600 hover:text-brand-800 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        {w.text}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {w.count.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {w.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export row */}
      {words.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleExportCsv}
            className="btn-secondary text-sm"
          >
            Download as CSV
          </button>
        </div>
      )}
    </div>
  );
}
