import { useState, useEffect, useCallback, useRef } from 'react';
import type { ResearchTag, QueryNode, SavedQuery, QueryResultItem } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import toast from 'react-hot-toast';

type OperatorType = 'AND' | 'OR' | 'NOT';

interface TagSlot {
  id: string; // unique key for React rendering
  tagId: string | ''; // '' means not yet selected
}

const OPERATOR_LABELS: Record<OperatorType, string> = {
  AND: 'All of these',
  OR: 'Any of these',
  NOT: 'First but not second',
};

const OPERATOR_DESCRIPTIONS: Record<OperatorType, string> = {
  AND: 'Find passages where all selected themes appear together',
  OR: 'Find passages where at least one of these themes appears',
  NOT: 'Find passages with the first theme but exclude those with the second',
};

let slotCounter = 0;
function nextSlotId(): string {
  slotCounter += 1;
  return `slot-${slotCounter}`;
}

export default function QueryBuilder() {
  // ── Tags ──
  const [tags, setTags] = useState<ResearchTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);

  // ── Query state ──
  const [operator, setOperator] = useState<OperatorType>('AND');
  const [slots, setSlots] = useState<TagSlot[]>([
    { id: nextSlotId(), tagId: '' },
    { id: nextSlotId(), tagId: '' },
  ]);

  // ── Live count ──
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Results ──
  const [results, setResults] = useState<QueryResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const pageSize = 20;

  // ── Saved queries ──
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Load tags ──
  useEffect(() => {
    loadTags();
    loadSavedQueries();
  }, []);

  const loadTags = async () => {
    setTagsLoading(true);
    try {
      const res = await researchApi.getTags();
      setTags(res.data.data || []);
    } catch {
      toast.error('Failed to load themes');
    } finally {
      setTagsLoading(false);
    }
  };

  const loadSavedQueries = async () => {
    try {
      const res = await researchApi.getSavedQueries();
      setSavedQueries(res.data.data || []);
    } catch {
      // silent
    }
  };

  // ── Build query tree from current state ──
  const buildQuery = useCallback((): QueryNode | null => {
    const filledSlots = slots.filter(s => s.tagId !== '');
    if (filledSlots.length < 2) return null;

    const operands: QueryNode[] = filledSlots.map(s => ({ tagId: s.tagId }));
    return { operator, operands };
  }, [operator, slots]);

  // ── Live count with debounce ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = buildQuery();
    if (!query) {
      setLiveCount(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setCountLoading(true);
      try {
        const res = await researchApi.executeQuery(query, 1, 1);
        setLiveCount(res.data.data.total);
      } catch {
        setLiveCount(null);
      } finally {
        setCountLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [buildQuery]);

  // ── Execute query ──
  const handleExecute = async (p = 1) => {
    const query = buildQuery();
    if (!query) {
      toast.error('Select at least 2 themes to search');
      return;
    }

    setResultsLoading(true);
    setShowResults(true);
    try {
      const res = await researchApi.executeQuery(query, p, pageSize);
      const data = res.data.data;
      setResults(data.results);
      setTotal(data.total);
      setPage(p);
    } catch {
      toast.error('Failed to execute query');
    } finally {
      setResultsLoading(false);
    }
  };

  // ── Save query ──
  const handleSave = async () => {
    const query = buildQuery();
    if (!query) {
      toast.error('Build a query with at least 2 themes first');
      return;
    }
    if (!saveName.trim()) {
      toast.error('Enter a name for this query');
      return;
    }

    setSaving(true);
    try {
      await researchApi.saveQuery(saveName.trim(), query);
      toast.success('Query saved');
      setSaveName('');
      loadSavedQueries();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to save query';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete saved query ──
  const handleDelete = async (id: string) => {
    try {
      await researchApi.deleteQuery(id);
      toast.success('Query deleted');
      setDeleteConfirm(null);
      loadSavedQueries();
    } catch {
      toast.error('Failed to delete query');
    }
  };

  // ── Load a saved query into the builder ──
  const loadQuery = (saved: SavedQuery) => {
    const q = saved.query;
    if ('operator' in q && 'operands' in q) {
      setOperator(q.operator);
      const newSlots: TagSlot[] = q.operands.map(op => ({
        id: nextSlotId(),
        tagId: 'tagId' in op ? op.tagId : '',
      }));
      // Ensure at least 2 slots
      while (newSlots.length < 2) {
        newSlots.push({ id: nextSlotId(), tagId: '' });
      }
      setSlots(newSlots);
    }
    setShowResults(false);
    setResults([]);
  };

  // ── Quick-start templates ──
  const applyTemplate = (op: OperatorType) => {
    setOperator(op);
    setSlots([
      { id: nextSlotId(), tagId: '' },
      { id: nextSlotId(), tagId: '' },
    ]);
    setShowResults(false);
    setResults([]);
  };

  // ── Slot management ──
  const updateSlotTag = (slotId: string, tagId: string) => {
    setSlots(prev => prev.map(s => (s.id === slotId ? { ...s, tagId } : s)));
    setShowResults(false);
  };

  const addSlot = () => {
    if (slots.length >= 10) return;
    setSlots(prev => [...prev, { id: nextSlotId(), tagId: '' }]);
  };

  const removeSlot = (slotId: string) => {
    if (slots.length <= 2) return;
    setSlots(prev => prev.filter(s => s.id !== slotId));
    setShowResults(false);
  };

  // ── Helpers ──
  const getTagById = (id: string) => tags.find(t => t.id === id);
  const filledCount = slots.filter(s => s.tagId !== '').length;
  const canExecute = filledCount >= 2;
  const totalPages = Math.ceil(total / pageSize);

  // Describe an operator in saved queries list
  const describeQuery = (q: QueryNode): string => {
    if ('tagId' in q) {
      const t = getTagById(q.tagId);
      return t?.name || 'Unknown';
    }
    const label = OPERATOR_LABELS[q.operator] || q.operator;
    const names = q.operands.map(op => {
      if ('tagId' in op) {
        const t = getTagById(op.tagId);
        return t?.name || '?';
      }
      return '(nested)';
    });
    return `${label}: ${names.join(', ')}`;
  };

  if (tagsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading themes...</span>
      </div>
    );
  }

  if (tags.length < 2) {
    return (
      <div className="card text-center py-16">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Create themes first</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          You need at least 2 themes (tags) with coded passages to build queries. Use the Explorer tab to highlight text and assign themes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Query</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Find passages by combining themes
        </p>
      </div>

      {/* Quick-start templates */}
      <div className="card">
        <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Quick start</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => applyTemplate('AND')}
            className="btn-secondary text-sm"
          >
            Themes that appear together
          </button>
          <button
            onClick={() => applyTemplate('OR')}
            className="btn-secondary text-sm"
          >
            Either of these themes
          </button>
          <button
            onClick={() => applyTemplate('NOT')}
            className="btn-secondary text-sm"
          >
            This theme but not that
          </button>
        </div>
      </div>

      {/* Query sentence builder */}
      <div className="card">
        {/* Operator selector */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Combine themes using:</p>
          <div className="flex flex-wrap gap-2">
            {(['AND', 'OR', 'NOT'] as OperatorType[]).map(op => (
              <button
                key={op}
                onClick={() => { setOperator(op); setShowResults(false); }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  operator === op
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {OPERATOR_LABELS[op]}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            {OPERATOR_DESCRIPTIONS[operator]}
          </p>
        </div>

        {/* Sentence builder */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Show passages tagged with:
          </p>

          <div className="space-y-3">
            {slots.map((slot, idx) => (
              <div key={slot.id} className="flex items-center gap-2">
                {/* Operator label between slots */}
                {idx > 0 && (
                  <span className="inline-flex min-w-[80px] items-center justify-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                    {operator === 'NOT' && idx === 1 ? 'but not' : operator === 'AND' ? 'and' : 'or'}
                  </span>
                )}
                {idx === 0 && (
                  <span className="inline-flex min-w-[80px] items-center justify-center text-xs text-transparent">
                    placeholder
                  </span>
                )}

                {/* Tag dropdown */}
                <div className="relative flex-1">
                  <select
                    value={slot.tagId}
                    onChange={e => updateSlotTag(slot.id, e.target.value)}
                    className="input w-full appearance-none pr-8"
                  >
                    <option value="">-- Select a theme --</option>
                    {tags.map(tag => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>

                  {/* Color dot overlay */}
                  {slot.tagId && getTagById(slot.tagId) && (
                    <span
                      className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
                      style={{ backgroundColor: getTagById(slot.tagId)!.color }}
                    />
                  )}
                </div>

                {/* Remove button */}
                {slots.length > 2 && (
                  <button
                    onClick={() => removeSlot(slot.id)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    title="Remove this theme"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add another tag */}
          {slots.length < 10 && (
            <button
              onClick={addSlot}
              className="mt-3 flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add another theme
            </button>
          )}
        </div>

        {/* Live match count & action buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {countLoading ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                Counting...
              </span>
            ) : liveCount !== null ? (
              <span>
                ~<strong className="text-gray-900 dark:text-gray-100">{liveCount}</strong>{' '}
                passage{liveCount !== 1 ? 's' : ''} match
              </span>
            ) : canExecute ? null : (
              <span className="text-gray-400 dark:text-gray-500">Select at least 2 themes</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleExecute(1)}
              disabled={!canExecute || resultsLoading}
              className="btn-primary"
            >
              {resultsLoading ? 'Searching...' : 'Show Results'}
            </button>
          </div>
        </div>
      </div>

      {/* Save query */}
      <div className="card">
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Save this query</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            placeholder="e.g. Funding + Mission drift"
            className="input flex-1"
            maxLength={200}
          />
          <button
            onClick={handleSave}
            disabled={saving || !canExecute || !saveName.trim()}
            className="btn-secondary whitespace-nowrap"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Results area */}
      {showResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Results
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                ({total} passage{total !== 1 ? 's' : ''})
              </span>
            </h3>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => handleExecute(page - 1)}
                  disabled={page <= 1 || resultsLoading}
                  className="btn-secondary px-2 py-1 text-xs"
                >
                  Previous
                </button>
                <span className="text-gray-500 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => handleExecute(page + 1)}
                  disabled={page >= totalPages || resultsLoading}
                  className="btn-secondary px-2 py-1 text-xs"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {resultsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            </div>
          ) : results.length === 0 ? (
            <div className="card text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <h4 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">No matches</h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No passages match your query. Try using &ldquo;Any of these&rdquo; instead of &ldquo;All of these&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(r => (
                <ResultCard key={r.responseId} result={r} tags={tags} />
              ))}
            </div>
          )}

          {/* Bottom pagination */}
          {!resultsLoading && totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => handleExecute(page - 1)}
                disabled={page <= 1}
                className="btn-secondary px-3 py-1 text-sm"
              >
                Previous
              </button>
              <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handleExecute(page + 1)}
                disabled={page >= totalPages}
                className="btn-secondary px-3 py-1 text-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Saved queries */}
      {savedQueries.length > 0 && (
        <div className="card">
          <button
            onClick={() => setSavedOpen(prev => !prev)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Saved Queries ({savedQueries.length})
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-gray-400 transition-transform ${savedOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {savedOpen && (
            <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
              {savedQueries.map(sq => (
                <div key={sq.id} className="flex items-center justify-between py-2">
                  <button
                    onClick={() => loadQuery(sq)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {sq.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {describeQuery(sq.query)}
                    </p>
                  </button>

                  {deleteConfirm === sq.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(sq.id)}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(sq.id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Delete saved query"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Result Card sub-component ──
function ResultCard({ result, tags }: { result: QueryResultItem; tags: ResearchTag[] }) {
  const [expanded, setExpanded] = useState(false);

  const scoreColor =
    result.domainScore !== null
      ? result.domainScore >= 4
        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
        : result.domainScore >= 3
          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';

  const matchingTags = result.matchingTagIds
    .map(id => tags.find(t => t.id === id))
    .filter(Boolean) as ResearchTag[];

  const textPreview = result.textValue.length > 300 && !expanded
    ? result.textValue.slice(0, 300) + '...'
    : result.textValue;

  return (
    <div className="card">
      {/* Header */}
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{result.questionText}</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{result.anonymisedContext}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scoreColor}`}>
            {result.domainScore !== null ? `${result.domainScore.toFixed(1)}/5` : 'N/A'}
          </span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            {result.domainName}
          </span>
        </div>
      </div>

      {/* Text */}
      <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
        {textPreview}
      </p>
      {result.textValue.length > 300 && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="mt-1 text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}

      {/* Matching tags */}
      {matchingTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-2 dark:border-gray-800">
          <span className="text-xs text-gray-400 dark:text-gray-500 self-center mr-1">Matched:</span>
          {matchingTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
