import { useState, useEffect, useCallback } from 'react';
import type { NarrativeSearchResponse, ResearchTag, TextHighlight } from '@wiseshift/shared';
import { DOMAINS } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import NarrativeFilters from './NarrativeFilters';
import NarrativeCard from './NarrativeCard';
import TagPalette from './TagPalette';
import { LoadingSpinner } from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function NarrativeExplorer() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    domainKeys: [] as string[],
    countries: [] as string[],
    sectors: [] as string[],
    sizes: [] as string[],
    scoreMin: undefined as number | undefined,
    scoreMax: undefined as number | undefined,
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NarrativeSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<ResearchTag[]>([]);
  const [highlightsMap, setHighlightsMap] = useState<Record<string, TextHighlight[]>>({});
  const [showTagPalette, setShowTagPalette] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    try {
      const res = await researchApi.getTags();
      setTags(res.data.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  // Search narratives
  const fetchNarratives = useCallback(async () => {
    setLoading(true);
    try {
      const res = await researchApi.searchNarratives({
        search: debouncedSearch || undefined,
        domainKeys: filters.domainKeys.length ? filters.domainKeys : undefined,
        countries: filters.countries.length ? filters.countries : undefined,
        sectors: filters.sectors.length ? filters.sectors : undefined,
        sizes: filters.sizes.length ? filters.sizes : undefined,
        scoreMin: filters.scoreMin,
        scoreMax: filters.scoreMax,
        page,
        pageSize: 20,
      });
      setData(res.data.data);

      // Fetch highlights for all results in one batch call
      const responseIds = res.data.data.results.map((r: any) => r.responseId);
      if (responseIds.length > 0) {
        try {
          const hlRes = await researchApi.getHighlightsBatch(responseIds);
          setHighlightsMap(hlRes.data.data);
        } catch {
          setHighlightsMap({});
        }
      } else {
        setHighlightsMap({});
      }
    } catch {
      toast.error('Failed to search narratives');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, page]);

  useEffect(() => { fetchNarratives(); }, [fetchNarratives]);

  // Reset page on filter/search change
  useEffect(() => { setPage(1); }, [debouncedSearch, filters]);

  const refreshHighlights = useCallback(async () => {
    if (!data) return;
    const responseIds = data.results.map(r => r.responseId);
    if (responseIds.length > 0) {
      try {
        const hlRes = await researchApi.getHighlightsBatch(responseIds);
        setHighlightsMap(hlRes.data.data);
      } catch {
        setHighlightsMap({});
      }
    }
  }, [data]);

  const handlePinQuote = async (responseId: string, quoteText: string) => {
    try {
      await researchApi.createQuote({ responseId, quoteText });
      toast.success('Quote pinned');
    } catch {
      toast.error('Failed to pin quote');
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search narratives (e.g. 'social clause', 'funding'...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-full pl-10"
          />
        </div>

        {/* Filters */}
        <NarrativeFilters {...filters} onChange={setFilters} />

        {/* Domain counts */}
        {data && debouncedSearch && Object.keys(data.domainCounts).length > 0 && (
          <div className="rounded-lg bg-brand-50 px-4 py-2 text-sm text-brand-800">
            <span className="font-medium">{data.total} result{data.total !== 1 ? 's' : ''}</span>
            {': '}
            {Object.entries(data.domainCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([key, count]) => {
                const domain = DOMAINS.find(d => d.key === key) || DOMAINS.find(d => d.key === key.replace(/_/g, '-'));
                const name = domain?.shortName || key;
                return `${count} in ${name}`;
              })
              .join(', ')}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : data && data.results.length > 0 ? (
          <div className="space-y-3">
            {data.results.map(r => (
              <NarrativeCard
                key={r.responseId}
                result={r}
                searchTerm={debouncedSearch}
                tags={tags}
                highlights={highlightsMap[r.responseId] || []}
                onHighlightChange={refreshHighlights}
                onPinQuote={handlePinQuote}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
            <p className="text-sm text-gray-500">
              {debouncedSearch ? 'No narratives match your search.' : 'No narrative responses found. Complete some assessments first.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Tag palette sidebar */}
      <div className="hidden w-64 flex-shrink-0 lg:block">
        <div className="sticky top-4">
          <button
            onClick={() => setShowTagPalette(!showTagPalette)}
            className="mb-2 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Tags ({tags.length})
            <svg className={`h-4 w-4 transition-transform ${showTagPalette ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {showTagPalette && <TagPalette tags={tags} onTagsChange={fetchTags} />}
        </div>
      </div>
    </div>
  );
}
