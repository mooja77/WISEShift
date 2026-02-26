import { useState, useEffect } from 'react';
import { researchApi } from '../../services/api';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';

type MemoType = 'analytical' | 'reflexive' | 'methodological' | 'procedural';

interface Memo {
  id: string;
  title: string;
  content: string;
  type: MemoType;
  linkedResponseId: string | null;
  linkedTagId: string | null;
  linkedLayerId: string | null;
  createdAt: string;
  updatedAt: string;
}

const MEMO_TYPES: { value: MemoType; label: string; description: string }[] = [
  { value: 'analytical', label: 'Analytical', description: 'Emerging patterns, themes, and theoretical connections' },
  { value: 'reflexive', label: 'Reflexive', description: 'Your positionality, biases, and how they may affect analysis' },
  { value: 'methodological', label: 'Methodological', description: 'Decisions about coding strategy, sampling, and approach' },
  { value: 'procedural', label: 'Procedural', description: 'Process notes, to-dos, and practical decisions' },
];

const TYPE_COLORS: Record<MemoType, string> = {
  analytical: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  reflexive: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  methodological: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  procedural: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

export default function MemoJournal() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<MemoType | ''>('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Memo | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'analytical' as MemoType });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchMemos = async () => {
    try {
      const params: any = {};
      if (filterType) params.type = filterType;
      if (search.trim()) params.search = search.trim();
      const res = await researchApi.getMemos(params);
      setMemos(res.data.data);
    } catch {
      toast.error('Failed to load memos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMemos(); }, [filterType, search]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setSaving(true);
    try {
      await researchApi.createMemo(form);
      toast.success('Memo created');
      setCreating(false);
      setForm({ title: '', content: '', type: 'analytical' });
      fetchMemos();
    } catch {
      toast.error('Failed to create memo');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await researchApi.updateMemo(editing.id, {
        title: form.title,
        content: form.content,
        type: form.type,
      });
      toast.success('Memo updated');
      setEditing(null);
      setForm({ title: '', content: '', type: 'analytical' });
      fetchMemos();
    } catch {
      toast.error('Failed to update memo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await researchApi.deleteMemo(id);
      toast.success('Memo deleted');
      fetchMemos();
    } catch {
      toast.error('Failed to delete memo');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleExport = async () => {
    try {
      const res = await researchApi.exportMemos();
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reflexivity-journal-${new Date().toISOString().slice(0, 10)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Journal exported as DOCX');
    } catch {
      toast.error('Failed to export memos');
    }
  };

  const startEdit = (memo: Memo) => {
    setEditing(memo);
    setCreating(false);
    setForm({ title: memo.title, content: memo.content, type: memo.type });
  };

  const startCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm({ title: '', content: '', type: 'analytical' });
  };

  const cancelForm = () => {
    setEditing(null);
    setCreating(false);
    setForm({ title: '', content: '', type: 'analytical' });
  };

  const countsByType = MEMO_TYPES.map(t => ({
    ...t,
    count: memos.filter(m => m.type === t.value).length,
  }));

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Memo"
        message="This will permanently delete this memo. This cannot be undone."
        confirmLabel="Delete Memo"
        variant="danger"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reflexivity Journal</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Document your analytical decisions, positionality, and methodological choices. Essential for qualitative research transparency and ethics compliance.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="btn-secondary text-sm" disabled={memos.length === 0}>
              Export DOCX
            </button>
            <button onClick={startCreate} className="btn-primary text-sm">
              New Memo
            </button>
          </div>
        </div>

        {/* Type summary cards */}
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {countsByType.map(t => (
            <button
              key={t.value}
              onClick={() => setFilterType(filterType === t.value ? '' : t.value)}
              className={`rounded-lg border-2 p-3 text-left transition-colors ${
                filterType === t.value
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[t.value]}`}>
                  {t.label}
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{t.count}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mt-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search memos..."
            className="input w-full"
          />
        </div>
      </div>

      {/* Create/Edit Form */}
      {(creating || editing) && (
        <div className="card border-2 border-brand-300 dark:border-brand-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {editing ? 'Edit Memo' : 'New Memo'}
          </h3>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="memo-title" className="label">Title</label>
              <input
                id="memo-title"
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Decision to merge 'training' and 'upskilling' codes"
                className="input mt-1 w-full"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="memo-type" className="label">Type</label>
              <select
                id="memo-type"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as MemoType }))}
                className="input mt-1"
              >
                {MEMO_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label} — {t.description}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="memo-content" className="label">Content</label>
              <textarea
                id="memo-content"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Write your memo here. Include your reasoning, observations, and any reflections on how your perspective may be shaping the analysis..."
                className="input mt-1 w-full"
                rows={8}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={editing ? handleUpdate : handleCreate}
                disabled={saving || !form.title.trim() || !form.content.trim()}
                className="btn-primary"
              >
                {saving ? 'Saving...' : editing ? 'Update Memo' : 'Create Memo'}
              </button>
              <button onClick={cancelForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Memo List */}
      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading memos...</div>
      ) : memos.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {filterType || search ? 'No memos match your filters.' : 'No memos yet. Start documenting your research process.'}
          </p>
          {!creating && (
            <button onClick={startCreate} className="btn-primary mt-4">
              Write Your First Memo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {memos.map(memo => (
            <div key={memo.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">{memo.title}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[memo.type]}`}>
                      {memo.type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Created {new Date(memo.createdAt).toLocaleDateString()} | Updated {new Date(memo.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(memo)} className="text-sm text-brand-600 hover:text-brand-800 dark:text-brand-400 px-2 py-1">
                    Edit
                  </button>
                  <button onClick={() => setDeleteTarget(memo.id)} className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 px-2 py-1">
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">
                {memo.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
