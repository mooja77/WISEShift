import { useState, useEffect } from 'react';
import type { HeatmapDrilldownResult } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface Props {
  tagId: string;
  tagName: string;
  domainKey: string;
  domainName: string;
  onClose: () => void;
}

export default function HeatmapDrilldown({ tagId, tagName, domainKey, domainName, onClose }: Props) {
  const [results, setResults] = useState<HeatmapDrilldownResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    researchApi.getHeatmapDrilldown(tagId, domainKey)
      .then(res => setResults(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tagId, domainKey]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tagged Passages</h3>
            <p className="text-sm text-gray-500">
              <span className="font-medium">{tagName}</span> in <span className="font-medium">{domainName}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-500">No passages found.</p>
          ) : (
            results.map(r => (
              <div key={r.highlightId} className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">{r.questionText}</p>
                <blockquote className="border-l-3 border-brand-300 pl-3 text-sm text-gray-700 italic">
                  &ldquo;{r.highlightedText.replace(/^["\u201C\u201D]+/, '').replace(/["\u201C\u201D]+$/, '').trim()}&rdquo;
                </blockquote>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span>{r.anonymisedContext}</span>
                  {r.domainScore !== null && <span>Score: {r.domainScore.toFixed(1)}/5</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
