import { useState, useMemo } from 'react';
import type { ResearchTag } from '@wiseshift/shared';
import { TAG_COLORS } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import toast from 'react-hot-toast';

interface Props {
  tags: ResearchTag[];
  onClose: () => void;
  onMerged: () => void;
}

export default function MergeTagsModal({ tags, onClose, onMerged }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetName, setTargetName] = useState('');
  const [targetColor, setTargetColor] = useState(TAG_COLORS[0]);
  const [targetDescription, setTargetDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Update defaults when selection changes
  const selectedTags = useMemo(
    () => tags.filter(t => selectedIds.has(t.id)),
    [tags, selectedIds],
  );

  const toggleTag = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      // Auto-set name and colour from first selected tag
      const nextSelected = tags.filter(t => next.has(t.id));
      if (nextSelected.length > 0 && !targetName) {
        setTargetName(nextSelected[0].name);
        setTargetColor(nextSelected[0].color);
      }
      if (nextSelected.length === 0) {
        setTargetName('');
        setTargetColor(TAG_COLORS[0]);
      }

      return next;
    });
  };

  // Passage count placeholder (we show tag count since highlights aren't passed in)
  const previewText = useMemo(() => {
    if (selectedTags.length < 2) return null;
    const names = selectedTags.map(t => t.name);
    const joined = names.length <= 3
      ? names.join(' + ')
      : `${names.slice(0, 2).join(' + ')} + ${names.length - 2} more`;
    return `Combining ${joined} into one theme`;
  }, [selectedTags]);

  const handleMerge = async () => {
    if (selectedTags.length < 2) return;
    setLoading(true);
    try {
      const res = await researchApi.mergeTags({
        sourceTagIds: Array.from(selectedIds),
        targetName: targetName || selectedTags[0].name,
        targetColor,
        targetDescription: targetDescription || undefined,
      });
      const { reassignedCount, operationId } = res.data.data;
      toast(
        (t) => (
          <span className="flex items-center gap-2 text-sm">
            Themes combined! {reassignedCount} passage{reassignedCount !== 1 ? 's' : ''} updated.
            <button
              className="font-semibold text-brand-600 underline hover:text-brand-800 dark:text-brand-400"
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await researchApi.undoTagOperation(operationId);
                  toast.success('Merge undone');
                  onMerged();
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
      onMerged();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to combine themes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Combine Themes</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Select two or more themes to combine into one. All coded passages will be reassigned to the merged theme.
        </p>

        {/* Tag checkboxes */}
        <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700">
          {tags.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">No themes available</p>
          )}
          {tags.map(tag => (
            <label
              key={tag.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-150 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(tag.id)}
                onChange={() => toggleTag(tag.id)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span className="truncate text-sm text-gray-900 dark:text-gray-100">{tag.name}</span>
            </label>
          ))}
        </div>

        {/* Live preview */}
        {previewText && (
          <div className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {previewText}
          </div>
        )}

        {/* Name */}
        <div className="mb-3">
          <label className="label mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Combined theme name
          </label>
          <input
            type="text"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="e.g. Organisational Challenges"
            className="input w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            maxLength={100}
          />
        </div>

        {/* Colour picker */}
        <div className="mb-3">
          <label className="label mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Colour
          </label>
          <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setTargetColor(c)}
                className={`h-7 w-7 rounded-full border-2 transition-all duration-150 ${
                  targetColor === c
                    ? 'border-gray-900 ring-2 ring-brand-400 dark:border-white'
                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-500'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select colour ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="label mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description (optional)
          </label>
          <textarea
            value={targetDescription}
            onChange={(e) => setTargetDescription(e.target.value)}
            className="input w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            rows={2}
            maxLength={500}
            placeholder="Brief description of the combined theme"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="btn-secondary rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-150 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={selectedTags.length < 2 || !targetName.trim() || loading}
            className="btn-primary rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
          >
            {loading ? 'Combining...' : 'Combine Themes'}
          </button>
        </div>
      </div>
    </div>
  );
}
