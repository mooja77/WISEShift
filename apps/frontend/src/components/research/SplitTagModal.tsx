import { useState, useMemo } from 'react';
import type { ResearchTag, TextHighlight } from '@wiseshift/shared';
import { TAG_COLORS } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import toast from 'react-hot-toast';

interface Bucket {
  name: string;
  color: string;
}

interface Props {
  tag: ResearchTag;
  highlights: TextHighlight[];
  onClose: () => void;
  onSplit: () => void;
}

export default function SplitTagModal({ tag, highlights, onClose, onSplit }: Props) {
  const [buckets, setBuckets] = useState<Bucket[]>([
    { name: '', color: TAG_COLORS[0] },
    { name: '', color: TAG_COLORS[1] },
  ]);
  // Map from highlight ID to bucket index
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const updateBucket = (index: number, update: Partial<Bucket>) => {
    setBuckets(prev => prev.map((b, i) => (i === index ? { ...b, ...update } : b)));
  };

  const addBucket = () => {
    const nextColor = TAG_COLORS[buckets.length % TAG_COLORS.length];
    setBuckets(prev => [...prev, { name: '', color: nextColor }]);
  };

  const removeBucket = (index: number) => {
    if (buckets.length <= 2) return;
    setBuckets(prev => prev.filter((_, i) => i !== index));
    // Clear assignments pointing to this or higher buckets
    setAssignments(prev => {
      const next: Record<string, number> = {};
      for (const [hId, bIdx] of Object.entries(prev)) {
        if (bIdx === index) continue;
        next[hId] = bIdx > index ? bIdx - 1 : bIdx;
      }
      return next;
    });
  };

  const assignHighlight = (highlightId: string, bucketIndex: number) => {
    setAssignments(prev => ({ ...prev, [highlightId]: bucketIndex }));
  };

  // Validate: every bucket must have at least one highlight and a name
  const canSplit = useMemo(() => {
    if (buckets.length < 2) return false;
    if (buckets.some(b => !b.name.trim())) return false;

    // Each bucket needs at least one highlight
    const bucketCounts = new Map<number, number>();
    for (const bIdx of Object.values(assignments)) {
      bucketCounts.set(bIdx, (bucketCounts.get(bIdx) || 0) + 1);
    }

    // All assignments must be valid bucket indices
    for (const bIdx of Object.values(assignments)) {
      if (bIdx < 0 || bIdx >= buckets.length) return false;
    }

    // Every highlight must be assigned
    if (Object.keys(assignments).length !== highlights.length) return false;

    // Every bucket must have at least one
    for (let i = 0; i < buckets.length; i++) {
      if (!bucketCounts.has(i) || bucketCounts.get(i)! < 1) return false;
    }

    return true;
  }, [buckets, assignments, highlights.length]);

  const previewText = useMemo(() => {
    const assignedCount = Object.keys(assignments).length;
    const bucketCount = buckets.filter(b => b.name.trim()).length;
    if (bucketCount < 2) return null;
    return `Breaking down "${tag.name}" into ${bucketCount} sub-themes from ${assignedCount} passage${assignedCount !== 1 ? 's' : ''}`;
  }, [tag.name, buckets, assignments]);

  const handleSplit = async () => {
    if (!canSplit) return;
    setLoading(true);
    try {
      // Group highlight IDs by bucket
      const newTags = buckets.map((b, idx) => ({
        name: b.name,
        color: b.color,
        highlightIds: Object.entries(assignments)
          .filter(([, bIdx]) => bIdx === idx)
          .map(([hId]) => hId),
      }));

      const res = await researchApi.splitTag({
        sourceTagId: tag.id,
        newTags,
      });
      const { operationId } = res.data.data;
      toast(
        (t) => (
          <span className="flex items-center gap-2 text-sm">
            Theme split into {buckets.length} sub-themes!
            <button
              className="font-semibold text-brand-600 underline hover:text-brand-800 dark:text-brand-400"
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await researchApi.undoTagOperation(operationId);
                  toast.success('Split undone');
                  onSplit();
                } catch {
                  toast.error('Could not undo');
                }
              }}
            >
              Undo
            </button>
          </span>
        ),
        { duration: 8000 },
      );
      onSplit();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to split theme');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Break Down Theme</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Split "<span className="font-medium" style={{ color: tag.color }}>{tag.name}</span>" into sub-themes
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Buckets */}
          <div className="mb-4">
            <label className="label mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sub-themes
            </label>
            <div className="space-y-2">
              {buckets.map((bucket, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={bucket.name}
                    onChange={(e) => updateBucket(idx, { name: e.target.value })}
                    placeholder={`Sub-theme ${idx + 1} name`}
                    className="input flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                    maxLength={100}
                  />
                  {/* Mini colour picker */}
                  <div className="relative">
                    <button
                      type="button"
                      className="h-7 w-7 shrink-0 rounded-full border-2 border-gray-300 transition-all duration-150 dark:border-gray-500"
                      style={{ backgroundColor: bucket.color }}
                      title="Pick colour"
                      onClick={(e) => {
                        const el = e.currentTarget.nextElementSibling as HTMLElement;
                        el.classList.toggle('hidden');
                      }}
                    />
                    <div className="absolute right-0 top-full z-10 mt-1 hidden rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-600 dark:bg-gray-700">
                      <div className="grid grid-cols-4 gap-1">
                        {TAG_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={(e) => {
                              updateBucket(idx, { color: c });
                              (e.currentTarget.closest('.hidden, [class]') as HTMLElement)?.classList.add('hidden');
                            }}
                            className={`h-6 w-6 rounded-full border-2 transition-all ${
                              bucket.color === c
                                ? 'border-gray-900 dark:border-white'
                                : 'border-transparent hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {buckets.length > 2 && (
                    <button
                      onClick={() => removeBucket(idx)}
                      className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                      title="Remove sub-theme"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addBucket}
              className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              + Add another sub-theme
            </button>
          </div>

          {/* Highlights assignment */}
          <div className="mb-4">
            <label className="label mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Assign coded passages ({highlights.length} total)
            </label>
            {highlights.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">No coded passages to assign</p>
            )}
            <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700">
              {highlights.map(h => (
                <div
                  key={h.id}
                  className="flex items-start gap-2 rounded-md px-2 py-1.5 transition-all duration-150 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <p className="flex-1 text-xs italic text-gray-700 dark:text-gray-300">
                    &ldquo;{h.highlightedText.length > 80
                      ? h.highlightedText.slice(0, 80) + '...'
                      : h.highlightedText}&rdquo;
                  </p>
                  <select
                    value={assignments[h.id] ?? ''}
                    onChange={(e) => assignHighlight(h.id, Number(e.target.value))}
                    className="shrink-0 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <option value="" disabled>Assign to...</option>
                    {buckets.map((b, idx) => (
                      <option key={idx} value={idx}>
                        {b.name || `Sub-theme ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {previewText && (
            <div className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              {previewText}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="btn-secondary rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-150 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSplit}
            disabled={!canSplit || loading}
            className="btn-primary rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
          >
            {loading ? 'Splitting...' : 'Break Down Theme'}
          </button>
        </div>
      </div>
    </div>
  );
}
