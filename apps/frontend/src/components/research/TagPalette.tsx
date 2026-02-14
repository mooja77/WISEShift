import { useState } from 'react';
import type { ResearchTag } from '@wiseshift/shared';
import { TAG_COLORS } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import TagChip from './TagChip';
import toast from 'react-hot-toast';

interface Props {
  tags: ResearchTag[];
  onTagsChange: () => void;
}

export default function TagPalette({ tags, onTagsChange }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSeedDefaults = async () => {
    try {
      await researchApi.seedDefaultTags();
      toast.success('Default tags loaded');
      onTagsChange();
    } catch {
      toast.error('Failed to load defaults');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await researchApi.createTag({ name: newName.trim(), color: newColor, description: newDesc.trim() || undefined });
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      onTagsChange();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to create tag';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await researchApi.deleteTag(id);
      onTagsChange();
    } catch {
      toast.error('Failed to delete tag');
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
      {/* Tag list */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <TagChip key={tag.id} name={tag.name} color={tag.color} onDelete={() => handleDelete(tag.id)} />
        ))}
        {tags.length === 0 && (
          <p className="text-xs text-gray-400">No tags yet</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => setShowCreate(!showCreate)} className="text-xs text-brand-600 hover:text-brand-800">
          + New Tag
        </button>
        {tags.length === 0 && (
          <button onClick={handleSeedDefaults} className="text-xs text-gray-500 hover:text-gray-700">
            Load Defaults
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="space-y-2 rounded border border-gray-100 bg-gray-50 p-2">
          <input
            type="text"
            placeholder="Tag name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="input w-full text-xs"
            maxLength={100}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            className="input w-full text-xs"
            maxLength={500}
          />
          <div>
            <p className="mb-1 text-xs text-gray-500">Colour</p>
            <div className="flex flex-wrap gap-1">
              {TAG_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    newColor === c ? 'scale-110 border-gray-800' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select colour ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={creating || !newName.trim()} className="btn-primary text-xs py-1 px-3">
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-xs text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
