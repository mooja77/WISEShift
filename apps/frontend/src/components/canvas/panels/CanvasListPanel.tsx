import { useState, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import { researchApi } from '../../../services/api';
import ConfirmDialog from '../ConfirmDialog';
import toast from 'react-hot-toast';

type SortMode = 'newest' | 'az' | 'codings';

export default function CanvasListPanel() {
  const { canvases, loading, fetchCanvases, createCanvas, deleteCanvas, openCanvas } = useCanvasStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [cloning, setCloning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  useEffect(() => { fetchCanvases(); }, [fetchCanvases]);

  const filteredCanvases = useMemo(() => {
    let result = canvases;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortMode) {
        case 'az':
          return a.name.localeCompare(b.name);
        case 'codings':
          return (b._count?.codings ?? 0) - (a._count?.codings ?? 0);
        case 'newest':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return result;
  }, [canvases, search, sortMode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const canvas = await createCanvas(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      setShowForm(false);
      openCanvas(canvas.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create canvas');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCanvas(id);
      toast.success('Canvas deleted');
    } catch {
      toast.error('Failed to delete canvas');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleClone = async () => {
    if (!shareCode.trim()) return;
    setCloning(true);
    try {
      const res = await researchApi.cloneCanvas(shareCode.trim());
      const clonedCanvas = res.data.data;
      setShareCode('');
      await fetchCanvases();
      openCanvas(clonedCanvas.id);
      toast.success('Canvas cloned successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to clone canvas');
    } finally {
      setCloning(false);
    }
  };

  return (
    <div data-tour="canvas-list" className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Coding Canvases</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Visual workspaces for qualitative interview coding
          </p>
        </div>
        <button
          data-tour="canvas-new-btn"
          onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm"
        >
          {showForm ? 'Cancel' : 'New Canvas'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6">
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="canvas-name">Canvas Name</label>
              <input
                id="canvas-name"
                type="text"
                className="input mt-1"
                placeholder="e.g. Interview Batch 1 Coding"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="canvas-desc">Description (optional)</label>
              <input
                id="canvas-desc"
                type="text"
                className="input mt-1"
                placeholder="Brief description of this coding workspace"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <button type="submit" disabled={creating || !name.trim()} className="btn-primary text-sm">
              {creating ? 'Creating...' : 'Create Canvas'}
            </button>
          </div>
        </form>
      )}

      {/* Clone from share code */}
      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          className="input flex-1 text-sm"
          placeholder="Enter share code to clone a canvas (e.g. SHARE-XXXXXXXX)"
          value={shareCode}
          onChange={e => setShareCode(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleClone(); }}
        />
        <button
          onClick={handleClone}
          disabled={cloning || !shareCode.trim()}
          className="btn-secondary text-sm whitespace-nowrap"
        >
          {cloning ? 'Cloning...' : 'Clone'}
        </button>
      </div>

      {/* Search and Sort controls */}
      {canvases.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              className="input w-full pl-8 text-sm"
              placeholder="Search canvases..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input text-sm w-40"
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
          >
            <option value="newest">Newest first</option>
            <option value="az">A-Z</option>
            <option value="codings">Most codings</option>
          </select>
        </div>
      )}

      {loading && canvases.length === 0 && (
        <div className="py-12 text-center text-gray-400">Loading canvases...</div>
      )}

      {!loading && canvases.length === 0 && !showForm && (
        <div className="card py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          <p className="mt-3 text-gray-500 dark:text-gray-400">No coding canvases yet</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Create a canvas to start coding interview transcripts
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm">
            Create Your First Canvas
          </button>
        </div>
      )}

      {/* No search results state */}
      {canvases.length > 0 && filteredCanvases.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          No canvases match "{search}"
        </div>
      )}

      <div data-tour="canvas-cards" className="space-y-3">
        {filteredCanvases.map(canvas => (
          <div
            key={canvas.id}
            className="card flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openCanvas(canvas.id)}
          >
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{canvas.name}</h3>
              {canvas.description && (
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 truncate">{canvas.description}</p>
              )}
              <div className="mt-1 flex gap-3 text-xs text-gray-400 dark:text-gray-500">
                {canvas._count && (
                  <>
                    <span>{canvas._count.transcripts} transcript{canvas._count.transcripts !== 1 ? 's' : ''}</span>
                    <span>{canvas._count.questions} question{canvas._count.questions !== 1 ? 's' : ''}</span>
                    <span>{canvas._count.codings} coding{canvas._count.codings !== 1 ? 's' : ''}</span>
                  </>
                )}
                <span>Updated {new Date(canvas.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete({ id: canvas.id, name: canvas.name }); }}
              className="ml-4 shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="Delete canvas"
              aria-label={`Delete canvas ${canvas.name}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Canvas"
          message={`Delete canvas "${confirmDelete.name}" and all its data? This cannot be undone.`}
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
