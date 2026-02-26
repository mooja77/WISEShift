import { useState, useEffect, useCallback } from 'react';
import type { MatrixData, MatrixCellDrilldown } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

/** Intensity background colour based on highlight count */
function cellBg(count: number, color: string): string {
  if (count === 0) return 'transparent';
  // Convert hex to RGB and apply varying opacity
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  if (count <= 2) return `rgba(${r},${g},${b},0.2)`;
  if (count <= 5) return `rgba(${r},${g},${b},0.45)`;
  return `rgba(${r},${g},${b},0.7)`;
}

/** Text colour: white on strong backgrounds, dark otherwise */
function cellText(count: number): string {
  if (count >= 6) return '#fff';
  return '';
}

export default function CrossCaseMatrix() {
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{ assessmentId: string; tagId: string; tagName: string; caseLabel: string } | null>(null);
  const [drilldownData, setDrilldownData] = useState<MatrixCellDrilldown | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [cellSummary, setCellSummary] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await researchApi.getMatrix();
      setMatrixData(res.data.data);
    } catch {
      toast.error('Failed to load cross-case matrix');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  // Fetch drilldown when a cell is selected
  useEffect(() => {
    if (!selectedCell) {
      setDrilldownData(null);
      setCellSummary('');
      return;
    }
    setDrilldownLoading(true);
    researchApi.getMatrixCell(selectedCell.assessmentId, selectedCell.tagId)
      .then(res => {
        setDrilldownData(res.data.data);
        setCellSummary(res.data.data.summary || '');
      })
      .catch(() => toast.error('Failed to load cell details'))
      .finally(() => setDrilldownLoading(false));
  }, [selectedCell]);

  const handleSaveSummary = async () => {
    if (!selectedCell) return;
    setSaving(true);
    try {
      await researchApi.upsertMatrixCellSummary(selectedCell.assessmentId, selectedCell.tagId, cellSummary);
      toast.success('Cell summary saved');
      // Update the summary in the local matrix data so the table reflects it
      setMatrixData(prev => {
        if (!prev) return prev;
        const updatedCells = prev.cells.map(c =>
          c.assessmentId === selectedCell.assessmentId && c.tagId === selectedCell.tagId
            ? { ...c, summary: cellSummary }
            : c
        );
        return { ...prev, cells: updatedCells };
      });
    } catch {
      toast.error('Failed to save summary');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!matrixData || matrixData.rows.length === 0 || matrixData.columns.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 py-12 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 15.75c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125" />
        </svg>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No data for the matrix yet. Go to the Narrative Explorer, create some tags, and highlight text in completed assessments to populate the cross-case matrix.
        </p>
      </div>
    );
  }

  const { rows, columns, cells } = matrixData;

  // Lookup helper
  const getCell = (assessmentId: string, tagId: string) =>
    cells.find(c => c.assessmentId === assessmentId && c.tagId === tagId);

  // Find the dominant tag colour for a cell (for background)
  const getColumnColor = (tagId: string) =>
    columns.find(c => c.tagId === tagId)?.color || '#6b7280';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cross-Case Matrix</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Rows = anonymised cases, columns = your tags. Cell intensity shows how many passages were coded. Click a cell to drill down.
        </p>
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                Case
              </th>
              {columns.map(col => (
                <th key={col.tagId} className="px-3 py-3 text-center text-xs font-medium whitespace-nowrap">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: col.color + '20',
                      color: col.color,
                    }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                    {col.tagName}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {rows.map(row => (
              <tr key={row.assessmentId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.label}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {row.country && (
                      <span className="inline-flex items-center rounded bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                        {row.country}
                      </span>
                    )}
                    {row.sector && (
                      <span className="inline-flex items-center rounded bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                        {row.sector}
                      </span>
                    )}
                    {row.overallScore != null && (
                      <span className="inline-flex items-center rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300">
                        {row.overallScore.toFixed(1)}
                      </span>
                    )}
                  </div>
                </td>
                {columns.map(col => {
                  const cell = getCell(row.assessmentId, col.tagId);
                  const count = cell?.highlightCount || 0;
                  const color = getColumnColor(col.tagId);

                  return (
                    <td key={col.tagId} className="px-3 py-3 text-center">
                      <button
                        onClick={() => count > 0 && setSelectedCell({
                          assessmentId: row.assessmentId,
                          tagId: col.tagId,
                          tagName: col.tagName,
                          caseLabel: row.label,
                        })}
                        disabled={count === 0}
                        className={`inline-flex h-9 w-12 items-center justify-center rounded-md text-xs font-semibold transition-all ${
                          count > 0
                            ? 'cursor-pointer hover:ring-2 hover:ring-brand-300 hover:shadow-sm'
                            : 'cursor-default'
                        }`}
                        style={{
                          backgroundColor: count > 0 ? cellBg(count, color) : undefined,
                          color: cellText(count) || undefined,
                        }}
                        title={`${row.label} x ${col.tagName}: ${count} highlight${count !== 1 ? 's' : ''}${cell?.summary ? ' (has summary)' : ''}`}
                      >
                        {count > 0 ? (
                          <span className="flex items-center gap-0.5">
                            {count}
                            {cell?.summary && (
                              <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                              </svg>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">&mdash;</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium">Intensity:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-4 w-6 rounded border border-gray-200 dark:border-gray-600" style={{ backgroundColor: 'transparent' }} />
          0
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-4 w-6 rounded" style={{ backgroundColor: 'rgba(99,102,241,0.2)' }} />
          1-2
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-4 w-6 rounded" style={{ backgroundColor: 'rgba(99,102,241,0.45)' }} />
          3-5
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-4 w-6 rounded" style={{ backgroundColor: 'rgba(99,102,241,0.7)' }} />
          6+
        </span>
      </div>

      {/* Drilldown panel */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedCell(null)}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Drilldown header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cell Drilldown</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">{selectedCell.caseLabel}</span>
                  {' '}&times;{' '}
                  <span className="font-medium">{selectedCell.tagName}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drilldown content */}
            <div className="max-h-[65vh] overflow-y-auto px-6 py-4 space-y-5">
              {drilldownLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  {/* Highlights list */}
                  {drilldownData && drilldownData.highlights.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Coded Passages ({drilldownData.highlights.length})
                      </h4>
                      {drilldownData.highlights.map(h => (
                        <div key={h.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                          <p className="mb-1 text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            {h.domainKey} &middot; {h.questionId}
                          </p>
                          <blockquote className="border-l-3 border-brand-300 dark:border-brand-600 pl-3 text-sm text-gray-700 dark:text-gray-300 italic">
                            &ldquo;{h.highlightedText.replace(/^["\u201C\u201D]+/, '').replace(/["\u201C\u201D]+$/, '').trim()}&rdquo;
                          </blockquote>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No highlighted passages found for this cell.</p>
                  )}

                  {/* Cell summary */}
                  <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <label htmlFor="cellSummary" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cell Summary / Memo
                    </label>
                    <textarea
                      id="cellSummary"
                      className="input w-full resize-y"
                      rows={4}
                      placeholder="Write your analytical summary for this case-theme intersection..."
                      value={cellSummary}
                      onChange={e => setCellSummary(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveSummary}
                        disabled={saving}
                        className="btn-primary text-sm"
                      >
                        {saving ? 'Saving...' : 'Save Summary'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
