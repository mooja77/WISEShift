import { useState, useEffect } from 'react';
import { researchApi } from '../../services/api';
import { useResearchStore } from '../../stores/researchStore';
import toast from 'react-hot-toast';

interface OwnLayer {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  highlightCount: number;
  shares: { id: string; name: string; permission: string }[];
  createdAt: string;
}

interface SharedLayer {
  id: string;
  name: string;
  ownerName: string;
  highlightCount: number;
  permission: string;
}

export default function LayerManager() {
  const { activeCodingLayerId, setActiveCodingLayerId } = useResearchStore();
  const [ownLayers, setOwnLayers] = useState<OwnLayer[]>([]);
  const [sharedLayers, setSharedLayers] = useState<SharedLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [sharingLayerId, setSharingLayerId] = useState<string | null>(null);
  const [comparingIds, setComparingIds] = useState<[string, string] | null>(null);
  const [compareResult, setCompareResult] = useState<any>(null);

  useEffect(() => { loadLayers(); }, []);

  const loadLayers = async () => {
    try {
      const res = await researchApi.getLayers();
      setOwnLayers(res.data.data.own);
      setSharedLayers(res.data.data.shared);
    } catch {
      toast.error('Failed to load layers');
    } finally {
      setLoading(false);
    }
  };

  const createLayer = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await researchApi.createLayer(newName.trim(), newDesc.trim() || undefined);
      setNewName('');
      setNewDesc('');
      loadLayers();
      toast.success('Layer created');
    } catch {
      toast.error('Failed to create layer');
    } finally {
      setCreating(false);
    }
  };

  const deleteLayer = async (id: string) => {
    if (!confirm('Delete this coding layer and all its highlights?')) return;
    try {
      await researchApi.deleteLayer(id);
      if (activeCodingLayerId === id) setActiveCodingLayerId(null);
      loadLayers();
      toast.success('Layer deleted');
    } catch {
      toast.error('Failed to delete layer');
    }
  };

  const activateLayer = async (id: string) => {
    try {
      await researchApi.activateLayer(id);
      setActiveCodingLayerId(id);
      loadLayers();
      toast.success('Layer activated');
    } catch {
      toast.error('Failed to activate layer');
    }
  };

  const deactivateAll = async () => {
    setActiveCodingLayerId(null);
    // Just clear local state — the default highlights will be used
    setOwnLayers(prev => prev.map(l => ({ ...l, isActive: false })));
    toast.success('Using default highlights');
  };

  const shareLayer = async (layerId: string) => {
    if (!shareCode.trim()) return;
    try {
      await researchApi.shareLayer(layerId, shareCode.trim());
      setShareCode('');
      setSharingLayerId(null);
      loadLayers();
      toast.success('Layer shared');
    } catch {
      toast.error('Failed to share layer');
    }
  };

  const compareLayers = async (id1: string, id2: string) => {
    try {
      const res = await researchApi.compareLayers(id1, id2);
      setCompareResult(res.data.data);
      setComparingIds([id1, id2]);
    } catch {
      toast.error('Failed to compare layers');
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading layers...</div>;
  }

  const allLayers = [...ownLayers, ...sharedLayers.map(s => ({ ...s, isActive: false, shares: [], description: null, createdAt: '' }))];

  return (
    <div className="space-y-6">
      {/* Create New Layer */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Annotation Layers</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Create separate coding layers for different analysis rounds, theoretical frameworks, or research team members.
          The active layer's highlights will be shown in the Narrative Explorer.
        </p>

        <div className="mt-4 flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Layer name (e.g. Round 1, Thematic, Team B)"
              className="input"
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="input"
            />
          </div>
          <button onClick={createLayer} disabled={creating || !newName.trim()} className="btn-primary">
            {creating ? 'Creating...' : 'Create Layer'}
          </button>
        </div>
      </div>

      {/* Active Layer Indicator */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Layer:</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {ownLayers.find(l => l.isActive)?.name || 'Default (no layer)'}
            </p>
          </div>
          {activeCodingLayerId && (
            <button onClick={deactivateAll} className="btn-secondary text-sm">
              Use Default
            </button>
          )}
        </div>
      </div>

      {/* Own Layers */}
      {ownLayers.length > 0 && (
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Your Layers</h3>
          <div className="space-y-3">
            {ownLayers.map(layer => (
              <div
                key={layer.id}
                className={`rounded-lg border p-4 ${
                  layer.isActive
                    ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{layer.name}</span>
                      {layer.isActive && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800 dark:bg-brand-900 dark:text-brand-200">
                          Active
                        </span>
                      )}
                    </div>
                    {layer.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{layer.description}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {layer.highlightCount} highlights
                      {layer.shares.length > 0 && ` · Shared with ${layer.shares.length}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!layer.isActive && (
                      <button onClick={() => activateLayer(layer.id)} className="text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400">
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => setSharingLayerId(sharingLayerId === layer.id ? null : layer.id)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    >
                      Share
                    </button>
                    <button onClick={() => deleteLayer(layer.id)} className="text-xs text-red-500 hover:text-red-700">
                      Delete
                    </button>
                  </div>
                </div>

                {/* Share Form */}
                {sharingLayerId === layer.id && (
                  <div className="mt-3 flex gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                    <input
                      type="text"
                      value={shareCode}
                      onChange={e => setShareCode(e.target.value.toUpperCase())}
                      placeholder="DASH-XXXXXXXX"
                      className="input flex-1 font-mono text-sm"
                    />
                    <button onClick={() => shareLayer(layer.id)} className="btn-secondary text-sm">
                      Share
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared With Me */}
      {sharedLayers.length > 0 && (
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Shared With You</h3>
          <div className="space-y-3">
            {sharedLayers.map(layer => (
              <div key={layer.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{layer.name}</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      From: {layer.ownerName} · {layer.highlightCount} highlights · {layer.permission} access
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compare Layers */}
      {ownLayers.length >= 2 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Compare Layers</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Calculate inter-rater reliability between two coding layers.
          </p>
          <div className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="label">Layer 1</label>
              <select
                value={comparingIds?.[0] || ''}
                onChange={e => setComparingIds([e.target.value, comparingIds?.[1] || ''])}
                className="input mt-1"
              >
                <option value="">Select...</option>
                {ownLayers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Layer 2</label>
              <select
                value={comparingIds?.[1] || ''}
                onChange={e => setComparingIds([comparingIds?.[0] || '', e.target.value])}
                className="input mt-1"
              >
                <option value="">Select...</option>
                {ownLayers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <button
              onClick={() => comparingIds && compareLayers(comparingIds[0], comparingIds[1])}
              disabled={!comparingIds?.[0] || !comparingIds?.[1] || comparingIds[0] === comparingIds[1]}
              className="btn-primary"
            >
              Compare
            </button>
          </div>

          {compareResult && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cohen's Kappa</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{compareResult.overallKappa.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{compareResult.overallInterpretation}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Agreement</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{compareResult.percentageAgreement}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Shared Responses</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{compareResult.totalSharedResponses}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
