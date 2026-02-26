import { useState, useEffect } from 'react';
import { researchApi } from '../../services/api';
import toast from 'react-hot-toast';

interface TagSnapshot {
  tagName: string;
  color: string;
  description: string;
  highlightCount: number;
  exampleQuotes: string[];
}

interface Snapshot {
  id: string;
  version: number;
  label: string;
  snapshot: TagSnapshot[];
  createdAt: string;
}

interface DiffResult {
  from: { version: number; label: string; createdAt: string; tagCount: number };
  to: { version: number; label: string; createdAt: string; tagCount: number };
  changes: {
    added: { tagName: string; color: string }[];
    removed: { tagName: string; color: string }[];
    modified: { tagName: string; colorChanged: boolean; descriptionChanged: boolean; highlightCountDelta: number }[];
  };
  summary: string;
}

export default function CodebookHistory() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [compareV1, setCompareV1] = useState<number | ''>('');
  const [compareV2, setCompareV2] = useState<number | ''>('');
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [comparing, setComparing] = useState(false);

  const fetchSnapshots = async () => {
    try {
      const res = await researchApi.getCodebookSnapshots();
      setSnapshots(res.data.data);
    } catch {
      toast.error('Failed to load codebook snapshots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSnapshots(); }, []);

  const handleCreate = async () => {
    if (!label.trim()) {
      toast.error('Snapshot label is required');
      return;
    }
    setCreating(true);
    try {
      await researchApi.createCodebookSnapshot(label.trim());
      toast.success('Codebook snapshot created');
      setLabel('');
      fetchSnapshots();
    } catch {
      toast.error('Failed to create snapshot');
    } finally {
      setCreating(false);
    }
  };

  const handleCompare = async () => {
    if (!compareV1 || !compareV2 || compareV1 === compareV2) {
      toast.error('Select two different versions to compare');
      return;
    }
    setComparing(true);
    try {
      const res = await researchApi.compareCodebookSnapshots(compareV1 as number, compareV2 as number);
      setDiff(res.data.data);
    } catch {
      toast.error('Failed to compare snapshots');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Snapshot */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Codebook Versioning</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Snapshot your codebook at key stages of analysis. Track how your codes evolve for methodological transparency.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="snapshot-label" className="label">Snapshot Label</label>
            <input
              id="snapshot-label"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g., Initial coding complete, After axial coding pass"
              className="input mt-1 w-full"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !label.trim()}
            className="btn-primary"
          >
            {creating ? 'Saving...' : 'Take Snapshot'}
          </button>
        </div>
      </div>

      {/* Compare Versions */}
      {snapshots.length >= 2 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Compare Versions</h3>
          <div className="mt-4 flex items-end gap-3">
            <div>
              <label htmlFor="compare-from" className="label">From Version</label>
              <select
                id="compare-from"
                value={compareV1}
                onChange={e => setCompareV1(e.target.value ? parseInt(e.target.value) : '')}
                className="input mt-1"
              >
                <option value="">Select...</option>
                {snapshots.map(s => (
                  <option key={s.id} value={s.version}>v{s.version} — {s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="compare-to" className="label">To Version</label>
              <select
                id="compare-to"
                value={compareV2}
                onChange={e => setCompareV2(e.target.value ? parseInt(e.target.value) : '')}
                className="input mt-1"
              >
                <option value="">Select...</option>
                {snapshots.map(s => (
                  <option key={s.id} value={s.version}>v{s.version} — {s.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCompare}
              disabled={comparing || !compareV1 || !compareV2 || compareV1 === compareV2}
              className="btn-primary"
            >
              {comparing ? 'Comparing...' : 'Compare'}
            </button>
          </div>

          {/* Diff Results */}
          {diff && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  v{diff.from.version} ({diff.from.label}) → v{diff.to.version} ({diff.to.label})
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{diff.summary}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Tags: {diff.from.tagCount} → {diff.to.tagCount}
                </p>
              </div>

              {diff.changes.added.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Added ({diff.changes.added.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {diff.changes.added.map(t => (
                      <span key={t.tagName} className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm dark:bg-green-950">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                        <span className="text-green-800 dark:text-green-200">{t.tagName}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {diff.changes.removed.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Removed ({diff.changes.removed.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {diff.changes.removed.map(t => (
                      <span key={t.tagName} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-sm line-through dark:bg-red-950">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                        <span className="text-red-800 dark:text-red-200">{t.tagName}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {diff.changes.modified.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">Modified ({diff.changes.modified.length})</p>
                  <div className="space-y-1">
                    {diff.changes.modified.map(t => (
                      <div key={t.tagName} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{t.tagName}</span>
                        {t.colorChanged && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-200">color changed</span>}
                        {t.descriptionChanged && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-200">description changed</span>}
                        {t.highlightCountDelta !== 0 && (
                          <span className={`rounded px-1.5 py-0.5 text-xs ${t.highlightCountDelta > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'}`}>
                            {t.highlightCountDelta > 0 ? '+' : ''}{t.highlightCountDelta} highlights
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Snapshot List */}
      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading snapshots...</div>
      ) : snapshots.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No codebook snapshots yet. Create tags, then take a snapshot to track your codebook evolution.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map(snap => (
            <div key={snap.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-brand-100 px-2 py-0.5 text-sm font-mono font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                      v{snap.version}
                    </span>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">{snap.label}</h4>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(snap.createdAt).toLocaleDateString()} | {snap.snapshot.length} tags
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSnapshot(selectedSnapshot?.id === snap.id ? null : snap)}
                  className="btn-secondary text-sm"
                >
                  {selectedSnapshot?.id === snap.id ? 'Hide' : 'View'}
                </button>
              </div>

              {selectedSnapshot?.id === snap.id && (
                <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Tag</th>
                          <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Highlights</th>
                          <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snap.snapshot.map((tag, i) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2 pr-4">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                                <span className="font-medium text-gray-900 dark:text-gray-100">{tag.tagName}</span>
                              </span>
                            </td>
                            <td className="py-2 pr-4 font-mono text-gray-600 dark:text-gray-400">{tag.highlightCount}</td>
                            <td className="py-2 text-gray-600 dark:text-gray-400 max-w-xs truncate">{tag.description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
