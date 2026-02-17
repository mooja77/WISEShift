import { useState, useEffect, useCallback } from 'react';
import type { HeatmapData } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import HeatmapDrilldown from './HeatmapDrilldown';
import CodebookExport from './CodebookExport';
import { LoadingSpinner } from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ThemeHeatmap() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [drilldown, setDrilldown] = useState<{ tagId: string; tagName: string; domainKey: string; domainName: string } | null>(null);

  const fetchHeatmap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await researchApi.getHeatmap();
      setData(res.data.data);
    } catch {
      toast.error('Failed to load heatmap');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHeatmap(); }, [fetchHeatmap]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data || data.tags.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
        <p className="text-sm text-gray-500">
          No tags yet. Go to the Narrative Explorer, create some tags, and highlight text to see the heatmap.
        </p>
      </div>
    );
  }

  const { cells, tags, domains, maxCount } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Theme Heatmap</h2>
          <p className="text-sm text-gray-500">Rows = your tags, columns = 9 domains. Cell intensity shows tag frequency.</p>
        </div>
        <CodebookExport />
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header row */}
          <div className="grid gap-1" style={{ gridTemplateColumns: `180px repeat(${domains.length}, 1fr)` }}>
            <div /> {/* empty corner */}
            {domains.map(d => (
              <div key={d.key} className="px-1 py-2 text-center text-xs font-medium text-gray-600 truncate" title={d.name}>
                {d.name.split(' ')[0]}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {tags.map(tag => (
            <div
              key={tag.id}
              className="grid gap-1"
              style={{ gridTemplateColumns: `180px repeat(${domains.length}, 1fr)` }}
            >
              <div className="flex items-center gap-2 py-1 pr-2">
                <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="truncate text-xs font-medium text-gray-700" title={tag.name}>{tag.name}</span>
              </div>
              {domains.map(domain => {
                const cell = cells.find(c => c.tagId === tag.id && c.domainKey === domain.key);
                const count = cell?.count || 0;
                const opacity = maxCount > 0 ? Math.max(0.05, count / maxCount) : 0;

                return (
                  <button
                    key={domain.key}
                    onClick={() => count > 0 && setDrilldown({ tagId: tag.id, tagName: tag.name, domainKey: domain.key, domainName: domain.name })}
                    disabled={count === 0}
                    className={`flex h-10 items-center justify-center rounded text-xs font-medium transition-all ${
                      count > 0 ? 'cursor-pointer hover:ring-2 hover:ring-brand-300' : 'cursor-default'
                    }`}
                    style={{
                      backgroundColor: count > 0 ? tag.color : '#f3f4f6',
                      opacity: count > 0 ? opacity : 1,
                      color: count > 0 && opacity > 0.5 ? '#fff' : '#6b7280',
                    }}
                    title={`${tag.name} × ${domain.name}: ${count} highlight${count !== 1 ? 's' : ''}`}
                  >
                    {count > 0 ? count : ''}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Drilldown dialog */}
      {drilldown && (
        <HeatmapDrilldown
          tagId={drilldown.tagId}
          tagName={drilldown.tagName}
          domainKey={drilldown.domainKey}
          domainName={drilldown.domainName}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}
